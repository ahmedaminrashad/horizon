import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { TenantRepositoryService } from '../../database/tenant-repository.service';
import { Branch } from './entities/branch.entity';
import { CreateClinicBranchDto } from './dto/create-branch.dto';
import { UpdateClinicBranchDto } from './dto/update-branch.dto';
import { BranchesService as MainBranchesService } from '../../branches/branches.service';
import {
  Reservation,
  ReservationStatus,
} from '../reservations/entities/reservation.entity';

@Injectable()
export class BranchesService {
  constructor(
    private tenantRepositoryService: TenantRepositoryService,
    private mainBranchesService: MainBranchesService,
  ) {}

  private async getRepository() {
    const repository =
      await this.tenantRepositoryService.getRepository<Branch>(Branch);

    if (!repository) {
      throw new BadRequestException(
        'Clinic context not found. Please ensure you are accessing this endpoint as a clinic user.',
      );
    }

    return repository;
  }

  async create(
    clinicId: number,
    createBranchDto: CreateClinicBranchDto,
  ): Promise<Branch> {
    const repository = await this.getRepository();
    const branch = repository.create({
      ...createBranchDto,
      clinic_id: clinicId,
    });
    const savedBranch = await repository.save(branch);

    // Sync to main branches table
    await this.syncToMainBranches(clinicId, savedBranch);

    return savedBranch;
  }

  async findAll(clinicId: number, page: number = 1, limit: number = 10) {
    const repository = await this.getRepository();
    const skip = (page - 1) * limit;

    const [data, total] = await repository.findAndCount({
      skip,
      take: limit,
      order: {
        createdAt: 'DESC',
      },
    });

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async findOne(clinicId: number, id: number): Promise<Branch> {
    const repository = await this.getRepository();
    const branch = await repository.findOne({
      where: { id },
    });

    if (!branch) {
      throw new NotFoundException(`Branch with ID ${id} not found`);
    }

    return branch;
  }

  /**
   * Get branch by id with dashboard stats filtered by this branch.
   * Stats: total_appointments_last_7_days, total_revenue_last_7_days,
   * doctor_workload_today, cancellations_last_7_days (reservations where doctor_working_hour.branch_id = branchId).
   */
  async getOneWithDashboard(
    clinicId: number,
    branchId: number,
  ): Promise<
    Branch & {
      dashboard: {
        total_appointments_last_7_days: number;
        total_revenue_last_7_days: number;
        doctor_workload_today: number;
        cancellations_last_7_days: number;
      };
    }
  > {
    const branch = await this.findOne(clinicId, branchId);

    const reservationRepo =
      await this.tenantRepositoryService.getRepository<Reservation>(
        Reservation,
      );

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const baseQb = () =>
      reservationRepo
        .createQueryBuilder('r')
        .innerJoin('r.doctor_working_hour', 'dwh')
        .andWhere('dwh.branch_id = :branchId', { branchId });

    const [
      totalAppointmentsLast7Days,
      totalRevenueResult,
      doctorWorkloadToday,
      cancellationsLast7Days,
    ] = await Promise.all([
      baseQb()
        .where('r.date >= :from', { from: sevenDaysAgo })
        .andWhere('r.date < :to', { to: tomorrow })
        .andWhere('r.status != :cancelled', {
          cancelled: ReservationStatus.CANCELLED,
        })
        .getCount(),
      baseQb()
        .select('COALESCE(SUM(r.fees), 0)', 'total')
        .where('r.date >= :from', { from: sevenDaysAgo })
        .andWhere('r.date < :to', { to: tomorrow })
        .andWhere('r.status != :cancelled', {
          cancelled: ReservationStatus.CANCELLED,
        })
        .getRawOne<{ total: string }>(),
      baseQb()
        .where('r.date >= :today', { today })
        .andWhere('r.date < :tomorrow', { tomorrow })
        .andWhere('r.status != :cancelled', {
          cancelled: ReservationStatus.CANCELLED,
        })
        .getCount(),
      baseQb()
        .where('r.date >= :from', { from: sevenDaysAgo })
        .andWhere('r.date < :to', { to: tomorrow })
        .andWhere('r.status = :cancelled', {
          cancelled: ReservationStatus.CANCELLED,
        })
        .getCount(),
    ]);

    const totalRevenue = totalRevenueResult?.total
      ? parseFloat(totalRevenueResult.total)
      : 0;

    return {
      ...branch,
      dashboard: {
        total_appointments_last_7_days: totalAppointmentsLast7Days,
        total_revenue_last_7_days: totalRevenue,
        doctor_workload_today: doctorWorkloadToday,
        cancellations_last_7_days: cancellationsLast7Days,
      },
    };
  }

  async update(
    clinicId: number,
    id: number,
    updateBranchDto: UpdateClinicBranchDto,
  ): Promise<Branch> {
    const repository = await this.getRepository();
    const branch = await this.findOne(clinicId, id);

    Object.assign(branch, updateBranchDto);
    const savedBranch = await repository.save(branch);

    // Sync to main branches table
    await this.syncToMainBranches(clinicId, savedBranch);

    return savedBranch;
  }

  async remove(clinicId: number, id: number): Promise<void> {
    const repository = await this.getRepository();
    const branch = await this.findOne(clinicId, id);
    await repository.remove(branch);
  }

  /**
   * Sync clinic branch to main branches table
   */
  private async syncToMainBranches(
    clinicId: number,
    clinicBranch: Branch,
  ): Promise<void> {
    try {
      // Use clinic branch id as clinic_branch_id for syncing
      await this.mainBranchesService.syncBranch(clinicId, clinicBranch.id, {
        name: clinicBranch.name,
        lat: clinicBranch.lat,
        longit: clinicBranch.longit,
        country_id: clinicBranch.country_id,
        city_id: clinicBranch.city_id,
        address: clinicBranch.address,
      });
    } catch (error) {
      // Log error but don't fail the operation
      console.error(
        `Failed to sync branch ${clinicBranch.id} to main branches table:`,
        error,
      );
    }
  }
}

import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { ClinicsService } from '../../clinics/clinics.service';
import { TenantRepositoryService } from '../../database/tenant-repository.service';
import { TenantDataSourceService } from '../../database/tenant-data-source.service';
import { DoctorsService as MainDoctorsService } from '../../doctors/doctors.service';
import { User as ClinicUser } from '../permissions/entities/user.entity';
import { Reservation, ReservationStatus } from '../reservations/entities/reservation.entity';
import { ClinicLoginDto } from './dto/clinic-login.dto';
import { DoctorLoginDto } from './dto/doctor-login.dto';
import { TranslationService } from '../../common/services/translation.service';

@Injectable()
export class ClinicAuthService {
  constructor(
    private clinicsService: ClinicsService,
    private jwtService: JwtService,
    private tenantRepositoryService: TenantRepositoryService,
    private tenantDataSourceService: TenantDataSourceService,
    private mainDoctorsService: MainDoctorsService,
    private translationService: TranslationService,
  ) {}

  /**
   * Get dashboard stats for clinic (after login).
   * - total_appointments_last_7_days: non-cancelled reservations in last 7 days
   * - total_revenue_last_7_days: sum of fees for non-cancelled in last 7 days
   * - doctor_workload_today: non-cancelled reservations today
   * - cancellations_last_7_days: cancelled reservations in last 7 days
   */
  private async getClinicDashboardStats() {
    const reservationRepo =
      await this.tenantRepositoryService.getRepository<Reservation>(Reservation);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      totalAppointmentsLast7Days,
      totalRevenueResult,
      doctorWorkloadToday,
      cancellationsLast7Days,
    ] = await Promise.all([
      reservationRepo
        .createQueryBuilder('r')
        .where('r.date >= :from', { from: sevenDaysAgo })
        .andWhere('r.date < :to', { to: tomorrow })
        .andWhere('r.status != :cancelled', {
          cancelled: ReservationStatus.CANCELLED,
        })
        .getCount(),
      reservationRepo
        .createQueryBuilder('r')
        .select('COALESCE(SUM(r.fees), 0)', 'total')
        .where('r.date >= :from', { from: sevenDaysAgo })
        .andWhere('r.date < :to', { to: tomorrow })
        .andWhere('r.status != :cancelled', {
          cancelled: ReservationStatus.CANCELLED,
        })
        .getRawOne<{ total: string }>(),
      reservationRepo
        .createQueryBuilder('r')
        .where('r.date >= :today', { today })
        .andWhere('r.date < :tomorrow', { tomorrow })
        .andWhere('r.status != :cancelled', {
          cancelled: ReservationStatus.CANCELLED,
        })
        .getCount(),
      reservationRepo
        .createQueryBuilder('r')
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
      total_appointments_last_7_days: totalAppointmentsLast7Days,
      total_revenue_last_7_days: totalRevenue,
      doctor_workload_today: doctorWorkloadToday,
      cancellations_last_7_days: cancellationsLast7Days,
    };
  }

  /**
   * Same as getClinicDashboardStats but using a given DataSource (e.g. for doctor login without tenant context).
   */
  private async getDashboardStatsFromDataSource(
    dataSource: DataSource,
  ): Promise<{
    total_appointments_last_7_days: number;
    total_revenue_last_7_days: number;
    doctor_workload_today: number;
    cancellations_last_7_days: number;
  }> {
    const reservationRepo = dataSource.getRepository(Reservation);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      totalAppointmentsLast7Days,
      totalRevenueResult,
      doctorWorkloadToday,
      cancellationsLast7Days,
    ] = await Promise.all([
      reservationRepo
        .createQueryBuilder('r')
        .where('r.date >= :from', { from: sevenDaysAgo })
        .andWhere('r.date < :to', { to: tomorrow })
        .andWhere('r.status != :cancelled', {
          cancelled: ReservationStatus.CANCELLED,
        })
        .getCount(),
      reservationRepo
        .createQueryBuilder('r')
        .select('COALESCE(SUM(r.fees), 0)', 'total')
        .where('r.date >= :from', { from: sevenDaysAgo })
        .andWhere('r.date < :to', { to: tomorrow })
        .andWhere('r.status != :cancelled', {
          cancelled: ReservationStatus.CANCELLED,
        })
        .getRawOne<{ total: string }>(),
      reservationRepo
        .createQueryBuilder('r')
        .where('r.date >= :today', { today })
        .andWhere('r.date < :tomorrow', { tomorrow })
        .andWhere('r.status != :cancelled', {
          cancelled: ReservationStatus.CANCELLED,
        })
        .getCount(),
      reservationRepo
        .createQueryBuilder('r')
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
      total_appointments_last_7_days: totalAppointmentsLast7Days,
      total_revenue_last_7_days: totalRevenue,
      doctor_workload_today: doctorWorkloadToday,
      cancellations_last_7_days: cancellationsLast7Days,
    };
  }

  async login(clinicId: number, clinicLoginDto: ClinicLoginDto) {
    // Get clinic from clinics table to find database_name
    // Note: Tenant context is automatically set by ClinicTenantGuard
    const clinic = await this.clinicsService.findOne(clinicId);

    if (!clinic || !clinic.database_name) {
      throw new NotFoundException('Clinic not found');
    }

    // Get user repository from clinic database
    const userRepository =
      await this.tenantRepositoryService.getRepository<ClinicUser>(ClinicUser);

    // Find user in clinic database by phone
    const clinicDbUser = await userRepository.findOne({
      where: { phone: clinicLoginDto.phone },
      relations: ['role', 'role.permissions'],
    });

    if (!clinicDbUser) {
      throw new UnauthorizedException(this.translationService.t('Invalid credentials'));
    }

    // Validate password
    const isPasswordValid = await bcrypt.compare(
      clinicLoginDto.password,
      clinicDbUser.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException(this.translationService.t('Invalid credentials'));
    }

    // Remove password from response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _password, ...result } = clinicDbUser;

    // Update clinic's last_active timestamp
    await this.clinicsService.updateLastActive(clinicId);

    // Generate token with clinic context
    const payload = {
      sub: clinicDbUser.id,
      role_id: clinicDbUser.role_id,
      database_name: clinic.database_name,
      clinic_id: clinicId,
      role_slug: clinicDbUser.role?.slug,
    };

    const dashboard = await this.getClinicDashboardStats();

    return {
      ...result,
      access_token: this.jwtService.sign(payload),
      dashboard: {
        total_appointments_last_7_days: dashboard.total_appointments_last_7_days,
        total_revenue_last_7_days: dashboard.total_revenue_last_7_days,
        doctor_workload_today: dashboard.doctor_workload_today,
        cancellations_last_7_days: dashboard.cancellations_last_7_days,
      },
    };
  }

  /**
   * Doctor login: identify by email or phone, resolve clinic from main doctors table, validate password in clinic DB, return clinic JWT + dashboard.
   */
  async doctorLogin(dto: DoctorLoginDto) {
    const identifier = (dto.user_name ?? '').trim();
    if (!identifier) {
      throw new BadRequestException('user_name is required');
    }

    const mainDoctor = await this.mainDoctorsService.findOneByEmailOrPhone(
      identifier,
    );
    if (!mainDoctor) {
      throw new UnauthorizedException(
        this.translationService.t('Invalid credentials'),
      );
    }

    const clinic = await this.clinicsService.findOneWithoutRelations(
      mainDoctor.clinic_id,
    );
    if (!clinic?.database_name) {
      throw new NotFoundException('Clinic not found');
    }

    const clinicDataSource =
      await this.tenantDataSourceService.getTenantDataSource(
        clinic.database_name,
      );
    if (!clinicDataSource) {
      throw new NotFoundException('Clinic database not available');
    }

    const clinicUserRepo = clinicDataSource.getRepository(ClinicUser);
    const clinicDbUser = await clinicUserRepo.findOne({
      where: { email: mainDoctor.email },
      relations: ['role', 'role.permissions'],
    });
    if (!clinicDbUser) {
      throw new UnauthorizedException(
        this.translationService.t('Invalid credentials'),
      );
    }
    const isPasswordValid = await bcrypt.compare(
      dto.password,
      clinicDbUser.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException(
        this.translationService.t('Invalid credentials'),
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _password, ...result } = clinicDbUser;

    await this.clinicsService.updateLastActive(clinic.id);

    const payload = {
      sub: clinicDbUser.id,
      role_id: clinicDbUser.role_id,
      database_name: clinic.database_name,
      clinic_id: clinic.id,
      role_slug: clinicDbUser.role?.slug,
    };

    const dashboard = await this.getDashboardStatsFromDataSource(
      clinicDataSource,
    );

    return {
      ...result,
      access_token: this.jwtService.sign(payload),
      dashboard: {
        total_appointments_last_7_days: dashboard.total_appointments_last_7_days,
        total_revenue_last_7_days: dashboard.total_revenue_last_7_days,
        doctor_workload_today: dashboard.doctor_workload_today,
        cancellations_last_7_days: dashboard.cancellations_last_7_days,
      },
    };
  }
}

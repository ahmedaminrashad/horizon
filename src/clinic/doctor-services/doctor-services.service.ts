import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { TenantRepositoryService } from '../../database/tenant-repository.service';
import { DoctorService } from './entities/doctor-service.entity';
import { CreateDoctorServiceDto } from './dto/create-doctor-service.dto';
import { UpdateDoctorServiceDto } from './dto/update-doctor-service.dto';
import { DoctorServiceItemDto } from './dto/doctor-service-item.dto';
import { Doctor } from '../doctors/entities/doctor.entity';
import { Service } from '../services/entities/service.entity';
import { DoctorWorkingHour } from '../working-hours/entities/doctor-working-hour.entity';

type DoctorServiceWithBookingFlags = DoctorService & {
  walk_in: boolean;
  slot: boolean;
};

@Injectable()
export class DoctorServicesService {
  constructor(private tenantRepositoryService: TenantRepositoryService) {}

  private async getRepository(): Promise<Repository<DoctorService>> {
    const repository =
      await this.tenantRepositoryService.getRepository<DoctorService>(
        DoctorService,
      );
    if (!repository) {
      throw new BadRequestException(
        'Clinic context not found. Please ensure you are accessing this endpoint as a clinic user.',
      );
    }
    return repository;
  }

  async create(
    clinicId: number,
    createDto: CreateDoctorServiceDto,
  ): Promise<DoctorService> {
    const repository = await this.getRepository();
    await this.ensureServiceExists(createDto.service_id);
    await this.ensureDoctorExistsInClinic(createDto.doctor_id, clinicId);
    const entity = repository.create(createDto);
    return repository.save(entity);
  }

  /**
   * Create multiple doctor services (e.g. during doctor registration).
   */
  async createMany(
    doctorId: number,
    items: DoctorServiceItemDto[],
  ): Promise<DoctorService[]> {
    if (!items?.length) return [];
    const repository = await this.getRepository();
    const entities = items.map((item) =>
      repository.create({
        service_id: item.service_id,
        doctor_id: doctorId,
        duration: item.duration ?? null,
        price: item.price ?? null,
        service_type: item.service_type ?? null,
      }),
    );
    return repository.save(entities);
  }

  async findAll(
    clinicId: number,
    doctorId?: number,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    data: DoctorServiceWithBookingFlags[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const repository = await this.getRepository();
    const qb = repository
      .createQueryBuilder('ds')
      .leftJoinAndSelect('ds.service', 'service')
      .leftJoinAndSelect('ds.doctor', 'doctor')
      .where('doctor.clinic_id = :clinicId', { clinicId })
      .orderBy('ds.id', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    if (doctorId != null) {
      qb.andWhere('ds.doctor_id = :doctorId', { doctorId });
    }

    const [data, total] = await qb.getManyAndCount();
    const doctorIds = Array.from(new Set(data.map((item) => item.doctor_id)));
    const bookingFlagsByDoctorId = await this.getBookingFlagsByDoctorId(
      clinicId,
      doctorIds,
    );
    const dataWithFlags: DoctorServiceWithBookingFlags[] = data.map((item) => {
      const flags = bookingFlagsByDoctorId.get(item.doctor_id) ?? {
        walk_in: false,
        slot: false,
      };
      return {
        ...item,
        walk_in: flags.walk_in,
        slot: flags.slot,
      };
    });

    const totalPages = Math.ceil(total / limit) || 1;
    return { data: dataWithFlags, total, page, totalPages };
  }

  async findOne(clinicId: number, id: number): Promise<DoctorService> {
    const repository = await this.getRepository();
    const ds = await repository.findOne({
      where: { id },
      relations: ['service', 'doctor'],
    });
    if (!ds?.doctor) {
      throw new NotFoundException(`Doctor service with ID ${id} not found`);
    }
    if (ds.doctor.clinic_id !== clinicId) {
      throw new NotFoundException(`Doctor service with ID ${id} not found`);
    }
    return ds;
  }

  async update(
    clinicId: number,
    id: number,
    updateDto: UpdateDoctorServiceDto,
  ): Promise<DoctorService> {
    const existing = await this.findOne(clinicId, id);
    const repository = await this.getRepository();
    if (updateDto.service_id !== undefined) {
      await this.ensureServiceExists(updateDto.service_id);
    }
    if (updateDto.doctor_id !== undefined) {
      await this.ensureDoctorExistsInClinic(updateDto.doctor_id, clinicId);
    }
    Object.assign(existing, updateDto);
    return repository.save(existing);
  }

  async remove(clinicId: number, id: number): Promise<void> {
    const existing = await this.findOne(clinicId, id);
    const repository = await this.getRepository();
    await repository.remove(existing);
  }

  private async ensureServiceExists(serviceId: number): Promise<void> {
    const repo = await this.tenantRepositoryService.getRepository<Service>(
      Service,
    );
    if (!repo) throw new BadRequestException('Clinic context not found');
    const service = await repo.findOne({ where: { id: serviceId } });
    if (!service) {
      throw new BadRequestException(`Service with id ${serviceId} not found`);
    }
  }

  private async ensureDoctorExistsInClinic(
    doctorId: number,
    clinicId: number,
  ): Promise<void> {
    const repo = await this.tenantRepositoryService.getRepository<Doctor>(
      Doctor,
    );
    if (!repo) throw new BadRequestException('Clinic context not found');
    const doctor = await repo.findOne({
      where: { id: doctorId, clinic_id: clinicId },
    });
    if (!doctor) {
      throw new BadRequestException(
        `Doctor with id ${doctorId} not found in this clinic`,
      );
    }
  }

  private async getBookingFlagsByDoctorId(
    clinicId: number,
    doctorIds: number[],
  ): Promise<Map<number, { walk_in: boolean; slot: boolean }>> {
    const result = new Map<number, { walk_in: boolean; slot: boolean }>();
    if (!doctorIds.length) return result;

    const workingHourRepo =
      await this.tenantRepositoryService.getRepository<DoctorWorkingHour>(
        DoctorWorkingHour,
      );
    if (!workingHourRepo) return result;

    const workingHours = await workingHourRepo
      .createQueryBuilder('wh')
      .select(['wh.doctor_id AS doctor_id', 'wh.waterfall AS waterfall'])
      .where('wh.clinic_id = :clinicId', { clinicId })
      .andWhere('wh.doctor_id IN (:...doctorIds)', { doctorIds })
      .getRawMany<{ doctor_id: string | number; waterfall: boolean }>();

    for (const row of workingHours) {
      const id = Number(row.doctor_id);
      const current = result.get(id) ?? { walk_in: false, slot: false };
      if (row.waterfall === true) current.walk_in = true;
      if (row.waterfall === false) current.slot = true;
      result.set(id, current);
    }

    return result;
  }
}

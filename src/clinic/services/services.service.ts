import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { TenantRepositoryService } from '../../database/tenant-repository.service';
import { Service } from './entities/service.entity';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { ServicesService as MainServicesService } from '../../services/services.service';

@Injectable()
export class ClinicServicesService {
  constructor(
    private tenantRepositoryService: TenantRepositoryService,
    private mainServicesService: MainServicesService,
  ) {}

  private async getRepository(): Promise<Repository<Service>> {
    const repository = await this.tenantRepositoryService.getRepository<Service>(
      Service,
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
    createServiceDto: CreateServiceDto,
  ): Promise<Service> {
    const repository = await this.getRepository();
    const service = repository.create(createServiceDto);
    const savedService = await repository.save(service);

    // Sync to main services table
    await this.syncToMainServices(clinicId, savedService);

    return savedService;
  }

  async findAll(
    clinicId: number,
    page: number = 1,
    limit: number = 10,
    filters?: {
      is_active?: boolean;
      category?: string;
      specialty?: string;
    },
  ) {
    const repository = await this.getRepository();
    const skip = (page - 1) * limit;

    const findOptions: any = {
      skip,
      take: limit,
      order: {
        createdAt: 'DESC',
      },
    };

    // Build where clause
    const where: any = {};
    if (filters?.is_active !== undefined) {
      where.is_active = filters.is_active;
    }
    if (filters?.category) {
      where.category = filters.category;
    }
    if (filters?.specialty) {
      where.specialty = filters.specialty;
    }

    if (Object.keys(where).length > 0) {
      findOptions.where = where;
    }

    const [data, total] = await repository.findAndCount(findOptions);

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

  async findOne(clinicId: number, id: number): Promise<Service> {
    const repository = await this.getRepository();
    const service = await repository.findOne({
      where: { id },
    });

    if (!service) {
      throw new NotFoundException(`Service with ID ${id} not found`);
    }

    return service;
  }

  async update(
    clinicId: number,
    id: number,
    updateServiceDto: UpdateServiceDto,
  ): Promise<Service> {
    const repository = await this.getRepository();
    const service = await this.findOne(clinicId, id);

    Object.assign(service, updateServiceDto);
    const savedService = await repository.save(service);

    // Sync to main services table
    await this.syncToMainServices(clinicId, savedService);

    return savedService;
  }

  async remove(clinicId: number, id: number): Promise<void> {
    const repository = await this.getRepository();
    const service = await this.findOne(clinicId, id);
    await repository.remove(service);
  }

  /**
   * Sync clinic service to main services table
   */
  private async syncToMainServices(
    clinicId: number,
    clinicService: Service,
  ): Promise<void> {
    try {
      // Sync to main services table
      await this.mainServicesService.syncService(clinicId, clinicService.id, {
        name: clinicService.name,
        category: clinicService.category,
        specialty: clinicService.specialty,
        degree: clinicService.degree,
        type: clinicService.type,
        default_duration: clinicService.default_duration,
        default_price: clinicService.default_price,
        currency: clinicService.currency,
        is_active: clinicService.is_active,
      });
    } catch (error) {
      // Log error but don't fail the operation
      console.error(
        `Failed to sync service ${clinicService.id} to main services table:`,
        error,
      );
    }
  }
}

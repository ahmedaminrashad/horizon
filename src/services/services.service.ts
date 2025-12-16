import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Service } from './entities/service.entity';

@Injectable()
export class ServicesService {
  constructor(
    @InjectRepository(Service)
    private servicesRepository: Repository<Service>,
  ) {}

  async findAll(page: number = 1, limit: number = 10, clinicId?: number) {
    const skip = (page - 1) * limit;

    const where = clinicId ? { clinic_id: clinicId } : {};

    const [data, total] = await this.servicesRepository.findAndCount({
      where,
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

  async findOne(id: number): Promise<Service> {
    const service = await this.servicesRepository.findOne({
      where: { id },
    });

    if (!service) {
      throw new NotFoundException(`Service with ID ${id} not found`);
    }

    return service;
  }

  async findByClinicServiceId(
    clinicId: number,
    clinicServiceId: number,
  ): Promise<Service | null> {
    return this.servicesRepository.findOne({
      where: {
        clinic_id: clinicId,
        clinic_service_id: clinicServiceId,
      },
    });
  }

  async syncService(
    clinicId: number,
    clinicServiceId: number,
    serviceData: {
      name: string;
      category?: string;
      specialty?: string;
      degree?: string;
      type?: string;
      default_duration?: number;
      default_price?: number;
      currency?: string;
      is_active?: boolean;
    },
  ): Promise<Service> {
    const existingService = await this.findByClinicServiceId(
      clinicId,
      clinicServiceId,
    );

    if (existingService) {
      // Update existing service
      Object.assign(existingService, {
        name: serviceData.name,
        category: serviceData.category,
        specialty: serviceData.specialty,
        degree: serviceData.degree,
        type: serviceData.type as any,
        default_duration: serviceData.default_duration,
        default_price: serviceData.default_price,
        currency: serviceData.currency,
        is_active: serviceData.is_active,
      });
      return this.servicesRepository.save(existingService);
    } else {
      // Create new service
      const service = this.servicesRepository.create({
        name: serviceData.name,
        clinic_id: clinicId,
        clinic_service_id: clinicServiceId,
        category: serviceData.category,
        specialty: serviceData.specialty,
        degree: serviceData.degree,
        type: serviceData.type as any,
        default_duration: serviceData.default_duration,
        default_price: serviceData.default_price,
        currency: serviceData.currency,
        is_active: serviceData.is_active !== undefined ? serviceData.is_active : true,
      });
      return this.servicesRepository.save(service);
    }
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Service, ServiceType } from './entities/service.entity';

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

  async create(serviceData: {
    clinic_id: number;
    name: string;
    category?: string;
    specialty?: string;
    degree?: string;
    type?: ServiceType;
    default_duration_minutes?: number;
    default_price?: number;
    currency?: string;
    is_active?: boolean;
  }): Promise<Service> {
    const service = this.servicesRepository.create({
      clinic_id: serviceData.clinic_id,
      name: serviceData.name,
      category: serviceData.category,
      specialty: serviceData.specialty,
      degree: serviceData.degree,
      type: serviceData.type,
      default_duration_minutes: serviceData.default_duration_minutes,
      default_price: serviceData.default_price,
      currency: serviceData.currency,
      is_active:
        serviceData.is_active !== undefined ? serviceData.is_active : true,
    });
    return this.servicesRepository.save(service);
  }

  async update(
    id: number,
    serviceData: {
      name?: string;
      category?: string;
      specialty?: string;
      degree?: string;
      type?: ServiceType;
      default_duration_minutes?: number;
      default_price?: number;
      currency?: string;
      is_active?: boolean;
    },
  ): Promise<Service> {
    const service = await this.findOne(id);
    Object.assign(service, serviceData);
    return this.servicesRepository.save(service);
  }

  async findMatchingServices(
    specialty?: string,
    degree?: string,
    clinicId?: number,
  ): Promise<Service[]> {
    const where: {
      is_active: boolean;
      specialty?: string;
      degree?: string;
      clinic_id?: number;
    } = {
      is_active: true,
    };

    if (specialty) {
      where.specialty = specialty;
    }

    if (degree) {
      where.degree = degree;
    }

    if (clinicId) {
      where.clinic_id = clinicId;
    }

    return this.servicesRepository.find({
      where,
      order: {
        createdAt: 'DESC',
      },
    });
  }
}

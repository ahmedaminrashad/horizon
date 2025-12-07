import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { TenantRepositoryService } from '../../database/tenant-repository.service';
import { SlotTemplate } from './entities/slot-template.entity';
import { Doctor } from '../doctors/entities/doctor.entity';
import { CreateSlotTemplateDto } from './dto/create-slot-template.dto';
import { UpdateSlotTemplateDto } from './dto/update-slot-template.dto';

@Injectable()
export class SlotTemplateService {
  constructor(
    private tenantRepositoryService: TenantRepositoryService,
  ) {}

  private async getRepository(): Promise<Repository<SlotTemplate>> {
    const repository =
      await this.tenantRepositoryService.getRepository<SlotTemplate>(
        SlotTemplate,
      );

    if (!repository) {
      throw new BadRequestException(
        'Clinic context not found. Please ensure you are accessing this endpoint as a clinic user.',
      );
    }

    return repository;
  }

  private async getDoctorRepository(): Promise<Repository<Doctor>> {
    const repository = await this.tenantRepositoryService.getRepository<Doctor>(
      Doctor,
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
    createSlotTemplateDto: CreateSlotTemplateDto,
  ): Promise<SlotTemplate> {
    const repository = await this.getRepository();
    const doctorRepository = await this.getDoctorRepository();

    // Validate that doctor exists and belongs to this clinic
    const doctor = await doctorRepository.findOne({
      where: {
        id: createSlotTemplateDto.doctor_id,
        clinic_id: clinicId,
      },
    });

    if (!doctor) {
      throw new NotFoundException(
        `Doctor with ID ${createSlotTemplateDto.doctor_id} not found in this clinic`,
      );
    }

    const slotTemplate = repository.create(createSlotTemplateDto);
    return repository.save(slotTemplate);
  }

  async findAll(
    clinicId: number,
    page: number = 1,
    limit: number = 10,
    doctorId?: number,
  ) {
    const repository = await this.getRepository();
    const skip = (page - 1) * limit;

    const findOptions: any = {
      relations: ['doctor'],
      skip,
      take: limit,
      order: {
        createdAt: 'DESC',
      },
    };

    // Filter by doctor_id if provided
    if (doctorId) {
      findOptions.where = { doctor_id: doctorId };
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

  async findOne(clinicId: number, id: number): Promise<SlotTemplate> {
    const repository = await this.getRepository();
    const slotTemplate = await repository.findOne({
      where: { id },
      relations: ['doctor'],
    });

    if (!slotTemplate) {
      throw new NotFoundException(`Slot template with ID ${id} not found`);
    }

    return slotTemplate;
  }

  async update(
    clinicId: number,
    id: number,
    updateSlotTemplateDto: UpdateSlotTemplateDto,
  ): Promise<SlotTemplate> {
    const repository = await this.getRepository();
    const doctorRepository = await this.getDoctorRepository();
    const slotTemplate = await this.findOne(clinicId, id);

    // If doctor_id is being updated, validate it
    if (updateSlotTemplateDto.doctor_id) {
      const doctor = await doctorRepository.findOne({
        where: {
          id: updateSlotTemplateDto.doctor_id,
          clinic_id: clinicId,
        },
      });

      if (!doctor) {
        throw new NotFoundException(
          `Doctor with ID ${updateSlotTemplateDto.doctor_id} not found in this clinic`,
        );
      }
    }

    Object.assign(slotTemplate, updateSlotTemplateDto);
    return repository.save(slotTemplate);
  }

  async remove(clinicId: number, id: number): Promise<void> {
    const repository = await this.getRepository();
    const slotTemplate = await this.findOne(clinicId, id);
    await repository.remove(slotTemplate);
  }
}

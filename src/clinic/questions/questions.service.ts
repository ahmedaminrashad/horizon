import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { TenantRepositoryService } from '../../database/tenant-repository.service';
import { Question } from './entities/question.entity';
import { Doctor } from '../doctors/entities/doctor.entity';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';

@Injectable()
export class QuestionsService {
  constructor(private tenantRepositoryService: TenantRepositoryService) {}

  private async getQuestionRepository(): Promise<Repository<Question>> {
    const repository =
      await this.tenantRepositoryService.getRepository<Question>(Question);
    if (!repository) {
      throw new BadRequestException(
        'Clinic context not found. Please ensure you are accessing this endpoint as a clinic user.',
      );
    }
    return repository;
  }

  private async getDoctorRepository(): Promise<Repository<Doctor>> {
    const repository =
      await this.tenantRepositoryService.getRepository<Doctor>(Doctor);
    if (!repository) {
      throw new BadRequestException(
        'Clinic context not found. Please ensure you are accessing this endpoint as a clinic user.',
      );
    }
    return repository;
  }

  private async ensureDoctorExists(doctorId: number): Promise<void> {
    const doctorRepo = await this.getDoctorRepository();
    const doctor = await doctorRepo.findOne({ where: { id: doctorId } });
    if (!doctor) {
      throw new BadRequestException(`Doctor with id ${doctorId} not found.`);
    }
  }

  async create(
    clinicId: number,
    createQuestionDto: CreateQuestionDto,
  ): Promise<Question> {
    await this.ensureDoctorExists(createQuestionDto.doctor_id);
    const repository = await this.getQuestionRepository();
    const question = repository.create({
      ...createQuestionDto,
      clinic_id: clinicId,
    });
    return repository.save(question);
  }

  async findAll(
    clinicId: number,
    page: number = 1,
    limit: number = 10,
    doctorId?: number,
    clinicIdFilter?: number,
  ): Promise<{ data: Question[]; total: number; page: number; totalPages: number }> {
    const repository = await this.getQuestionRepository();
    const skip = (page - 1) * limit;
    const effectiveClinicId = clinicIdFilter ?? clinicId;

    const qb = repository
      .createQueryBuilder('question')
      .leftJoinAndSelect('question.doctor', 'doctor')
      .where('question.clinic_id = :clinicId', { clinicId: effectiveClinicId })
      .orderBy('question.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (doctorId != null) {
      qb.andWhere('question.doctor_id = :doctorId', { doctorId });
    }

    const [data, total] = await qb.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return { data, total, page, totalPages };
  }

  async findOne(clinicId: number, id: number): Promise<Question> {
    const repository = await this.getQuestionRepository();
    const question = await repository.findOne({
      where: { id, clinic_id: clinicId },
      relations: ['doctor'],
    });
    if (!question) {
      throw new NotFoundException(`Question with id ${id} not found.`);
    }
    return question;
  }

  async update(
    clinicId: number,
    id: number,
    updateQuestionDto: UpdateQuestionDto,
  ): Promise<Question> {
    const question = await this.findOne(clinicId, id);
    if (updateQuestionDto.doctor_id != null) {
      await this.ensureDoctorExists(updateQuestionDto.doctor_id);
    }
    const repository = await this.getQuestionRepository();
    Object.assign(question, updateQuestionDto);
    return repository.save(question);
  }

  async remove(clinicId: number, id: number): Promise<void> {
    const question = await this.findOne(clinicId, id);
    const repository = await this.getQuestionRepository();
    await repository.remove(question);
  }
}

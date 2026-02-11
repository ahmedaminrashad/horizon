import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { TenantRepositoryService } from '../../database/tenant-repository.service';
import { DoctorFile } from './entities/doctor-file.entity';
import { Doctor } from '../doctors/entities/doctor.entity';

@Injectable()
export class DoctorFilesService {
  constructor(private tenantRepositoryService: TenantRepositoryService) {}

  private async getRepository(): Promise<Repository<DoctorFile>> {
    const repository =
      await this.tenantRepositoryService.getRepository<DoctorFile>(DoctorFile);
    if (!repository) {
      throw new BadRequestException(
        'Clinic context not found. Please ensure you are accessing this endpoint as a clinic user.',
      );
    }
    return repository;
  }

  async findByDoctorId(doctorId: number): Promise<DoctorFile[]> {
    const repository = await this.getRepository();
    return repository.find({
      where: { doctor_id: doctorId },
      order: { id: 'ASC' },
    });
  }

  async create(
    doctorId: number,
    filePath: string,
    fileName?: string,
    fileType?: string,
  ): Promise<DoctorFile> {
    await this.ensureDoctorExists(doctorId);
    const repository = await this.getRepository();
    const file = repository.create({
      doctor_id: doctorId,
      file_path: filePath,
      file_name: fileName ?? null,
      file_type: fileType ?? null,
    });
    return repository.save(file);
  }

  async remove(doctorId: number, fileId: number): Promise<void> {
    const repository = await this.getRepository();
    const file = await repository.findOne({
      where: { id: fileId, doctor_id: doctorId },
    });
    if (!file) {
      throw new NotFoundException(
        `Doctor file with ID ${fileId} not found for this doctor`,
      );
    }
    await repository.remove(file);
  }

  private async ensureDoctorExists(doctorId: number): Promise<void> {
    const repo =
      await this.tenantRepositoryService.getRepository<Doctor>(Doctor);
    if (!repo) throw new BadRequestException('Clinic context not found');
    const doctor = await repo.findOne({ where: { id: doctorId } });
    if (!doctor) {
      throw new BadRequestException(`Doctor with id ${doctorId} not found`);
    }
  }
}

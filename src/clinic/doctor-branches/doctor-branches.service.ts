import {
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { TenantRepositoryService } from '../../database/tenant-repository.service';
import { DoctorBranch } from './entities/doctor-branch.entity';
import { Doctor } from '../doctors/entities/doctor.entity';
import { Branch } from '../branches/entities/branch.entity';

@Injectable()
export class DoctorBranchesService {
  constructor(private tenantRepositoryService: TenantRepositoryService) {}

  private async getRepository(): Promise<Repository<DoctorBranch>> {
    const repository =
      await this.tenantRepositoryService.getRepository<DoctorBranch>(
        DoctorBranch,
      );
    if (!repository) {
      throw new BadRequestException(
        'Clinic context not found. Please ensure you are accessing this endpoint as a clinic user.',
      );
    }
    return repository;
  }

  /**
   * Create doctor-branch links (e.g. during doctor creation).
   */
  async createMany(
    doctorId: number,
    branchIds: number[],
  ): Promise<DoctorBranch[]> {
    if (!branchIds?.length) return [];
    const repository = await this.getRepository();
    await this.ensureDoctorExists(doctorId);
    for (const branchId of branchIds) {
      await this.ensureBranchExists(branchId);
    }
    const entities = branchIds.map((branch_id) =>
      repository.create({ doctor_id: doctorId, branch_id }),
    );
    return repository.save(entities);
  }

  async findByDoctorId(doctorId: number): Promise<DoctorBranch[]> {
    const repository = await this.getRepository();
    return repository.find({
      where: { doctor_id: doctorId },
      relations: ['branch'],
      order: { id: 'ASC' },
    });
  }

  async getBranchIdsForDoctor(doctorId: number): Promise<number[]> {
    const rows = await this.findByDoctorId(doctorId);
    return rows.map((r) => r.branch_id);
  }

  /**
   * Replace all branches for a doctor (delete existing, create new).
   */
  async setBranchesForDoctor(
    doctorId: number,
    branchIds: number[],
  ): Promise<DoctorBranch[]> {
    const repository = await this.getRepository();
    await repository.delete({ doctor_id: doctorId });
    return this.createMany(doctorId, branchIds);
  }

  private async ensureDoctorExists(doctorId: number): Promise<void> {
    const repo = await this.tenantRepositoryService.getRepository<Doctor>(
      Doctor,
    );
    if (!repo) throw new BadRequestException('Clinic context not found');
    const doctor = await repo.findOne({ where: { id: doctorId } });
    if (!doctor) {
      throw new BadRequestException(`Doctor with id ${doctorId} not found`);
    }
  }

  private async ensureBranchExists(branchId: number): Promise<void> {
    const repo = await this.tenantRepositoryService.getRepository<Branch>(
      Branch,
    );
    if (!repo) throw new BadRequestException('Clinic context not found');
    const branch = await repo.findOne({ where: { id: branchId } });
    if (!branch) {
      throw new BadRequestException(`Branch with id ${branchId} not found`);
    }
  }
}

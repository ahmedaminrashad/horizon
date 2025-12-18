import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { TenantRepositoryService } from '../../database/tenant-repository.service';
import { Branch } from './entities/branch.entity';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { BranchesService as MainBranchesService } from '../../branches/branches.service';

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
    createBranchDto: CreateBranchDto,
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

  async update(
    clinicId: number,
    id: number,
    updateBranchDto: UpdateBranchDto,
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

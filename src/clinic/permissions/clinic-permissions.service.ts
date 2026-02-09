import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { TenantRepositoryService } from '../../database/tenant-repository.service';
import { Permission } from './entities/permission.entity';
import { CreateClinicPermissionDto } from './dto/create-permission.dto';
import { UpdateClinicPermissionDto } from './dto/update-permission.dto';

@Injectable()
export class ClinicPermissionsService {
  constructor(
    private tenantRepositoryService: TenantRepositoryService,
  ) {}

  private async getRepository(): Promise<Repository<Permission>> {
    const repo =
      await this.tenantRepositoryService.getRepository<Permission>(Permission);
    if (!repo) {
      throw new BadRequestException(
        'Clinic context not found. Please ensure you are accessing this endpoint as a clinic user.',
      );
    }
    return repo;
  }

  async create(
    createPermissionDto: CreateClinicPermissionDto,
  ): Promise<Permission> {
    const repo = await this.getRepository();

    const existingByName = await repo.findOne({
      where: { name: createPermissionDto.name },
    });
    const existingBySlug = await repo.findOne({
      where: { slug: createPermissionDto.slug },
    });
    if (existingByName || existingBySlug) {
      throw new ConflictException(
        'Permission with this name or slug already exists',
      );
    }

    const permission = repo.create(createPermissionDto);
    return repo.save(permission);
  }

  async findAll(): Promise<Permission[]> {
    const repo = await this.getRepository();
    return repo.find({ relations: ['roles'] });
  }

  async findOne(id: number): Promise<Permission> {
    const repo = await this.getRepository();
    const permission = await repo.findOne({
      where: { id },
      relations: ['roles'],
    });
    if (!permission) {
      throw new NotFoundException(`Permission with ID ${id} not found`);
    }
    return permission;
  }

  async update(
    id: number,
    updatePermissionDto: UpdateClinicPermissionDto,
  ): Promise<Permission> {
    const repo = await this.getRepository();
    const permission = await this.findOne(id);

    if (updatePermissionDto.name) {
      const existing = await repo.findOne({
        where: { name: updatePermissionDto.name },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException('Permission with this name already exists');
      }
    }
    if (updatePermissionDto.slug) {
      const existing = await repo.findOne({
        where: { slug: updatePermissionDto.slug },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException('Permission with this slug already exists');
      }
    }

    Object.assign(permission, updatePermissionDto);
    return repo.save(permission);
  }

  async remove(id: number): Promise<void> {
    const repo = await this.getRepository();
    const permission = await this.findOne(id);
    await repo.remove(permission);
  }
}

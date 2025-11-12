import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { Permission } from './entities/permission.entity';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(Permission)
    private permissionsRepository: Repository<Permission>,
  ) {}

  async create(createPermissionDto: CreatePermissionDto): Promise<Permission> {
    // Check if permission with same name or slug exists
    const existingPermissionByName = await this.permissionsRepository.findOne({
      where: { name: createPermissionDto.name },
    });

    const existingPermissionBySlug = await this.permissionsRepository.findOne({
      where: { slug: createPermissionDto.slug },
    });

    if (existingPermissionByName || existingPermissionBySlug) {
      throw new ConflictException(
        'Permission with this name or slug already exists',
      );
    }

    const permission = this.permissionsRepository.create(createPermissionDto);
    return this.permissionsRepository.save(permission);
  }

  async findAll(): Promise<Permission[]> {
    return this.permissionsRepository.find({
      relations: ['roles'],
    });
  }

  async findOne(id: number): Promise<Permission> {
    const permission = await this.permissionsRepository.findOne({
      where: { id },
      relations: ['roles'],
    });

    if (!permission) {
      throw new NotFoundException(`Permission with ID ${id} not found`);
    }

    return permission;
  }

  async findBySlug(slug: string): Promise<Permission | null> {
    return this.permissionsRepository.findOne({
      where: { slug },
      relations: ['roles'],
    });
  }

  async findByIds(ids: number[]): Promise<Permission[]> {
    if (ids.length === 0) return [];
    return this.permissionsRepository.findBy({ id: In(ids) });
  }

  async update(
    id: number,
    updatePermissionDto: UpdatePermissionDto,
  ): Promise<Permission> {
    const permission = await this.findOne(id);

    // Check for conflicts if name or slug is being updated
    if (updatePermissionDto.name) {
      const existingPermission = await this.permissionsRepository.findOne({
        where: { name: updatePermissionDto.name },
      });
      if (existingPermission && existingPermission.id !== id) {
        throw new ConflictException('Permission with this name already exists');
      }
    }

    if (updatePermissionDto.slug) {
      const existingPermission = await this.permissionsRepository.findOne({
        where: { slug: updatePermissionDto.slug },
      });
      if (existingPermission && existingPermission.id !== id) {
        throw new ConflictException('Permission with this slug already exists');
      }
    }

    Object.assign(permission, updatePermissionDto);
    return this.permissionsRepository.save(permission);
  }

  async remove(id: number): Promise<void> {
    const permission = await this.findOne(id);
    await this.permissionsRepository.remove(permission);
  }
}

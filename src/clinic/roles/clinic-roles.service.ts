import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Repository, In } from 'typeorm';
import { TenantRepositoryService } from '../../database/tenant-repository.service';
import { Role } from '../permissions/entities/role.entity';
import { Permission } from '../permissions/entities/permission.entity';
import { CreateClinicRoleDto } from './dto/create-role.dto';
import { UpdateClinicRoleDto } from './dto/update-role.dto';

@Injectable()
export class ClinicRolesService {
  constructor(
    private tenantRepositoryService: TenantRepositoryService,
  ) {}

  private async getRoleRepository(): Promise<Repository<Role>> {
    const repo =
      await this.tenantRepositoryService.getRepository<Role>(Role);
    if (!repo) {
      throw new BadRequestException(
        'Clinic context not found. Please ensure you are accessing this endpoint as a clinic user.',
      );
    }
    return repo;
  }

  private async getPermissionRepository(): Promise<Repository<Permission>> {
    const repo =
      await this.tenantRepositoryService.getRepository<Permission>(Permission);
    if (!repo) {
      throw new BadRequestException(
        'Clinic context not found. Please ensure you are accessing this endpoint as a clinic user.',
      );
    }
    return repo;
  }

  async create(createRoleDto: CreateClinicRoleDto): Promise<Role> {
    const rolesRepo = await this.getRoleRepository();
    const permissionsRepo = await this.getPermissionRepository();

    const existingByName = await rolesRepo.findOne({
      where: { name: createRoleDto.name },
    });
    const existingBySlug = await rolesRepo.findOne({
      where: { slug: createRoleDto.slug },
    });
    if (existingByName || existingBySlug) {
      throw new ConflictException('Role with this name or slug already exists');
    }

    const role = rolesRepo.create({
      name: createRoleDto.name,
      description: createRoleDto.description,
      slug: createRoleDto.slug,
    });

    if (createRoleDto.permissionIds?.length) {
      role.permissions = await permissionsRepo.findBy({
        id: In(createRoleDto.permissionIds),
      });
    }

    return rolesRepo.save(role);
  }

  async findAll(): Promise<Role[]> {
    const repo = await this.getRoleRepository();
    return repo.find({ relations: ['permissions'] });
  }

  async findOne(id: number): Promise<Role> {
    const repo = await this.getRoleRepository();
    const role = await repo.findOne({
      where: { id },
      relations: ['permissions', 'users'],
    });
    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }
    return role;
  }

  async update(id: number, updateRoleDto: UpdateClinicRoleDto): Promise<Role> {
    const rolesRepo = await this.getRoleRepository();
    const permissionsRepo = await this.getPermissionRepository();
    const role = await this.findOne(id);

    if (updateRoleDto.name) {
      const existing = await rolesRepo.findOne({
        where: { name: updateRoleDto.name },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException('Role with this name already exists');
      }
    }
    if (updateRoleDto.slug) {
      const existing = await rolesRepo.findOne({
        where: { slug: updateRoleDto.slug },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException('Role with this slug already exists');
      }
    }

    if (updateRoleDto.permissionIds !== undefined) {
      role.permissions = updateRoleDto.permissionIds.length
        ? await permissionsRepo.findBy({ id: In(updateRoleDto.permissionIds) })
        : [];
    }

    Object.assign(role, {
      name: updateRoleDto.name,
      description: updateRoleDto.description,
      slug: updateRoleDto.slug,
    });

    return rolesRepo.save(role);
  }

  async remove(id: number): Promise<void> {
    const repo = await this.getRoleRepository();
    const role = await this.findOne(id);
    await repo.remove(role);
  }

  async assignPermissions(roleId: number, permissionIds: number[]): Promise<Role> {
    const rolesRepo = await this.getRoleRepository();
    const permissionsRepo = await this.getPermissionRepository();
    const role = await this.findOne(roleId);
    role.permissions = permissionIds.length
      ? await permissionsRepo.findBy({ id: In(permissionIds) })
      : [];
    return rolesRepo.save(role);
  }
}

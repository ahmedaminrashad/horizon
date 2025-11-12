import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { Role } from './entities/role.entity';
import { Permission } from '../permissions/entities/permission.entity';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private rolesRepository: Repository<Role>,
    @InjectRepository(Permission)
    private permissionsRepository: Repository<Permission>,
  ) {}

  async create(createRoleDto: CreateRoleDto): Promise<Role> {
    // Check if role with same name or slug exists
    const existingRoleByName = await this.rolesRepository.findOne({
      where: { name: createRoleDto.name },
    });

    const existingRoleBySlug = await this.rolesRepository.findOne({
      where: { slug: createRoleDto.slug },
    });

    if (existingRoleByName || existingRoleBySlug) {
      throw new ConflictException('Role with this name or slug already exists');
    }

    const role = this.rolesRepository.create({
      name: createRoleDto.name,
      description: createRoleDto.description,
      slug: createRoleDto.slug,
    });

    // Assign permissions if provided
    if (createRoleDto.permissionIds && createRoleDto.permissionIds.length > 0) {
      const permissions = await this.permissionsRepository.findBy({
        id: In(createRoleDto.permissionIds),
      });
      role.permissions = permissions;
    }

    return this.rolesRepository.save(role);
  }

  async findAll(): Promise<Role[]> {
    return this.rolesRepository.find({
      relations: ['permissions'],
    });
  }

  async findOne(id: number): Promise<Role> {
    const role = await this.rolesRepository.findOne({
      where: { id },
      relations: ['permissions', 'users'],
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    return role;
  }

  async findBySlug(slug: string): Promise<Role | null> {
    return this.rolesRepository.findOne({
      where: { slug },
      relations: ['permissions'],
    });
  }

  async update(id: number, updateRoleDto: UpdateRoleDto): Promise<Role> {
    const role = await this.findOne(id);

    // Check for conflicts if name or slug is being updated
    if (updateRoleDto.name) {
      const existingRole = await this.rolesRepository.findOne({
        where: { name: updateRoleDto.name },
      });
      if (existingRole && existingRole.id !== id) {
        throw new ConflictException('Role with this name already exists');
      }
    }

    if (updateRoleDto.slug) {
      const existingRole = await this.rolesRepository.findOne({
        where: { slug: updateRoleDto.slug },
      });
      if (existingRole && existingRole.id !== id) {
        throw new ConflictException('Role with this slug already exists');
      }
    }

    // Update permissions if provided
    if (updateRoleDto.permissionIds) {
      const permissions = await this.permissionsRepository.findBy({
        id: In(updateRoleDto.permissionIds),
      });
      role.permissions = permissions;
    }

    Object.assign(role, {
      name: updateRoleDto.name,
      description: updateRoleDto.description,
      slug: updateRoleDto.slug,
    });

    return this.rolesRepository.save(role);
  }

  async remove(id: number): Promise<void> {
    const role = await this.findOne(id);
    await this.rolesRepository.remove(role);
  }

  async assignPermissions(
    roleId: number,
    permissionIds: number[],
  ): Promise<Role> {
    const role = await this.findOne(roleId);
    const permissions = await this.permissionsRepository.findBy({
      id: In(permissionIds),
    });
    role.permissions = permissions;
    return this.rolesRepository.save(role);
  }
}

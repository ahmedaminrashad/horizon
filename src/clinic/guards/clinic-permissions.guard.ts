import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../../auth/decorators/permissions.decorator';
import { TenantRepositoryService } from '../../database/tenant-repository.service';
import { TenantContextService } from '../../database/tenant-context.service';
import { UsersService } from '../../users/users.service';
import { Permission } from '../permissions/entities/permission.entity';
import { Role } from '../permissions/entities/role.entity';
import { User } from '../permissions/entities/user.entity';

@Injectable()
export class ClinicPermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private tenantRepositoryService: TenantRepositoryService,
    private tenantContextService: TenantContextService,
    private usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true; // No permissions required, allow access
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as { userId: number } | undefined;

    if (!user || !user.userId) {
      return false;
    }

    // Get clinicId from route params
    const clinicId = request.params?.clinicId;
    if (!clinicId) {
      return false;
    }

    // Get clinic user to find clinic database
    const clinicUser = await this.usersService.findOne(+clinicId);
    if (!clinicUser || !clinicUser.database_name) {
      return false;
    }

    // Set clinic context
    this.tenantContextService.setTenantDatabase(clinicUser.database_name);

    // Get user repository from clinic database
    const userRepository = await this.tenantRepositoryService.getRepository<User>(
      User,
    );

    if (!userRepository) {
      return false;
    }

    // Find user in clinic database by user_id from main database
    const clinicDbUser = await userRepository.findOne({
      where: { id: user.userId },
      relations: ['role', 'role.permissions'],
    });

    if (!clinicDbUser || !clinicDbUser.role) {
      return false;
    }

    // Load role with permissions if not already loaded
    if (!clinicDbUser.role.permissions) {
      const roleRepository = await this.tenantRepositoryService.getRepository<Role>(
        Role,
      );
      if (roleRepository) {
        const role = await roleRepository.findOne({
          where: { id: clinicDbUser.role.id },
          relations: ['permissions'],
        });
        if (role) {
          clinicDbUser.role.permissions = role.permissions;
        }
      }
    }

    if (!clinicDbUser.role.permissions) {
      return false;
    }

    // Get user's permission slugs from clinic database
    const userPermissions = clinicDbUser.role.permissions.map(
      (permission) => permission.slug,
    );

    // Check if user has all required permissions
    return requiredPermissions.every((permission) =>
      userPermissions.includes(permission),
    );
  }
}

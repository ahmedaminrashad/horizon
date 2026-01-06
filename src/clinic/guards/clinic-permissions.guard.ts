import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../../auth/decorators/permissions.decorator';
import { TenantRepositoryService } from '../../database/tenant-repository.service';
import { TenantContextService } from '../../database/tenant-context.service';
import { ClinicsService } from '../../clinics/clinics.service';
import { Role } from '../permissions/entities/role.entity';
import { User } from '../permissions/entities/user.entity';

@Injectable()
export class ClinicPermissionsGuard implements CanActivate {
  private readonly logger = new Logger(ClinicPermissionsGuard.name);

  constructor(
    private reflector: Reflector,
    private tenantRepositoryService: TenantRepositoryService,
    private tenantContextService: TenantContextService,
    private clinicsService: ClinicsService,
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
    const handler = context.getHandler();
    const controller = context.getClass();
    const route = `${controller.name}.${handler.name}`;
    const method = request.method;
    const path = request.url;

    const user = request.user as
      | { userId: number; clinic_id?: number }
      | undefined;

    if (!user || !user.userId) {
      this.logger.warn(
        `Forbidden resource access - Reason: No user found in request | Route: ${method} ${path} | Handler: ${route}`,
      );
      return false;
    }

    // Get clinicId from JWT token (request.user.clinic_id), route params, or request.clinicId (set by ClinicTenantGuard)
    let clinicId: number | undefined;

    // First try from JWT token (set by JWT strategy)
    if (user.clinic_id) {
      clinicId = user.clinic_id;
    }

    // Then try from request.clinicId (set by ClinicTenantGuard)
    if (!clinicId && request.clinicId) {
      clinicId = request.clinicId;
    }

    // Finally fallback to route params
    if (!clinicId && request.params?.clinicId) {
      clinicId = +request.params.clinicId;
    }

    if (!clinicId) {
      this.logger.warn(
        `Forbidden resource access - Reason: No clinicId found in JWT token, route params, or request | User ID: ${user.userId} | Route: ${method} ${path} | Handler: ${route}`,
      );
      return false;
    }

    // Get tenant database from context (should already be set by ClinicTenantGuard)
    let tenantDatabase = this.tenantContextService.getTenantDatabase();

    // If not set, get it from clinic
    if (!tenantDatabase) {
      const clinic = await this.clinicsService.findOne(clinicId);
      if (!clinic || !clinic.database_name) {
        this.logger.warn(
          `Clinic ${clinicId} not found or has no database_name`,
        );
        return false;
      }
      tenantDatabase = clinic.database_name;
      this.tenantContextService.setTenantDatabase(tenantDatabase);
    }

    // Get user repository from clinic database
    const userRepository =
      await this.tenantRepositoryService.getRepository<User>(User);

    if (!userRepository) {
      this.logger.warn(
        `Forbidden resource access - Reason: Cannot get user repository from clinic database | User ID: ${user.userId} | Clinic ID: ${clinicId} | Tenant DB: ${tenantDatabase} | Route: ${method} ${path} | Handler: ${route}`,
      );
      return false;
    }

    // Find user in clinic database by user_id from main database
    const clinicDbUser = await userRepository.findOne({
      where: { id: user.userId },
      relations: ['role', 'role.permissions'],
    });

    if (!clinicDbUser || !clinicDbUser.role) {
      this.logger.warn(
        `Forbidden resource access - Reason: User not found in clinic database or has no role | User ID: ${user.userId} | Clinic ID: ${clinicId} | Tenant DB: ${tenantDatabase} | Route: ${method} ${path} | Handler: ${route}`,
      );
      return false;
    }

    // Load role with permissions if not already loaded
    if (!clinicDbUser.role.permissions) {
      const roleRepository =
        await this.tenantRepositoryService.getRepository<Role>(Role);
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
      this.logger.warn(
        `Forbidden resource access - Reason: User role has no permissions | User ID: ${clinicDbUser.id} | Role: ${clinicDbUser.role.name || 'N/A'} | Clinic ID: ${clinicId} | Route: ${method} ${path} | Handler: ${route}`,
      );
      return false;
    }

    // Get user's permission slugs from clinic database
    const userPermissions = clinicDbUser.role.permissions.map(
      (permission) => permission.slug,
    );

    // Check if user has all required permissions
    const hasAllPermissions = requiredPermissions.every((permission) =>
      userPermissions.includes(permission),
    );

    if (!hasAllPermissions) {
      const missingPermissions = requiredPermissions.filter(
        (permission) => !userPermissions.includes(permission),
      );
      this.logger.warn(
        `Forbidden resource access - Reason: Missing required permissions | User ID: ${clinicDbUser.id} | Role: ${clinicDbUser.role.name || 'N/A'} | Clinic ID: ${clinicId} | Required: [${requiredPermissions.join(', ')}] | Missing: [${missingPermissions.join(', ')}] | User has: [${userPermissions.join(', ')}] | Route: ${method} ${path} | Handler: ${route}`,
      );
    }

    return hasAllPermissions;
  }
}

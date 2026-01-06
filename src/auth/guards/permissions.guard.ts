import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { UsersService } from '../../users/users.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(
    private reflector: Reflector,
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
    const handler = context.getHandler();
    const controller = context.getClass();
    const route = `${controller.name}.${handler.name}`;
    const method = request.method;
    const path = request.url;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const user = request.user as { userId: number } | undefined;

    if (!user || !user.userId) {
      this.logger.warn(
        `Forbidden resource access - Reason: No user found in request | Route: ${method} ${path} | Handler: ${route}`,
      );
      return false;
    }

    // Get user with role and permissions information
    const fullUser = await this.usersService.findOne(user.userId);

    if (!fullUser || !fullUser.role) {
      this.logger.warn(
        `Forbidden resource access - Reason: User has no role | User ID: ${user.userId} | Route: ${method} ${path} | Handler: ${route}`,
      );
      return false;
    }

    // Load role with permissions if not already loaded
    if (!fullUser.role.permissions) {
      // Reload user with permissions relation
      const userWithPermissions = await this.usersService.findOne(user.userId);
      if (!userWithPermissions?.role?.permissions) {
        this.logger.warn(
          `Forbidden resource access - Reason: User role has no permissions | User ID: ${user.userId} | Role: ${fullUser.role.name || 'N/A'} | Route: ${method} ${path} | Handler: ${route}`,
        );
        return false;
      }
      fullUser.role.permissions = userWithPermissions.role.permissions;
    }

    // Get user's permission slugs
    const userPermissions = fullUser.role.permissions.map(
      (permission) => permission.slug,
    );

    // Check if user has the "super" permission - if so, grant access to everything
    if (userPermissions.includes('super')) {
      return true;
    }

    // Check if user has all required permissions
    const hasAllPermissions = requiredPermissions.every((permission) =>
      userPermissions.includes(permission),
    );

    if (!hasAllPermissions) {
      const missingPermissions = requiredPermissions.filter(
        (permission) => !userPermissions.includes(permission),
      );
      this.logger.warn(
        `Forbidden resource access - Reason: Missing required permissions | User ID: ${user.userId} | Role: ${fullUser.role.name || 'N/A'} | Required: [${requiredPermissions.join(', ')}] | Missing: [${missingPermissions.join(', ')}] | User has: [${userPermissions.join(', ')}] | Route: ${method} ${path} | Handler: ${route}`,
      );
    }

    return hasAllPermissions;
  }
}

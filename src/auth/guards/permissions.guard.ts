import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { UsersService } from '../../users/users.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const user = request.user as { userId: number } | undefined;

    if (!user || !user.userId) {
      return false;
    }

    // Get user with role and permissions information
    const fullUser = await this.usersService.findOne(user.userId);

    if (!fullUser || !fullUser.role) {
      return false;
    }

    // Load role with permissions if not already loaded
    if (!fullUser.role.permissions) {
      // Reload user with permissions relation
      const userWithPermissions = await this.usersService.findOne(user.userId);
      if (!userWithPermissions?.role?.permissions) {
        return false;
      }
      fullUser.role.permissions = userWithPermissions.role.permissions;
    }

    // Get user's permission slugs
    const userPermissions = fullUser.role.permissions.map(
      (permission) => permission.slug,
    );

    // Check if user has all required permissions
    return requiredPermissions.every((permission) =>
      userPermissions.includes(permission),
    );
  }
}

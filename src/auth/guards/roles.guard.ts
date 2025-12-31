import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UsersService } from '../../users/users.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true; // No roles required, allow access
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

    // Check if user has the "super" permission - if so, grant access to everything
    if (userPermissions.includes('super')) {
      return true;
    }

    // Check if user's role slug matches any of the required roles
    return requiredRoles.includes(fullUser.role.slug);
  }
}

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { TenantContextService } from '../../database/tenant-context.service';
import { TenantDataSourceService } from '../../database/tenant-data-source.service';
import { UsersService } from '../../users/users.service';

/**
 * Guard that ensures tenant DataSource is initialized before JWT authentication
 * This runs before JwtAuthGuard to verify the clinic database is accessible
 */
@Injectable()
export class ClinicTenantGuard implements CanActivate {
  constructor(
    private tenantContextService: TenantContextService,
    private tenantDataSourceService: TenantDataSourceService,
    private usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const clinicId = request.params?.clinicId;

    // If clinicId is present in route params, verify and initialize tenant database
    if (clinicId) {
      // Get clinic user from main database
      const clinicUser = await this.usersService.findOne(+clinicId);

      if (!clinicUser) {
        throw new NotFoundException(
          `Clinic with ID ${clinicId} not found`,
        );
      }

      if (!clinicUser.database_name) {
        throw new NotFoundException(
          `Clinic database not configured for clinic ID ${clinicId}. Please ensure the clinic user has a database_name set.`,
        );
      }

      // Initialize and verify tenant DataSource before authentication
      const tenantDataSource =
        await this.tenantDataSourceService.getTenantDataSource(
          clinicUser.database_name,
        );

      if (!tenantDataSource) {
        throw new ServiceUnavailableException(
          `Failed to connect to clinic database "${clinicUser.database_name}". Please ensure the database exists and is accessible.`,
        );
      }

      // Set tenant database context
      this.tenantContextService.setTenantDatabase(clinicUser.database_name);
    }

    // Allow request to proceed to next guard (JWT auth)
    return true;
  }
}

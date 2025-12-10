import {
  Injectable,
  CanActivate,
  ExecutionContext,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TenantContextService } from '../../database/tenant-context.service';
import { TenantDataSourceService } from '../../database/tenant-data-source.service';
import { ClinicsService } from '../../clinics/clinics.service';

/**
 * Guard that ensures tenant DataSource is initialized before JWT authentication
 * This runs before JwtAuthGuard to verify the clinic database is accessible
 * Reads clinicId from JWT token if available, otherwise from route params
 */
@Injectable()
export class ClinicTenantGuard implements CanActivate {
  constructor(
    private tenantContextService: TenantContextService,
    private tenantDataSourceService: TenantDataSourceService,
    private clinicsService: ClinicsService,
    private jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Try to get clinicId from JWT token first
    let clinicId: number | undefined;
    
    // Extract token from Authorization header
    const authHeader = request.headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        // Decode token without verification (we just need clinic_id)
        const decoded = this.jwtService.decode(token) as any;
        if (decoded && decoded.clinic_id) {
          clinicId = decoded.clinic_id;
        }
      } catch (error) {
        // If token decode fails, continue to check route params
      }
    }
    
    // Fallback to route params if not found in JWT
    if (!clinicId && request.params?.clinicId) {
      clinicId = +request.params.clinicId;
    }
    
    // Also check if user object is already set (from previous guard)
    if (!clinicId && request.user?.clinic_id) {
      clinicId = request.user.clinic_id;
    }

    // If clinicId is found (from JWT or route params), verify and initialize tenant database
    if (clinicId) {
      // Get clinic from clinics table
      const clinic = await this.clinicsService.findOne(clinicId);

      if (!clinic) {
        throw new NotFoundException(
          `Clinic with ID ${clinicId} not found`,
        );
      }

      if (!clinic.database_name) {
        throw new NotFoundException(
          `Clinic database not configured for clinic ID ${clinicId}. Please ensure the clinic has a database_name set.`,
        );
      }

      // Initialize and verify tenant DataSource before authentication
      const tenantDataSource =
        await this.tenantDataSourceService.getTenantDataSource(
          clinic.database_name,
        );

      if (!tenantDataSource) {
        throw new ServiceUnavailableException(
          `Failed to connect to clinic database "${clinic.database_name}". Please ensure the database exists and is accessible.`,
        );
      }

      // Set tenant database context
      this.tenantContextService.setTenantDatabase(clinic.database_name);
      
      // Store clinicId in request for later use
      request.clinicId = clinicId;
    }

    // Allow request to proceed to next guard (JWT auth)
    return true;
  }
}

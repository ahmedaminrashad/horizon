import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository, ObjectLiteral } from 'typeorm';
import { TenantContextService } from './tenant-context.service';
import { TenantDataSourceService } from './tenant-data-source.service';

@Injectable()
export class TenantRepositoryService {
  constructor(
    @InjectDataSource()
    private defaultDataSource: DataSource,
    private tenantContextService: TenantContextService,
    private tenantDataSourceService: TenantDataSourceService,
  ) {}

  /**
   * Get repository for the current tenant context
   * Returns tenant repository if user is clinic, otherwise returns default repository
   */
  async getRepository<T extends ObjectLiteral>(
    entity: any,
  ): Promise<Repository<T>> {
    const tenantDatabase = this.tenantContextService.getTenantDatabase();

    if (tenantDatabase) {
      // Get repository from tenant database
      const tenantDataSource =
        await this.tenantDataSourceService.getTenantDataSource(tenantDatabase);
      if (tenantDataSource && tenantDataSource.isInitialized) {
        return tenantDataSource.getRepository<T>(entity);
      }
      // If tenant DataSource failed to initialize, log warning and fall back to default
      if (tenantDatabase) {
        console.warn(
          `Warning: Failed to connect to tenant database "${tenantDatabase}". Falling back to default database.`,
        );
      }
    }

    // Return default repository
    return this.defaultDataSource.getRepository<T>(entity);
  }

  /**
   * Check if current context is using a tenant database
   */
  isTenantContext(): boolean {
    return this.tenantContextService.isClinicTenant();
  }

  /**
   * Get current tenant database name
   */
  getCurrentTenantDatabase(): string | null {
    return this.tenantContextService.getTenantDatabase();
  }
}

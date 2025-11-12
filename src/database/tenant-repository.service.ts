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
      if (tenantDataSource) {
        return tenantDataSource.getRepository<T>(entity);
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

import { Injectable } from '@nestjs/common';

@Injectable()
export class TenantContextService {
  private tenantDatabase: string | null = null;
  private readonly context = new Map<string, string | null>();

  setTenantDatabase(databaseName: string | null): void {
    // Use thread/request ID for multi-request support
    // For simplicity, we'll use a single context for now
    this.tenantDatabase = databaseName;
  }

  getTenantDatabase(): string | null {
    return this.tenantDatabase;
  }

  clear(): void {
    this.tenantDatabase = null;
  }

  isClinicTenant(): boolean {
    return this.tenantDatabase !== null;
  }
}

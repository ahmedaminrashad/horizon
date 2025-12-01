import { Injectable } from '@nestjs/common';

@Injectable()
export class TenantContextService {
  private tenantDatabase: string | null = null;
  private readonly context = new Map<string, string | null>();

  setTenantDatabase(databaseName: string): void {
    // Use thread/request ID for multi-request support
    // For simplicity, we'll use a single context for now
    // Only accept non-null database names to prevent clearing the context
    if (databaseName) {
      this.tenantDatabase = databaseName;
    }
  }

  getTenantDatabase(): string | null {
    return this.tenantDatabase;
  }

  clear(): void {
    // Don't set to null, just leave context as is
    // Context will be overwritten by next request if needed
  }

  isClinicTenant(): boolean {
    return this.tenantDatabase !== null;
  }
}

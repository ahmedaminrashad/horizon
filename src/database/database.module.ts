import { Module, Global } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { TenantContextService } from './tenant-context.service';
import { TenantDataSourceService } from './tenant-data-source.service';
import { TenantRepositoryService } from './tenant-repository.service';
import { TenantInterceptor } from './tenant.interceptor';
import { ClinicMigrationService } from './clinic-migration.service';

@Global()
@Module({
  providers: [
    DatabaseService,
    TenantContextService,
    TenantDataSourceService,
    TenantRepositoryService,
    TenantInterceptor,
    ClinicMigrationService,
  ],
  exports: [
    DatabaseService,
    TenantContextService,
    TenantDataSourceService,
    TenantRepositoryService,
    TenantInterceptor,
    ClinicMigrationService,
  ],
})
export class DatabaseModule {}

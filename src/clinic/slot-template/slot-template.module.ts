import { Module } from '@nestjs/common';
import { SlotTemplateService } from './slot-template.service';
import { SlotTemplateController } from './slot-template.controller';
import { DatabaseModule } from '../../database/database.module';
import { UsersModule } from '../../users/users.module';
import { ClinicTenantGuard } from '../guards/clinic-tenant.guard';
import { ClinicPermissionsGuard } from '../guards/clinic-permissions.guard';

@Module({
  imports: [DatabaseModule, UsersModule],
  controllers: [SlotTemplateController],
  providers: [SlotTemplateService, ClinicTenantGuard, ClinicPermissionsGuard],
  exports: [SlotTemplateService],
})
export class SlotTemplateModule {}

import { Module } from '@nestjs/common';
import { ClinicSettingsService } from './settings.service';
import { ClinicSettingsController } from './settings.controller';
import { DatabaseModule } from '../../database/database.module';
import { UsersModule } from '../../users/users.module';
import { ClinicPermissionsGuard } from '../guards/clinic-permissions.guard';

@Module({
  imports: [DatabaseModule, UsersModule],
  controllers: [ClinicSettingsController],
  providers: [ClinicSettingsService, ClinicPermissionsGuard],
  exports: [ClinicSettingsService],
})
export class ClinicSettingsModule {}

import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { DoctorsModule } from './doctors/doctors.module';
import { ClinicAuthModule } from './auth/clinic-auth.module';
import { SlotTemplateModule } from './slot-template/slot-template.module';
import { ClinicSettingsModule } from './settings/settings.module';
import { ReservationsModule } from './reservations/reservations.module';
import { ClinicUsersModule } from './users/clinic-users.module';
import { ClinicTenantInterceptor } from './interceptors/clinic-tenant.interceptor';
import { DatabaseModule } from '../database/database.module';
import { UsersModule } from '../users/users.module';
import { ClinicsModule } from '../clinics/clinics.module';

@Module({
  imports: [DoctorsModule, ClinicAuthModule, SlotTemplateModule, ClinicSettingsModule, ReservationsModule, ClinicUsersModule, DatabaseModule, UsersModule, ClinicsModule],
  exports: [DoctorsModule, ClinicAuthModule, SlotTemplateModule, ClinicSettingsModule, ReservationsModule, ClinicUsersModule],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: ClinicTenantInterceptor,
    },
  ],
})
export class ClinicModule {}

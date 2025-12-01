import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { DoctorsModule } from './doctors/doctors.module';
import { ClinicAuthModule } from './auth/clinic-auth.module';
import { ClinicTenantInterceptor } from './interceptors/clinic-tenant.interceptor';
import { DatabaseModule } from '../database/database.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [DoctorsModule, ClinicAuthModule, DatabaseModule, UsersModule],
  exports: [DoctorsModule, ClinicAuthModule],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: ClinicTenantInterceptor,
    },
  ],
})
export class ClinicModule {}

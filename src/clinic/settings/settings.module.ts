import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClinicSettingsService } from './settings.service';
import { ClinicSettingsController } from './settings.controller';
import { DatabaseModule } from '../../database/database.module';
import { UsersModule } from '../../users/users.module';
import { ClinicsModule } from '../../clinics/clinics.module';
import { ClinicPermissionsGuard } from '../guards/clinic-permissions.guard';
import { ClinicTenantGuard } from '../guards/clinic-tenant.guard';

@Module({
  imports: [
    DatabaseModule,
    UsersModule,
    ClinicsModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'your-secret-key'),
        signOptions: { expiresIn: '7d' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [ClinicSettingsController],
  providers: [ClinicSettingsService, ClinicPermissionsGuard, ClinicTenantGuard],
  exports: [ClinicSettingsService],
})
export class ClinicSettingsModule {}

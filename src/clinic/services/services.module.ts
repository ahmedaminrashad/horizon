import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClinicServicesService } from './services.service';
import { ClinicServicesController } from './services.controller';
import { DatabaseModule } from '../../database/database.module';
import { ClinicPermissionsGuard } from '../guards/clinic-permissions.guard';
import { ClinicTenantGuard } from '../guards/clinic-tenant.guard';
import { ServicesModule } from '../../services/services.module';
import { ClinicsModule } from '../../clinics/clinics.module';

@Module({
  imports: [
    DatabaseModule,
    ServicesModule,
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
  controllers: [ClinicServicesController],
  providers: [ClinicServicesService, ClinicPermissionsGuard, ClinicTenantGuard],
  exports: [ClinicServicesService],
})
export class ClinicServicesModule {}

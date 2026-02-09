import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClinicRolesController } from './clinic-roles.controller';
import { ClinicRolesService } from './clinic-roles.service';
import { DatabaseModule } from '../../database/database.module';
import { ClinicsModule } from '../../clinics/clinics.module';
import { ClinicTenantGuard } from '../guards/clinic-tenant.guard';
import { ClinicPermissionsGuard } from '../guards/clinic-permissions.guard';

@Module({
  imports: [
    DatabaseModule,
    ClinicsModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'your-secret-key'),
        signOptions: { expiresIn: '7d' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [ClinicRolesController],
  providers: [ClinicRolesService, ClinicTenantGuard, ClinicPermissionsGuard],
  exports: [ClinicRolesService],
})
export class ClinicRolesModule {}

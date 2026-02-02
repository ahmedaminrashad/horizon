import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClinicUsersService } from './clinic-users.service';
import { ClinicUsersController } from './clinic-users.controller';
import { ClinicPatientsController } from './clinic-patients.controller';
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
  controllers: [ClinicUsersController, ClinicPatientsController],
  providers: [ClinicUsersService, ClinicPermissionsGuard, ClinicTenantGuard],
  exports: [ClinicUsersService],
})
export class ClinicUsersModule {}

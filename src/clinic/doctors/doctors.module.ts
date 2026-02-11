import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DoctorsService } from './doctors.service';
import { DoctorsController } from './doctors.controller';
import { DatabaseModule } from '../../database/database.module';
import { UsersModule } from '../../users/users.module';
import { RolesModule } from '../../roles/roles.module';
import { ClinicsModule } from '../../clinics/clinics.module';
import { ClinicTenantGuard } from '../guards/clinic-tenant.guard';
import { ClinicPermissionsGuard } from '../guards/clinic-permissions.guard';
import { DoctorsModule as MainDoctorsModule } from '../../doctors/doctors.module';
import { BranchesModule as MainBranchesModule } from '../../branches/branches.module';
import { WorkingHoursModule } from '../working-hours/working-hours.module';
import { DoctorServicesModule } from '../doctor-services/doctor-services.module';
import { DoctorBranchesModule } from '../doctor-branches/doctor-branches.module';
import { DoctorFilesModule } from '../doctor-files/doctor-files.module';

@Module({
  imports: [
    DatabaseModule,
    UsersModule,
    RolesModule,
    ClinicsModule,
    MainDoctorsModule,
    MainBranchesModule,
    WorkingHoursModule,
    DoctorServicesModule,
    DoctorBranchesModule,
    DoctorFilesModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'your-secret-key'),
        signOptions: { expiresIn: '7d' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [DoctorsController],
  providers: [DoctorsService, ClinicTenantGuard, ClinicPermissionsGuard],
  exports: [DoctorsService],
})
export class DoctorsModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DoctorsService } from './doctors.service';
import { DoctorTenantBranchesService } from './doctor-tenant-branches.service';
import { DoctorsController } from './doctors.controller';
import { Doctor } from './entities/doctor.entity';
import { Branch } from '../branches/entities/branch.entity';
import { Clinic } from '../clinics/entities/clinic.entity';
import { DoctorWorkingHour } from '../clinics/entities/doctor-working-hour.entity';
import { ServicesModule } from '../services/services.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Doctor, DoctorWorkingHour, Branch, Clinic]),
    ServicesModule,
  ],
  controllers: [DoctorsController],
  providers: [DoctorsService, DoctorTenantBranchesService],
  exports: [DoctorsService, DoctorTenantBranchesService],
})
export class DoctorsModule {}

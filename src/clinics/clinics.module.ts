import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClinicsService } from './clinics.service';
import { ClinicsController } from './clinics.controller';
import { Clinic } from './entities/clinic.entity';
import { ClinicWorkingHour } from './entities/clinic-working-hour.entity';
import { ClinicBreakHour } from './entities/clinic-break-hour.entity';
import { DoctorWorkingHour } from './entities/doctor-working-hour.entity';
import { Doctor } from '../doctors/entities/doctor.entity';
import { Country } from '../countries/entities/country.entity';
import { City } from '../cities/entities/city.entity';
import { Package } from '../packages/entities/package.entity';
import { DatabaseModule } from '../database/database.module';
import { UsersModule } from '../users/users.module';
import { DoctorsModule } from '../doctors/doctors.module';
import { VoipModule } from '../voip/voip.module';
import { ClinicWorkingHoursService } from './clinic-working-hours.service';
import { DoctorWorkingHoursService } from './doctor-working-hours.service';
import {
  ClinicWorkingHoursController,
  PublicWorkingHoursController,
} from './clinic-working-hours.controller';
import { DoctorWorkingHoursController } from './doctor-working-hours.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Clinic,
      ClinicWorkingHour,
      ClinicBreakHour,
      DoctorWorkingHour,
      Doctor,
      Country,
      City,
      Package,
    ]),
    DatabaseModule,
    UsersModule,
    forwardRef(() => DoctorsModule),
    VoipModule,
  ],
  controllers: [
    ClinicsController,
    ClinicWorkingHoursController,
    PublicWorkingHoursController,
    DoctorWorkingHoursController,
  ],
  providers: [
    ClinicsService,
    ClinicWorkingHoursService,
    DoctorWorkingHoursService,
  ],
  exports: [
    ClinicsService,
    ClinicWorkingHoursService,
    DoctorWorkingHoursService,
  ],
})
export class ClinicsModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClinicsService } from './clinics.service';
import { ClinicsController } from './clinics.controller';
import { Clinic } from './entities/clinic.entity';
import { ClinicWorkingHour } from './entities/clinic-working-hour.entity';
import { ClinicBreakHour } from './entities/clinic-break-hour.entity';
import { Country } from '../countries/entities/country.entity';
import { City } from '../cities/entities/city.entity';
import { Package } from '../packages/entities/package.entity';
import { DatabaseModule } from '../database/database.module';
import { UsersModule } from '../users/users.module';
import { ClinicWorkingHoursService } from './clinic-working-hours.service';
import {
  ClinicWorkingHoursController,
  PublicWorkingHoursController,
} from './clinic-working-hours.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Clinic,
      ClinicWorkingHour,
      ClinicBreakHour,
      Country,
      City,
      Package,
    ]),
    DatabaseModule,
    UsersModule,
  ],
  controllers: [
    ClinicsController,
    ClinicWorkingHoursController,
    PublicWorkingHoursController,
  ],
  providers: [ClinicsService, ClinicWorkingHoursService],
  exports: [ClinicsService, ClinicWorkingHoursService],
})
export class ClinicsModule {}

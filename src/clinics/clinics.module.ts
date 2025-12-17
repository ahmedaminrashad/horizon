import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClinicsService } from './clinics.service';
import { ClinicsController } from './clinics.controller';
import { Clinic } from './entities/clinic.entity';
import { Country } from '../countries/entities/country.entity';
import { City } from '../cities/entities/city.entity';
import { Package } from '../packages/entities/package.entity';
import { DatabaseModule } from '../database/database.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Clinic, Country, City, Package]),
    DatabaseModule,
    UsersModule,
  ],
  controllers: [ClinicsController],
  providers: [ClinicsService],
  exports: [ClinicsService],
})
export class ClinicsModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { Doctor } from '../doctors/entities/doctor.entity';
import { Clinic } from '../clinics/entities/clinic.entity';
import { Branch } from '../branches/entities/branch.entity';
import { Service } from '../services/entities/service.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Doctor, Clinic, Branch, Service])],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}


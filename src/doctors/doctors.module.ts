import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DoctorsService } from './doctors.service';
import { DoctorsController } from './doctors.controller';
import { Doctor } from './entities/doctor.entity';
import { ServicesModule } from '../services/services.module';
import { ClinicsModule } from '../clinics/clinics.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Doctor]),
    ServicesModule,
    forwardRef(() => ClinicsModule),
  ],
  controllers: [DoctorsController],
  providers: [DoctorsService],
  exports: [DoctorsService],
})
export class DoctorsModule {}

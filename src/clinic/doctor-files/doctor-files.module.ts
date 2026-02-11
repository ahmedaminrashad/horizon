import { Module } from '@nestjs/common';
import { DoctorFilesService } from './doctor-files.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [DoctorFilesService],
  exports: [DoctorFilesService],
})
export class DoctorFilesModule {}

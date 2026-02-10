import { Module } from '@nestjs/common';
import { DoctorBranchesService } from './doctor-branches.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [DoctorBranchesService],
  exports: [DoctorBranchesService],
})
export class DoctorBranchesModule {}

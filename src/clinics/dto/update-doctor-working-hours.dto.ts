import { PartialType } from '@nestjs/swagger';
import { CreateDoctorWorkingHoursDto } from './create-doctor-working-hours.dto';

export class UpdateDoctorWorkingHoursDto extends PartialType(
  CreateDoctorWorkingHoursDto,
) {}

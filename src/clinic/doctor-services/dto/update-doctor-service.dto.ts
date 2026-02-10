import { PartialType } from '@nestjs/swagger';
import { CreateDoctorServiceDto } from './create-doctor-service.dto';

export class UpdateDoctorServiceDto extends PartialType(CreateDoctorServiceDto) {}

import { PartialType } from '@nestjs/swagger';
import { CreateClinicUserDto } from './create-clinic-user.dto';

export class UpdateClinicUserDto extends PartialType(CreateClinicUserDto) {}

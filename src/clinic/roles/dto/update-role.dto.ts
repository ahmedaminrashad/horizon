import { PartialType } from '@nestjs/swagger';
import { CreateClinicRoleDto } from './create-role.dto';

export class UpdateClinicRoleDto extends PartialType(CreateClinicRoleDto) {}

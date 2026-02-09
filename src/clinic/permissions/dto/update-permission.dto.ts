import { PartialType } from '@nestjs/swagger';
import { CreateClinicPermissionDto } from './create-permission.dto';

export class UpdateClinicPermissionDto extends PartialType(
  CreateClinicPermissionDto,
) {}

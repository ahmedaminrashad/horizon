import { PartialType } from '@nestjs/swagger';
import { CreateClinicBranchDto } from './create-branch.dto';

export class UpdateClinicBranchDto extends PartialType(CreateClinicBranchDto) {}

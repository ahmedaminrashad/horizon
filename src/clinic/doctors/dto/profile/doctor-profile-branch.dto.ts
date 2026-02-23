import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DoctorProfileBranchInfoDto } from './doctor-profile-branch-info.dto';

export class DoctorProfileBranchDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  doctor_id: number;

  @ApiProperty({ example: 1 })
  branch_id: number;

  @ApiPropertyOptional({ type: () => DoctorProfileBranchInfoDto })
  branch?: DoctorProfileBranchInfoDto;
}

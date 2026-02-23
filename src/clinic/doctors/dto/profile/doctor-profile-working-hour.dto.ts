import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DoctorProfileWorkingHourBranchDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Main Branch' })
  name: string;
}

export class DoctorProfileWorkingHourDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'MONDAY' })
  day: string;

  @ApiProperty({ example: '09:00:00' })
  start_time: string;

  @ApiProperty({ example: '17:00:00' })
  end_time: string;

  @ApiPropertyOptional({ nullable: true, example: 1 })
  branch_id: number | null;

  @ApiPropertyOptional({ type: () => DoctorProfileWorkingHourBranchDto })
  branch?: DoctorProfileWorkingHourBranchDto;

  @ApiProperty({ example: true })
  is_active: boolean;

  @ApiProperty({ example: true })
  waterfall: boolean;

  @ApiPropertyOptional({ nullable: true, example: 10 })
  patients_limit: number | null;
}

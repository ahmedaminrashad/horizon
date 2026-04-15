import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DoctorProfileBranchInfoDto } from './doctor-profile-branch-info.dto';
import { DayOfWeek } from '../../../working-hours/entities/working-hour.entity';

export class DoctorProfileBranchDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  doctor_id: number;

  @ApiProperty({ example: 1 })
  branch_id: number;

  @ApiPropertyOptional({ enum: DayOfWeek })
  week_start_day?: DayOfWeek | null;

  @ApiPropertyOptional({ enum: DayOfWeek })
  week_end_day?: DayOfWeek | null;

  @ApiPropertyOptional({ example: '09:00:00' })
  from_time?: string | null;

  @ApiPropertyOptional({ example: '17:00:00' })
  to_time?: string | null;

  @ApiPropertyOptional({
    description: 'Optional fee for this doctor at this branch',
    example: 200.5,
    nullable: true,
  })
  fees?: number | null;

  @ApiPropertyOptional({ type: () => DoctorProfileBranchInfoDto })
  branch?: DoctorProfileBranchInfoDto;
}

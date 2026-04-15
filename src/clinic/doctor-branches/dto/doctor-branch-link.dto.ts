import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsEnum,
  IsString,
  Matches,
  Min,
} from 'class-validator';
import { DayOfWeek } from '../../working-hours/entities/working-hour.entity';

export class DoctorBranchLinkDto {
  @ApiProperty({ description: 'Clinic branch id', example: 1 })
  @IsNumber()
  branch_id: number;

  @ApiPropertyOptional({
    description: 'Week range start day for this doctor at this branch',
    enum: DayOfWeek,
    example: DayOfWeek.SUNDAY,
  })
  @IsOptional()
  @IsEnum(DayOfWeek)
  week_start_day?: DayOfWeek;

  @ApiPropertyOptional({
    description: 'Week range end day',
    enum: DayOfWeek,
    example: DayOfWeek.THURSDAY,
  })
  @IsOptional()
  @IsEnum(DayOfWeek)
  week_end_day?: DayOfWeek;

  @ApiPropertyOptional({
    description: 'Daily window start (24h), e.g. 09:00:00',
    example: '09:00:00',
  })
  @IsOptional()
  @IsString()
  @Matches(/^([01]?\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, {
    message: 'from_time must be HH:mm or HH:mm:ss',
  })
  from_time?: string;

  @ApiPropertyOptional({
    description: 'Daily window end (24h), e.g. 17:00:00',
    example: '17:00:00',
  })
  @IsOptional()
  @IsString()
  @Matches(/^([01]?\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, {
    message: 'to_time must be HH:mm or HH:mm:ss',
  })
  to_time?: string;

  @ApiPropertyOptional({
    description: 'Optional fee for this doctor at this branch',
    example: 200.5,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  fees?: number | null;
}

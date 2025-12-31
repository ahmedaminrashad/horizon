import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsArray,
  ValidateNested,
  IsNotEmpty,
  ArrayMinSize,
  IsOptional,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DayOfWeek } from '../entities/working-hour.entity';
import { TimeRangeDto } from './time-range.dto';

/**
 * Break hours for a single day
 */
export class DayBreakHoursDto {
  @ApiProperty({
    description: 'Day of the week',
    enum: DayOfWeek,
    example: DayOfWeek.MONDAY,
  })
  @IsEnum(DayOfWeek)
  @IsNotEmpty()
  day: DayOfWeek;

  @ApiProperty({
    description: 'Break time ranges for this day (supports multiple breaks)',
    type: [TimeRangeDto],
    example: [
      { start_time: '13:00:00', end_time: '14:00:00' },
    ],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one break range is required' })
  @ValidateNested({ each: true })
  @Type(() => TimeRangeDto)
  break_ranges: TimeRangeDto[];
}

/**
 * DTO for creating/updating clinic break hours
 */
export class CreateBreakHoursDto {
  @ApiPropertyOptional({
    description:
      'Branch ID (optional). If provided, break hours will be specific to this branch. ' +
      'If omitted or null, break hours will be clinic-wide and apply to all branches.',
    type: Number,
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  branch_id?: number;

  @ApiProperty({
    description: 'Break hours for each day of the week',
    type: [DayBreakHoursDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DayBreakHoursDto)
  days: DayBreakHoursDto[];
}


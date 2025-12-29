import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsArray,
  ValidateNested,
  IsNotEmpty,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DayOfWeek } from '../entities/clinic-working-hour.entity';
import { TimeRangeDto } from '../../clinic/working-hours/dto/time-range.dto';

/**
 * Working hours for a single day
 */
export class DayWorkingHoursDto {
  @ApiProperty({
    description: 'Day of the week',
    enum: DayOfWeek,
    example: DayOfWeek.MONDAY,
  })
  @IsEnum(DayOfWeek)
  @IsNotEmpty()
  day: DayOfWeek;

  @ApiProperty({
    description: 'Working time ranges for this day (supports multiple ranges)',
    type: [TimeRangeDto],
    example: [
      { start_time: '09:00:00', end_time: '13:00:00' },
      { start_time: '14:00:00', end_time: '18:00:00' },
    ],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one working range is required' })
  @ValidateNested({ each: true })
  @Type(() => TimeRangeDto)
  working_ranges: TimeRangeDto[];
}

/**
 * DTO for creating/updating clinic default working hours
 */
export class CreateClinicWorkingHoursDto {
  @ApiProperty({
    description: 'Working hours for each day of the week',
    type: [DayWorkingHoursDto],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one day must be specified' })
  @ValidateNested({ each: true })
  @Type(() => DayWorkingHoursDto)
  days: DayWorkingHoursDto[];
}


import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsString,
  Matches,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsInt,
  IsNumber,
  Min,
} from 'class-validator';
import { DayOfWeek } from '../entities/clinic-working-hour.entity';

/**
 * DTO for creating/updating doctor working hours in main database
 */
export class CreateDoctorWorkingHoursDto {
  @ApiProperty({
    description: 'Day of the week for this slot',
    enum: DayOfWeek,
    example: DayOfWeek.MONDAY,
  })
  @IsEnum(DayOfWeek)
  @IsNotEmpty()
  day: DayOfWeek;

  @ApiProperty({
    description: 'Branch ID (optional; omit for all branches)',
    type: Number,
    required: false,
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  branch_id?: number;

  @ApiProperty({
    description: 'Slot start time (HH:MM:SS)',
    example: '09:00:00',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/, {
    message: 'start_time must be in HH:MM:SS format',
  })
  start_time: string;

  @ApiProperty({
    description: 'Slot end time (HH:MM:SS)',
    example: '17:00:00',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/, {
    message: 'end_time must be in HH:MM:SS format',
  })
  end_time: string;

  @ApiProperty({
    description: 'Session duration HH:MM:SS (e.g. 00:30:00 for 30 min)',
    example: '00:30:00',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/, {
    message: 'session_time must be in HH:MM:SS format',
  })
  session_time?: string;

  @ApiProperty({
    description: 'Whether the slot is active',
    type: Boolean,
    default: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiProperty({
    description:
      'Waterfall: if true, appointments use next available slot within the range',
    type: Boolean,
    default: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  waterfall?: boolean;

  @ApiProperty({
    description: 'Fees for this slot (optional)',
    type: Number,
    example: 100.5,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  fees?: number;

  @ApiProperty({
    description: 'Whether the slot is marked busy',
    type: Boolean,
    default: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  busy?: boolean;

  @ApiProperty({
    description:
      'Max patients for this slot; default 1 when waterfall is false',
    type: Number,
    required: false,
    example: 5,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  patients_limit?: number;
}

/**
 * DTO for bulk creating doctor working hours (main DB)
 */
export class CreateBulkDoctorWorkingHoursDto {
  @ApiProperty({
    description: 'Doctor ID (main database)',
    type: Number,
    example: 1,
  })
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  doctor_id: number;

  @ApiProperty({
    description: 'Array of working hour items (each with day, start_time, end_time, etc.)',
    type: [CreateDoctorWorkingHoursDto],
    isArray: true,
  })
  @IsNotEmpty()
  working_hours: CreateDoctorWorkingHoursDto[];
}


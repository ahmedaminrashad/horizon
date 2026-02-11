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
import { DayOfWeek } from '../entities/working-hour.entity';
import { AppointType } from '../../doctors/entities/doctor.entity';

/**
 * DTO for creating/updating doctor working hours (clinic tenant)
 */
export class ClinicCreateDoctorWorkingHoursDto {
  @ApiProperty({
    description: 'Day of the week',
    enum: DayOfWeek,
    example: DayOfWeek.MONDAY,
  })
  @IsEnum(DayOfWeek)
  @IsNotEmpty()
  day: DayOfWeek;

  @ApiProperty({
    description: 'Branch ID (optional, null for all branches)',
    type: Number,
    required: false,
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  branch_id?: number;

  @ApiProperty({
    description: 'Start time in HH:MM:SS format',
    example: '09:00:00',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/, {
    message: 'start_time must be in HH:MM:SS format',
  })
  start_time: string;

  @ApiProperty({
    description: 'End time in HH:MM:SS format',
    example: '17:00:00',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/, {
    message: 'end_time must be in HH:MM:SS format',
  })
  end_time: string;

  @ApiProperty({
    description: 'Break start time in HH:MM:SS format (must be within start_time–end_time)',
    example: '13:00:00',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/, {
    message: 'break_hours_from must be in HH:MM:SS format',
  })
  break_hours_from?: string;

  @ApiProperty({
    description: 'Break end time in HH:MM:SS format (must be within start_time–end_time, after break_hours_from)',
    example: '14:00:00',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/, {
    message: 'break_hours_to must be in HH:MM:SS format',
  })
  break_hours_to?: string;

  @ApiProperty({
    description:
      'Session duration in HH:MM:SS format (e.g., 00:30:00 for 30 minutes)',
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
    description: 'Whether this working hour is active',
    type: Boolean,
    default: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiProperty({
    description:
      'Waterfall scheduling: if true, appointments cascade to next available slot',
    type: Boolean,
    default: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  waterfall?: boolean;

  @ApiProperty({
    description: 'Whether this working hour slot is busy',
    type: Boolean,
    default: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  busy?: boolean;

  @ApiProperty({
    description: 'Maximum number of patients allowed for this slot. If not provided, will be set to 1 when waterfall is false.',
    type: Number,
    required: false,
    example: 5,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  patients_limit?: number;

  @ApiProperty({
    description: 'Appointment type: in-clinic, online, or home',
    enum: AppointType,
    required: false,
    example: AppointType.IN_CLINIC,
  })
  @IsOptional()
  @IsEnum(AppointType)
  appoint_type?: AppointType;

  @ApiProperty({
    description:
      'Doctor service ID (from doctor_services) to associate with this working hour',
    type: Number,
    required: false,
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  doctor_service_id?: number;
}

/**
 * DTO for bulk creating doctor working hours
 */
export class CreateBulkDoctorWorkingHoursDto {
  @ApiProperty({
    description: 'Doctor ID',
    type: Number,
    example: 1,
  })
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  doctor_id: number;

  @ApiProperty({
    description: 'Array of working hours to create',
    type: [ClinicCreateDoctorWorkingHoursDto],
  })
  @IsNotEmpty()
  working_hours: ClinicCreateDoctorWorkingHoursDto[];
}

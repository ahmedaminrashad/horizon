import { IsInt, IsDateString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AppointType } from '../../doctors/entities/doctor.entity';

export class CreateReservationDto {
  @ApiProperty({ example: 1, description: 'Doctor ID' })
  @IsInt()
  doctor_id: number;

  @ApiProperty({
    example: 1,
    description: 'Doctor working hour ID (required)',
  })
  @IsInt()
  doctor_working_hour_id: number;

  @ApiProperty({
    example: '2024-01-15',
    description: 'Reservation date (time will be taken from working hour)',
  })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Clinic user ID (clinic DB users.id). When provided, used as reservation patient; otherwise uses authenticated user.',
  })
  @IsOptional()
  @IsInt()
  clinic_user_id?: number;

  @ApiPropertyOptional({
    description: 'Appointment type: in-clinic, online, or home',
    enum: AppointType,
    example: AppointType.IN_CLINIC,
  })
  @IsOptional()
  @IsEnum(AppointType)
  appoint_type?: AppointType;
}

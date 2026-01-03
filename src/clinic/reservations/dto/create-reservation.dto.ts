import {
  IsInt,
  IsNumber,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReservationStatus } from '../entities/reservation.entity';

export class CreateReservationDto {
  @ApiProperty({ example: 1, description: 'Doctor ID' })
  @IsInt()
  doctor_id: number;

  @ApiProperty({ example: 1, description: 'Patient ID' })
  @IsInt()
  patient_id: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Doctor working hour ID (optional)',
  })
  @IsOptional()
  @IsInt()
  doctor_working_hour_id?: number;

  @ApiProperty({ example: 100.5, description: 'Reservation fees' })
  @IsNumber()
  @Min(0)
  fees: number;

  @ApiPropertyOptional({
    example: false,
    description: 'Whether fees are paid',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  paid?: boolean;

  @ApiProperty({
    example: '2024-01-15T10:00:00',
    description: 'Reservation date and time',
  })
  @IsDateString()
  date_time: string;

  @ApiPropertyOptional({
    example: ReservationStatus.PENDING,
    description: 'Reservation status',
    enum: ReservationStatus,
    default: ReservationStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(ReservationStatus)
  status?: ReservationStatus;
}

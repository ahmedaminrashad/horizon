import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsInt,
  IsDateString,
  IsEnum,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from './pagination-query.dto';
import { ReservationStatus, MedicalStatus } from '../entities/reservation.entity';
import { AppointType } from '../../doctors/entities/doctor.entity';

export class ReservationsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Search by patient name or phone number',
    example: 'ahmed',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter reservations from this date (inclusive)',
    example: '2025-01-01',
  })
  @IsOptional()
  @IsDateString()
  from_date?: string;

  @ApiPropertyOptional({
    description: 'Filter reservations to this date (inclusive)',
    example: '2025-12-31',
  })
  @IsOptional()
  @IsDateString()
  to_date?: string;

  @ApiPropertyOptional({
    description: 'Filter by doctor ID',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  doctor_id?: number;

  @ApiPropertyOptional({
    description: 'Filter by service ID (doctor service linked to working hour)',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  service_id?: number;

  @ApiPropertyOptional({
    description: 'Filter by reservation status',
    enum: ReservationStatus,
    example: ReservationStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(ReservationStatus)
  status?: ReservationStatus;

  @ApiPropertyOptional({
    description: 'Filter by schedule mode: waterfall or fixed',
    enum: ['waterfall', 'fixed'],
    example: 'waterfall',
  })
  @IsOptional()
  @IsIn(['waterfall', 'fixed'])
  schedule_type?: 'waterfall' | 'fixed';

  @ApiPropertyOptional({
    description: 'Filter by appointment type',
    enum: AppointType,
    example: AppointType.IN_CLINIC,
  })
  @IsOptional()
  @IsEnum(AppointType)
  appoint_type?: AppointType;

  @ApiPropertyOptional({
    description: 'Filter by medical status',
    enum: MedicalStatus,
    example: MedicalStatus.CONFIRMED,
  })
  @IsOptional()
  @IsEnum(MedicalStatus)
  medical_status?: MedicalStatus;
}

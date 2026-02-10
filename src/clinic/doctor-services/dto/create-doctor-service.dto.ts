import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNumber,
  IsEnum,
  IsOptional,
  Min,
} from 'class-validator';
import { DoctorServiceType } from '../entities/doctor-service.entity';

export class CreateDoctorServiceDto {
  @ApiProperty({ description: 'Service ID', example: 1 })
  @IsInt()
  service_id: number;

  @ApiProperty({ description: 'Doctor ID', example: 1 })
  @IsInt()
  doctor_id: number;

  @ApiPropertyOptional({ description: 'Duration in minutes', example: 30 })
  @IsOptional()
  @IsInt()
  @Min(1)
  duration?: number | null;

  @ApiPropertyOptional({ description: 'Price', example: 100.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number | null;

  @ApiPropertyOptional({
    description: 'Service type',
    enum: DoctorServiceType,
  })
  @IsOptional()
  @IsEnum(DoctorServiceType)
  service_type?: DoctorServiceType | null;
}

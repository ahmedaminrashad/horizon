import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { AppointType } from '../../doctors/entities/doctor.entity';

export class SearchQueryDto {
  @ApiPropertyOptional({
    description: 'Search term for doctor name, clinic name, specialty, or service name',
    example: 'Dr. Ahmed',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'City ID to filter results',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  city_id?: number;

  @ApiPropertyOptional({
    description: 'Area/Branch ID to filter results',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  area_id?: number;

  @ApiPropertyOptional({
    description: 'Appointment type',
    enum: AppointType,
    example: AppointType.IN_CLINIC,
  })
  @IsOptional()
  @IsEnum(AppointType)
  appoint_type?: AppointType;

  @ApiPropertyOptional({
    description: 'Language spoken by doctor',
    example: 'English',
  })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({
    description: 'Doctor gender',
    example: 'male',
  })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({
    description: 'Number of results per page',
    example: 10,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;
}


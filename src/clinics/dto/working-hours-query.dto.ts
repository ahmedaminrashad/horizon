import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsEnum, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { DayOfWeek } from '../entities/clinic-working-hour.entity';

export class WorkingHoursQueryDto {
  @ApiPropertyOptional({
    description: 'Clinic ID to filter working hours',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  clinic_id?: number;

  @ApiPropertyOptional({
    description: 'Day of the week to filter working hours',
    enum: DayOfWeek,
    example: DayOfWeek.MONDAY,
  })
  @IsOptional()
  @IsEnum(DayOfWeek)
  day?: DayOfWeek;

  @ApiPropertyOptional({
    description: 'Start time filter (HH:MM:SS format)',
    example: '09:00:00',
  })
  @IsOptional()
  @IsString()
  start_time?: string;

  @ApiPropertyOptional({
    description: 'End time filter (HH:MM:SS format)',
    example: '17:00:00',
  })
  @IsOptional()
  @IsString()
  end_time?: string;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: 'Number of results per page',
    example: 10,
    default: 10,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;
}


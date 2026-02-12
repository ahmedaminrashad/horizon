import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  Min,
} from 'class-validator';
import { ServiceType } from '../entities/service.entity';

export class CreateServiceDto {
  @ApiProperty({
    description: 'Service name',
    example: 'General Consultation',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Service category',
    example: 'Medical Consultation',
  })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({
    description: 'Service specialty',
    example: 'Cardiology',
  })
  @IsString()
  @IsOptional()
  specialty?: string;

  @ApiPropertyOptional({
    description: 'Required degree for matching doctors',
    example: 'MD',
  })
  @IsString()
  @IsOptional()
  degree?: string;

  @ApiPropertyOptional({
    description: 'Service type',
    enum: ServiceType,
    example: ServiceType.CONSULTATION,
  })
  @IsEnum(ServiceType)
  @IsOptional()
  type?: ServiceType;

  @ApiPropertyOptional({
    description: 'Default duration in minutes',
    example: 30,
    minimum: 1,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  default_duration_minutes?: number;

  @ApiPropertyOptional({
    description: 'Default price',
    example: 150,
    minimum: 0,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  default_price?: number;

  @ApiPropertyOptional({
    description: 'Currency code',
    example: 'USD',
  })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({
    description: 'Whether the service is active',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @ApiPropertyOptional({
    description:
      'Waterfall scheduling: if true, appointments cascade to next available slot; if false, fixed slots.',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  waterfall?: boolean;
}

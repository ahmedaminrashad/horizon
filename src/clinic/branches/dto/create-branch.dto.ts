import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  Max,
} from 'class-validator';

export class CreateClinicBranchDto {
  @ApiProperty({ description: 'Branch name', example: 'Downtown Branch' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Latitude coordinate',
    example: 40.7128,
    minimum: -90,
    maximum: 90,
  })
  @IsNumber()
  @IsOptional()
  @Min(-90)
  @Max(90)
  lat?: number;

  @ApiPropertyOptional({
    description: 'Longitude coordinate',
    example: -74.006,
    minimum: -180,
    maximum: 180,
  })
  @IsNumber()
  @IsOptional()
  @Min(-180)
  @Max(180)
  longit?: number;

  @ApiPropertyOptional({
    description: 'Country ID',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  country_id?: number;

  @ApiPropertyOptional({
    description: 'City ID',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  city_id?: number;

  @ApiPropertyOptional({
    description: 'Branch address',
    example: '123 Main Street, City, Country',
  })
  @IsOptional()
  @IsString()
  address?: string;
}

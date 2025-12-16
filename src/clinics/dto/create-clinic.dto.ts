import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsOptional,
  IsNumber,
  IsArray,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';

export class CreateClinicDto {
  @ApiProperty({ description: 'Clinic name', example: 'City Medical Center' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Clinic email address',
    example: 'clinic@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'Clinic phone number', example: '+1234567890' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiPropertyOptional({
    description: 'Clinic image file path',
    example: 'uploads/clinics/clinic-1234567890.jpg',
  })
  @IsString()
  @IsOptional()
  image?: string;

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
    description: 'List of departments offered by the clinic',
    example: ['CARDIOLOGY', 'NEUROLOGY', 'PEDIATRICS'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  departments?: string[];

  @ApiPropertyOptional({
    description: 'Whether the clinic is active',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

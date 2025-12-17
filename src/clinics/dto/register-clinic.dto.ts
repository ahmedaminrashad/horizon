import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsOptional,
  IsNumber,
  IsArray,
  Min,
  Max,
  MinLength,
} from 'class-validator';

export class RegisterClinicDto {
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

  @ApiProperty({
    description: 'Password for clinic account',
    example: 'password123',
    minLength: 6,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

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
    description: 'Clinic owner information',
    example: 'Dr. John Smith',
  })
  @IsOptional()
  @IsString()
  owner?: string;

  @ApiPropertyOptional({
    description: 'Clinic address',
    example: '123 Main Street, City, Country',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    description: 'WhatsApp number',
    example: '+1234567890',
  })
  @IsOptional()
  @IsString()
  wa_number?: string;

  @ApiPropertyOptional({
    description: 'Clinic biography/description',
    example: 'A leading medical center providing comprehensive healthcare services.',
  })
  @IsOptional()
  @IsString()
  bio?: string;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsOptional,
  MinLength,
  IsNumber,
  IsEnum,
  IsArray,
  ValidateNested,
  IsBoolean,
  Min,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Department, AppointType } from '../entities/doctor.entity';
import { DoctorServiceItemDto } from '../../doctor-services/dto/doctor-service-item.dto';

export class RegisterDoctorDto {
  @ApiPropertyOptional({ description: 'Doctor name', example: 'Dr. John Doe' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ description: 'Doctor phone number', example: '+1234567890' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiPropertyOptional({
    description: 'Doctor email address',
    example: 'doctor@example.com',
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({
    description: 'Doctor password',
    example: 'password123',
    minLength: 6,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({
    description: 'Doctor age (optional if date_of_birth is provided; then age is calculated)',
    example: 35,
  })
  @IsNumber()
  @IsOptional()
  age?: number;

  @ApiPropertyOptional({
    description: 'Date of birth (YYYY-MM-DD). When provided, age is calculated in the backend.',
    example: '1990-05-15',
  })
  @IsOptional()
  @IsDateString()
  date_of_birth?: string;

  @ApiPropertyOptional({ description: 'Gender', example: 'male' })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional({
    description: 'Second phone number',
    example: '+201234567890',
  })
  @IsOptional()
  @IsString()
  second_phone?: string;

  @ApiProperty({
    description: 'Doctor department',
    enum: Department,
    example: Department.CARDIOLOGY,
  })
  @IsEnum(Department)
  @IsNotEmpty()
  department: Department;

  @ApiPropertyOptional({
    description: 'Doctor avatar path (set automatically when avatar file is uploaded)',
    example: '/uploads/avatars/doctor-avatar-123.jpg',
  })
  @IsString()
  @IsOptional()
  avatar?: string;

  @ApiPropertyOptional({
    description: 'Doctor license number',
    example: 'LIC123456',
  })
  @IsString()
  @IsOptional()
  license_number?: string;

  @ApiPropertyOptional({
    description: 'Doctor degree',
    example: 'MD, PhD',
  })
  @IsString()
  @IsOptional()
  degree?: string;

  @ApiPropertyOptional({
    description: 'Languages spoken (comma-separated or JSON)',
    example: 'English, Arabic, French',
  })
  @IsString()
  @IsOptional()
  languages?: string;

  @ApiPropertyOptional({
    description: 'Doctor biography',
    example: 'Experienced cardiologist with 10 years of practice.',
  })
  @IsString()
  @IsOptional()
  bio?: string;

  @ApiPropertyOptional({
    description: 'Appointment types (multi-select): in-clinic, online, home',
    enum: AppointType,
    isArray: true,
    example: [AppointType.IN_CLINIC, AppointType.ONLINE],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(AppointType, { each: true })
  appointment_types?: AppointType[];

  @ApiPropertyOptional({
    description: 'Whether the doctor is active',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @ApiPropertyOptional({
    description: 'Branch IDs to associate the doctor with (creates doctor_branches links)',
    type: 'array',
    items: { type: 'number' },
    example: [1, 2],
  })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  doctor_branches?: number[];

  @ApiPropertyOptional({
    description: 'Years of experience',
    example: 10,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  experience_years?: number;

  @ApiPropertyOptional({
    description: 'Number of patients',
    example: 500,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  number_of_patients?: number;

  @ApiPropertyOptional({
    description: 'Doctor services: service_id, duration (minutes), price, service_type',
    type: DoctorServiceItemDto,
    isArray: true,
    example: [
      { service_id: 1, duration: 30, price: 100.5, service_type: 'consultation' },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DoctorServiceItemDto)
  doctor_services?: DoctorServiceItemDto[];
}

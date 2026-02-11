import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  Min,
  Max,
  IsArray,
  ValidateNested,
  IsString,
  IsDateString,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Department, AppointType } from '../entities/doctor.entity';
import { DoctorServiceItemDto } from '../../doctor-services/dto/doctor-service-item.dto';

export class CreateDoctorDto {
  @ApiPropertyOptional({
    description: 'Doctor age (computed from date_of_birth if that is provided)',
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

  @ApiPropertyOptional({
    description: 'Gender',
    example: 'male',
  })
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
    description: 'Doctor rating (0.00 to 5.00)',
    example: 4.5,
    minimum: 0,
    maximum: 5,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(5)
  rate?: number;

  @ApiPropertyOptional({
    description: 'Doctor avatar file path',
    example: 'uploads/avatars/doctor-1234567890.jpg',
  })
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

  @ApiProperty({
    description: 'User ID associated with the doctor',
    example: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  user_id: number;

  @ApiPropertyOptional({
    description: 'Clinic ID (set from URL /api/clinic/{clinicId}/doctors if omitted)',
    example: 1,
  })
  @IsNumber()
  @IsOptional()
  clinic_id?: number;

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

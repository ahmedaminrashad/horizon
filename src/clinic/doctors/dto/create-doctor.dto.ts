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
  Matches,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Department, AppointType } from '../entities/doctor.entity';
import { DoctorServiceItemDto } from '../../doctor-services/dto/doctor-service-item.dto';

export class CreateDoctorDto {
  @ApiProperty({
    description: 'Doctor age',
    example: 35,
  })
  @IsNumber()
  @IsNotEmpty()
  age: number;

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
    description: 'Appointment type',
    enum: AppointType,
    example: AppointType.IN_CLINIC,
  })
  @IsEnum(AppointType)
  @IsOptional()
  appoint_type?: AppointType;

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

  @ApiProperty({
    description: 'Clinic ID',
    example: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  clinic_id: number;

  @ApiPropertyOptional({
    description: 'Branch ID',
    example: 1,
  })
  @IsNumber()
  @IsOptional()
  branch_id?: number;

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
    description: 'Doctor services (service_id, duration, price, service_type)',
    type: 'array',
    items: { type: 'object' },
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DoctorServiceItemDto)
  doctor_services?: DoctorServiceItemDto[];
}

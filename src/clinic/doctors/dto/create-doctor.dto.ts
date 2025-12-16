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
    description: 'Array of slot templates for this doctor',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        duration: {
          type: 'string',
          example: '00:30:00',
          description: 'Duration in TIME format (HH:MM:SS)',
        },
        cost: {
          type: 'number',
          example: 100.50,
          description: 'Cost of the slot',
        },
        days: {
          type: 'string',
          example: 'MONDAY,TUESDAY,WEDNESDAY',
          description: 'Days of the week (comma-separated)',
        },
      },
    },
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SlotTemplateDto)
  slotTemplates?: SlotTemplateDto[];
}

class SlotTemplateDto {
  @ApiProperty({
    description: 'Duration of the slot in TIME format (HH:MM:SS)',
    example: '00:30:00',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^([0-1]\d|2[0-3]):[0-5]\d:[0-5]\d$/, {
    message: 'Duration must be in TIME format (HH:MM:SS)',
  })
  duration: string;

  @ApiProperty({
    description: 'Cost of the slot',
    example: 100.50,
    type: Number,
  })
  @IsNumber()
  @IsNotEmpty()
  cost: number;

  @ApiProperty({
    description:
      'Days of the week (comma-separated: MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY,SATURDAY,SUNDAY)',
    example: 'MONDAY,TUESDAY,WEDNESDAY',
  })
  @IsString()
  @IsNotEmpty()
  days: string;
}

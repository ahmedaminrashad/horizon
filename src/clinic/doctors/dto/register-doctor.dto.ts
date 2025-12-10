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
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Department } from '../entities/doctor.entity';

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

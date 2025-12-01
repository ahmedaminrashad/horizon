import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsOptional,
  MinLength,
  IsNumber,
  IsEnum,
} from 'class-validator';
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
}

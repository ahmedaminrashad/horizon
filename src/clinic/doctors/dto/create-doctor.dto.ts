import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsNotEmpty, IsEnum, IsOptional, Min, Max } from 'class-validator';
import { Department } from '../entities/doctor.entity';

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
}

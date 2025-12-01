import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
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

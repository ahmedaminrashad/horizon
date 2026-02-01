import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEnum,
  Min,
} from 'class-validator';
import { AppointType } from '../../doctors/entities/doctor.entity';

export class CreateQuestionSetAssignmentDto {
  @ApiProperty({
    description: 'Question set ID',
    example: 1,
  })
  @IsInt()
  @IsNotEmpty()
  question_set_id: number;

  @ApiPropertyOptional({
    description: 'Doctor ID (assign to specific doctor)',
    example: 1,
  })
  @IsInt()
  @IsOptional()
  doctor_id?: number;

  @ApiPropertyOptional({
    description: 'Service ID (assign to specific service)',
    example: 1,
  })
  @IsInt()
  @IsOptional()
  service_id?: number;

  @ApiPropertyOptional({
    description: 'Specialty name (assign to all doctors with this specialty)',
    example: 'Cardiology',
  })
  @IsString()
  @IsOptional()
  specialty?: string;

  @ApiPropertyOptional({
    description: 'Visit type (in-clinic, online, home)',
    enum: AppointType,
    example: AppointType.IN_CLINIC,
  })
  @IsEnum(AppointType)
  @IsOptional()
  appoint_type?: AppointType;

  @ApiPropertyOptional({
    description: 'Branch ID (assign to specific branch)',
    example: 1,
  })
  @IsInt()
  @IsOptional()
  branch_id?: number;

  @ApiPropertyOptional({
    description: 'Priority (higher = more specific). Service(5) > Doctor(4) > Specialty(3) > VisitType(2) > Branch(1)',
    default: 0,
    minimum: 0,
    maximum: 5,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  priority?: number;
}

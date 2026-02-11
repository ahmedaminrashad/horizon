import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
} from 'class-validator';

export class CreatePatientQuestionAnswerDto {
  @ApiProperty({
    description: 'Clinic ID (tenant context for this answer)',
    example: 1,
  })
  @IsInt()
  clinic_id: number;

  @ApiPropertyOptional({
    description: 'Patient (user) ID. Required for public requests; when authenticated, taken from token.',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  patient_id?: number;

  @ApiProperty({
    description: 'Question ID (doctor_id is taken from the question)',
    example: 1,
  })
  @IsInt()
  question_id: number;

  @ApiPropertyOptional({
    description: 'Yes/no answer',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  is_answer_yes?: boolean | null;

  @ApiPropertyOptional({
    description: 'Comment',
    example: 'No allergies known',
  })
  @IsOptional()
  @IsString()
  comment?: string | null;
}

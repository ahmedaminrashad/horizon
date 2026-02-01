import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsArray,
  IsInt,
  Min,
} from 'class-validator';

export class CreateQuestionDto {
  @ApiProperty({
    description: 'Question text',
    example: 'Do you have any allergies?',
  })
  @IsString()
  @IsNotEmpty()
  question_text: string;

  @ApiPropertyOptional({
    description: 'Question type',
    enum: ['text', 'textarea', 'select', 'radio', 'checkbox', 'number', 'date'],
    default: 'text',
  })
  @IsEnum(['text', 'textarea', 'select', 'radio', 'checkbox', 'number', 'date'])
  @IsOptional()
  question_type?: string;

  @ApiPropertyOptional({
    description: 'Options for select/radio/checkbox questions',
    example: ['Option 1', 'Option 2', 'Option 3'],
    type: [String],
  })
  @IsArray()
  @IsOptional()
  options?: string[];

  @ApiPropertyOptional({
    description: 'Whether the question is required',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  is_required?: boolean;

  @ApiPropertyOptional({
    description: 'Display order',
    default: 0,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  order?: number;
}

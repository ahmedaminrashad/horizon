import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsNotEmpty } from 'class-validator';

export class CreateQuestionDto {
  @ApiProperty({
    description: 'Doctor ID',
    example: 1,
  })
  @IsNumber()
  doctor_id: number;

  @ApiProperty({
    description: 'Question content in English',
    example: 'Do you have any allergies?',
  })
  @IsString()
  @IsNotEmpty()
  content_en: string;

  @ApiProperty({
    description: 'Question content in Arabic',
    example: 'هل لديك أي حساسية؟',
  })
  @IsString()
  @IsNotEmpty()
  content_ar: string;
}

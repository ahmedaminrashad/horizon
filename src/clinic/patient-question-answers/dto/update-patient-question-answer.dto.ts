import { PartialType } from '@nestjs/swagger';
import { CreatePatientQuestionAnswerDto } from './create-patient-question-answer.dto';

export class UpdatePatientQuestionAnswerDto extends PartialType(
  CreatePatientQuestionAnswerDto,
) {}

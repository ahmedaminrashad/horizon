import { PartialType } from '@nestjs/swagger';
import { CreateQuestionSetAssignmentDto } from './create-question-set-assignment.dto';

export class UpdateQuestionSetAssignmentDto extends PartialType(
  CreateQuestionSetAssignmentDto,
) {}

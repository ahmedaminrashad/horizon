import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestionSetsService } from './question-sets.service';
import { QuestionSetsController } from './question-sets.controller';
import { QuestionSet } from './entities/question-set.entity';
import { Question } from './entities/question.entity';
import { QuestionSetAssignment } from './entities/question-set-assignment.entity';
import { Doctor } from '../doctors/entities/doctor.entity';
import { Service } from '../services/entities/service.entity';
import { Branch } from '../branches/entities/branch.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      QuestionSet,
      Question,
      QuestionSetAssignment,
      Doctor,
      Service,
      Branch,
    ]),
  ],
  controllers: [QuestionSetsController],
  providers: [QuestionSetsService],
  exports: [QuestionSetsService],
})
export class QuestionSetsModule {}

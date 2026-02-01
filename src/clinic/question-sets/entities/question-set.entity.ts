import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Question } from './question.entity';
import { QuestionSetAssignment } from './question-set-assignment.entity';

@Entity('question_sets')
export class QuestionSet {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'clinic_id' })
  clinic_id: number;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @OneToMany(() => Question, (question) => question.questionSet, {
    cascade: true,
  })
  questions: Question[];

  @OneToMany(
    () => QuestionSetAssignment,
    (assignment) => assignment.questionSet,
    { cascade: true },
  )
  assignments: QuestionSetAssignment[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

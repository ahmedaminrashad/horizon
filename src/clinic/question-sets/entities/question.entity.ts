import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { QuestionSet } from './question-set.entity';

@Entity('questions')
export class Question {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'question_set_id' })
  question_set_id: number;

  @ManyToOne(() => QuestionSet, (questionSet) => questionSet.questions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'question_set_id' })
  questionSet: QuestionSet;

  @Column({ type: 'text' })
  question_text: string;

  @Column({
    type: 'enum',
    enum: ['text', 'textarea', 'select', 'radio', 'checkbox', 'number', 'date'],
    default: 'text',
  })
  question_type: string;

  @Column({ type: 'json', nullable: true })
  options: string[] | null;

  @Column({ type: 'boolean', default: false })
  is_required: boolean;

  @Column({ type: 'int', default: 0 })
  order: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

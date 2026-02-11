import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';
import { User } from '../../permissions/entities/user.entity';
import { Doctor } from '../../doctors/entities/doctor.entity';
import { Question } from '../../questions/entities/question.entity';

/** One answer per patient per question (re-submit updates the record). */
@Entity('patient_question_answers')
@Unique('UQ_patient_question_answer_patient_question', [
  'patient_id',
  'question_id',
])
export class PatientQuestionAnswer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'patient_id' })
  patient_id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patient_id' })
  patient: User;

  @Column({ name: 'doctor_id' })
  doctor_id: number;

  @ManyToOne(() => Doctor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'doctor_id' })
  doctor: Doctor;

  @Column({ name: 'clinic_id' })
  clinic_id: number;

  @Column({ name: 'question_id' })
  question_id: number;

  @ManyToOne(() => Question, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'question_id' })
  question: Question;

  @Column({ name: 'is_answer_yes', type: 'boolean', nullable: true })
  is_answer_yes: boolean | null;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

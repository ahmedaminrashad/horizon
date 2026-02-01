import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { QuestionSet } from './question-set.entity';
import { Doctor } from '../../doctors/entities/doctor.entity';
import { Service } from '../../services/entities/service.entity';
import { Branch } from '../../branches/entities/branch.entity';
import { AppointType } from '../../doctors/entities/doctor.entity';

@Entity('question_set_assignments')
export class QuestionSetAssignment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'question_set_id' })
  @Index('IDX_assignments_question_set_id')
  question_set_id: number;

  @ManyToOne(() => QuestionSet, (questionSet) => questionSet.assignments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'question_set_id' })
  questionSet: QuestionSet;

  @Column({ name: 'doctor_id', nullable: true })
  @Index('IDX_assignments_doctor_id')
  doctor_id: number | null;

  @ManyToOne(() => Doctor, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'doctor_id' })
  doctor: Doctor | null;

  @Column({ name: 'service_id', nullable: true })
  @Index('IDX_assignments_service_id')
  service_id: number | null;

  @ManyToOne(() => Service, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'service_id' })
  service: Service | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @Index('IDX_assignments_specialty')
  specialty: string | null;

  @Column({
    name: 'appoint_type',
    type: 'enum',
    enum: AppointType,
    nullable: true,
  })
  @Index('IDX_assignments_appoint_type')
  appoint_type: AppointType | null;

  @Column({ name: 'branch_id', nullable: true })
  @Index('IDX_assignments_branch_id')
  branch_id: number | null;

  @ManyToOne(() => Branch, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'branch_id' })
  branch: Branch | null;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Priority: higher number = higher priority. Service(5) > Doctor(4) > Specialty(3) > VisitType(2) > Branch(1)',
  })
  priority: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

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
import { Doctor } from '../../doctors/entities/doctor.entity';
import { DayOfWeek } from './clinic-working-hour.entity';

export { DayOfWeek };

/**
 * Doctor Working Hours Entity (Main Database)
 * Stores default working hours for doctors in the main database
 */
@Entity('doctor_working_hours')
@Index('IDX_doctor_working_hours_doctor_day', ['doctor_id', 'day'])
@Index('IDX_doctor_working_hours_branch', ['branch_id'])
export class DoctorWorkingHour {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'doctor_id' })
  doctor_id: number;

  @ManyToOne(() => Doctor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'doctor_id' })
  doctor: Doctor;

  @Column({
    type: 'enum',
    enum: DayOfWeek,
  })
  day: DayOfWeek;

  @Column({ name: 'branch_id', nullable: true })
  branch_id: number;

  @Column({
    type: 'time',
    comment: 'Start time of working hours (e.g., 09:00:00)',
  })
  start_time: string;

  @Column({
    type: 'time',
    comment: 'End time of working hours (e.g., 17:00:00)',
  })
  end_time: string;

  @Column({
    type: 'time',
    nullable: true,
    comment: 'Session duration (e.g., 00:30:00 for 30 minutes)',
  })
  session_time: string;

  @Column({
    type: 'boolean',
    default: true,
    comment: 'Whether this working hour is active',
  })
  is_active: boolean;

  @Column({
    type: 'boolean',
    default: true,
    comment: 'Waterfall scheduling: if true, appointments cascade to next available slot',
  })
  waterfall: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}


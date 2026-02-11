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
import { Doctor, AppointType } from '../../doctors/entities/doctor.entity';
import { Branch } from '../../branches/entities/branch.entity';
import { DoctorService } from '../../doctor-services/entities/doctor-service.entity';
import { DayOfWeek } from './working-hour.entity';

/**
 * Doctor Working Hours Entity
 * Stores individual doctor working hours per day and branch
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

  @ManyToOne(() => Branch, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'branch_id' })
  branch: Branch;

  @Column({ name: 'doctor_service_id', nullable: true })
  doctor_service_id: number | null;

  @ManyToOne(() => DoctorService, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'doctor_service_id' })
  doctor_service: DoctorService | null;

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
    name: 'break_hours_from',
    type: 'time',
    nullable: true,
    comment: 'Start time of break within this working hour (e.g., 13:00:00)',
  })
  break_hours_from: string | null;

  @Column({
    name: 'break_hours_to',
    type: 'time',
    nullable: true,
    comment: 'End time of break within this working hour (e.g., 14:00:00)',
  })
  break_hours_to: string | null;

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
    comment: `Waterfall scheduling: if true, appointments cascade to next available slot
    if false, appointments will be rejected if the slot is not available`,
  })
  waterfall: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Whether this working hour slot is busy',
  })
  busy: boolean;

  @Column({
    type: 'int',
    nullable: true,
    comment: 'Maximum number of patients allowed for this slot. If null, no limit.',
  })
  patients_limit: number;

  @Column({
    type: 'enum',
    enum: AppointType,
    nullable: true,
    comment: 'Appointment type: in-clinic, online, or home',
  })
  appoint_type: AppointType;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

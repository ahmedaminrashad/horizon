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
import { Clinic } from './clinic.entity';

export enum DayOfWeek {
  MONDAY = 'MONDAY',
  TUESDAY = 'TUESDAY',
  WEDNESDAY = 'WEDNESDAY',
  THURSDAY = 'THURSDAY',
  FRIDAY = 'FRIDAY',
  SATURDAY = 'SATURDAY',
  SUNDAY = 'SUNDAY',
}

/**
 * Clinic Default Working Hours Entity (Main Database)
 * Stores default working hours for clinics in the main database
 */
@Entity('clinic_working_hours')
@Index('IDX_clinic_working_hours_clinic_day', ['clinic_id', 'day'])
export class ClinicWorkingHour {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'clinic_id' })
  clinic_id: number;

  @ManyToOne(() => Clinic, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clinic_id' })
  clinic: Clinic;

  @Column({
    type: 'enum',
    enum: DayOfWeek,
  })
  day: DayOfWeek;

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
    type: 'int',
    default: 0,
    comment: 'Order/sequence for multiple ranges on the same day',
  })
  range_order: number;

  @Column({
    type: 'boolean',
    default: true,
    comment: 'Whether this working hour range is active',
  })
  is_active: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}


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
import { Branch } from '../../branches/entities/branch.entity';
import { DayOfWeek } from './clinic-working-hour.entity';

/**
 * Clinic Default Break Hours Entity (Main Database)
 * Stores default break hours for clinics in the main database
 */
@Entity('clinic_break_hours')
@Index('IDX_clinic_break_hours_clinic_day', ['clinic_id', 'day'])
@Index('IDX_clinic_break_hours_clinic_day_branch', ['clinic_id', 'day', 'branch_id'])
@Index('IDX_clinic_break_hours_branch', ['branch_id'])
export class ClinicBreakHour {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'clinic_id' })
  clinic_id: number;

  @ManyToOne(() => Clinic, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clinic_id' })
  clinic: Clinic;

  @Column({ name: 'branch_id', nullable: true })
  branch_id: number;

  @ManyToOne(() => Branch, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'branch_id' })
  branch: Branch;

  @Column({
    type: 'enum',
    enum: DayOfWeek,
  })
  day: DayOfWeek;

  @Column({
    type: 'time',
    comment: 'Start time of break (e.g., 13:00:00)',
  })
  start_time: string;

  @Column({
    type: 'time',
    comment: 'End time of break (e.g., 14:00:00)',
  })
  end_time: string;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Order/sequence for multiple breaks on the same day',
  })
  break_order: number;

  @Column({
    type: 'boolean',
    default: true,
    comment: 'Whether this break is active',
  })
  is_active: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}


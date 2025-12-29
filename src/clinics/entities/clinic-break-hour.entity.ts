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
import { DayOfWeek } from './clinic-working-hour.entity';

/**
 * Clinic Default Break Hours Entity (Main Database)
 * Stores default break hours for clinics in the main database
 */
@Entity('clinic_break_hours')
@Index('IDX_clinic_break_hours_clinic_day', ['clinic_id', 'day'])
export class ClinicBreakHour {
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


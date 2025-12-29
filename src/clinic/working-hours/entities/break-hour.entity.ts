import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { DayOfWeek } from './working-hour.entity';

/**
 * Clinic Break Hours Entity
 * Stores break times within working hours
 * Supports multiple break ranges per day
 */
@Entity('break_hours')
@Index('IDX_break_hours_day', ['day'])
export class BreakHour {
  @PrimaryGeneratedColumn()
  id: number;

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


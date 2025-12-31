import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { DayOfWeek } from './working-hour.entity';
import { Branch } from '../../branches/entities/branch.entity';

/**
 * Clinic Break Hours Entity
 * Stores break times within working hours
 * Supports multiple break ranges per day
 */
@Entity('break_hours')
@Index('IDX_break_hours_day', ['day'])
@Index('IDX_break_hours_branch', ['branch_id'])
@Index('IDX_break_hours_day_branch', ['day', 'branch_id'])
export class BreakHour {
  @PrimaryGeneratedColumn()
  id: number;

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


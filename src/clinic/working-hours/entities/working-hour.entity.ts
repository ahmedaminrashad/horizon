import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

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
 * Clinic Working Hours Entity
 * Stores default working hours for the clinic
 * Supports multiple working ranges per day
 */
@Entity('working_hours')
@Index('IDX_working_hours_day', ['day'])
export class WorkingHour {
  @PrimaryGeneratedColumn()
  id: number;

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


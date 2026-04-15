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
import { Doctor } from '../../doctors/entities/doctor.entity';
import { Branch } from '../../branches/entities/branch.entity';
import { DayOfWeek } from '../../working-hours/entities/working-hour.entity';

@Entity('doctor_branches')
@Unique('UQ_doctor_branches_doctor_branch', ['doctor_id', 'branch_id'])
export class DoctorBranch {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'doctor_id' })
  doctor_id: number;

  @ManyToOne(() => Doctor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'doctor_id' })
  doctor: Doctor;

  @Column({ name: 'branch_id' })
  branch_id: number;

  @ManyToOne(() => Branch, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'branch_id' })
  branch: Branch;

  @Column({
    name: 'week_start_day',
    type: 'enum',
    enum: DayOfWeek,
    nullable: true,
    comment: 'Optional week range start for this doctor at this branch',
  })
  week_start_day: DayOfWeek | null;

  @Column({
    name: 'week_end_day',
    type: 'enum',
    enum: DayOfWeek,
    nullable: true,
    comment: 'Optional week range end for this doctor at this branch',
  })
  week_end_day: DayOfWeek | null;

  @Column({
    name: 'from_time',
    type: 'time',
    nullable: true,
    comment: 'Optional daily window start at this branch',
  })
  from_time: string | null;

  @Column({
    name: 'to_time',
    type: 'time',
    nullable: true,
    comment: 'Optional daily window end at this branch',
  })
  to_time: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

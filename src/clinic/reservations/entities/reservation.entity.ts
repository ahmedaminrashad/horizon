import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Doctor } from '../../doctors/entities/doctor.entity';
import { User } from '../../permissions/entities/user.entity';
import { DoctorWorkingHour } from '../../working-hours/entities/doctor-working-hour.entity';

export enum ReservationStatus {
  PENDING = 'pending',
  TAKEN = 'taken',
  SCHEDULED = 'scheduled',
  CANCELLED = 'cancelled',
}

@Entity('reservations')
export class Reservation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'doctor_id' })
  doctor_id: number;

  @Column({ name: 'patient_id' })
  patient_id: number;

  @Column({ name: 'doctor_working_hour_id' })
  doctor_working_hour_id: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  fees: number;

  @Column({ type: 'boolean', default: false })
  paid: boolean;

  @Column({ type: 'datetime', name: 'date_time' })
  date_time: Date;

  @Column({
    type: 'enum',
    enum: ReservationStatus,
    default: ReservationStatus.PENDING,
  })
  status: ReservationStatus;

  @ManyToOne(() => Doctor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'doctor_id' })
  doctor: Doctor;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patient_id' })
  patient: User;

  @ManyToOne(() => DoctorWorkingHour, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'doctor_working_hour_id' })
  doctor_working_hour: DoctorWorkingHour;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

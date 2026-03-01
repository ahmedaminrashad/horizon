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
import { User } from '../../users/entities/user.entity';

export enum ReservationStatus {
  PENDING = 'pending',
  TAKEN = 'taken',
  SCHEDULED = 'scheduled',
  CANCELLED = 'cancelled',
}

export enum MedicalStatus {
  CONFIRMED = 'Confirmed',
  SUSPECTED = 'Suspected',
  MIS_DIAGNOSIS = 'MisDiagnosis',
}

@Entity('reservations')
export class Reservation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'clinic_id' })
  @Index('IDX_reservations_clinic_id')
  clinic_id: number;

  @Column({ name: 'clinic_reservation_id' })
  @Index('IDX_reservations_clinic_reservation_id')
  clinic_reservation_id: number;

  @Column({ name: 'doctor_id' })
  @Index('IDX_reservations_doctor_id')
  doctor_id: number;

  @Column({ name: 'main_user_id', nullable: true })
  @Index('IDX_reservations_main_user_id')
  main_user_id: number;

  @Column({ name: 'doctor_working_hour_id' })
  doctor_working_hour_id: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  fees: number;

  @Column({ type: 'boolean', default: false })
  paid: boolean;

  @Column({ type: 'date', name: 'date' })
  date: Date;

  @Column({
    type: 'time',
    name: 'from_time',
    nullable: true,
    comment: 'Start time from working hour (e.g., 09:00:00)',
  })
  from_time: string;

  @Column({
    type: 'time',
    name: 'to_time',
    nullable: true,
    comment: 'End time from working hour (e.g., 17:00:00)',
  })
  to_time: string;

  @Column({
    type: 'enum',
    enum: ReservationStatus,
    default: ReservationStatus.PENDING,
  })
  status: ReservationStatus;

  @Column({
    type: 'enum',
    enum: AppointType,
    nullable: true,
    comment: 'Appointment type: in-clinic, online, or home',
  })
  appoint_type: AppointType;

  @Column({
    type: 'enum',
    enum: MedicalStatus,
    nullable: true,
    name: 'medical_status',
    comment: 'Medical status: Confirmed, Suspected, MisDiagnosis',
  })
  medical_status: MedicalStatus;

  @ManyToOne(() => Doctor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'doctor_id' })
  doctor: Doctor;

  @ManyToOne(() => User, {
    onDelete: 'SET NULL',
    nullable: true,
    eager: false, // Explicitly disable eager loading
  })
  @JoinColumn({ name: 'main_user_id' })
  mainUser: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Doctor, AppointType } from '../../doctors/entities/doctor.entity';
import { User } from '../../permissions/entities/user.entity';
import { DoctorWorkingHour } from '../../working-hours/entities/doctor-working-hour.entity';

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

  @Column({ type: 'date', name: 'date' })
  date: Date;

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

  @Column({ name: 'main_user_id', nullable: true })
  main_user_id: number;

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

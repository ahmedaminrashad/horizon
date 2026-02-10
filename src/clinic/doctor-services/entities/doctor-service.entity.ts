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
import { Service } from '../../services/entities/service.entity';

export enum DoctorServiceType {
  CONSULTATION = 'consultation',
  FOLLOW_UP = 'follow_up',
  ONLINE_CONSULTATION = 'online_consultation',
  HOME_VISIT = 'home_visit',
  OTHER = 'other',
}

@Entity('doctor_services')
export class DoctorService {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'service_id' })
  service_id: number;

  @ManyToOne(() => Service, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'service_id' })
  service: Service;

  @Column({ name: 'doctor_id' })
  doctor_id: number;

  @ManyToOne(() => Doctor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'doctor_id' })
  doctor: Doctor;

  @Column({ name: 'duration', type: 'int', nullable: true })
  duration: number | null;

  @Column({
    name: 'price',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  price: number | null;

  @Column({
    name: 'service_type',
    type: 'enum',
    enum: DoctorServiceType,
    nullable: true,
  })
  service_type: DoctorServiceType | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

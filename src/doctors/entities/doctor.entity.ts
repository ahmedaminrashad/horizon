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
import { Branch } from '../../branches/entities/branch.entity';

export enum Department {
  CARDIOLOGY = 'CARDIOLOGY',
  NEUROLOGY = 'NEUROLOGY',
  ORTHOPEDICS = 'ORTHOPEDICS',
  PEDIATRICS = 'PEDIATRICS',
  DERMATOLOGY = 'DERMATOLOGY',
  ONCOLOGY = 'ONCOLOGY',
  RADIOLOGY = 'RADIOLOGY',
  SURGERY = 'SURGERY',
  INTERNAL_MEDICINE = 'INTERNAL_MEDICINE',
  EMERGENCY = 'EMERGENCY',
  OTHER = 'OTHER',
}

export enum AppointType {
  IN_CLINIC = 'in-clinic',
  ONLINE = 'online',
  HOME = 'home',
}

@Entity('doctors')
export class Doctor {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'int', nullable: true })
  age: number;

  @Column({ name: 'clinic_id' })
  @Index('IDX_doctors_clinic_id')
  clinic_id: number;

  @Column({ name: 'clinic_doctor_id' })
  @Index('IDX_doctors_clinic_doctor_id')
  clinic_doctor_id: number;

  @Column({ name: 'branch_id', nullable: true })
  branch_id: number;

  @ManyToOne(() => Branch, { nullable: true })
  @JoinColumn({ name: 'branch_id' })
  branch: Branch;

  @Column({ name: 'experience_years', type: 'int', nullable: true })
  experience_years: number;

  @Column({ name: 'number_of_patients', type: 'int', nullable: true })
  number_of_patients: number;

  @Column({ nullable: true })
  avatar: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column({
    type: 'enum',
    enum: Department,
    nullable: true,
  })
  department: Department;

  @Column({ nullable: true })
  specialty: string;

  @Column({ name: 'license_number', nullable: true })
  license_number: string;

  @Column({ nullable: true })
  degree: string;

  @Column({ type: 'text', nullable: true })
  languages: string;

  @Column({ type: 'text', nullable: true })
  bio: string;

  @Column({
    name: 'appoint_type',
    type: 'enum',
    enum: AppointType,
    nullable: true,
  })
  appoint_type: AppointType;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

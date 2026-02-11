import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../permissions/entities/user.entity';
import { SlotTemplate } from '../../slot-template/entities/slot-template.entity';
import { DoctorBranch } from '../../doctor-branches/entities/doctor-branch.entity';
import { DoctorService } from '../../doctor-services/entities/doctor-service.entity';
import { DoctorFile } from '../../doctor-files/entities/doctor-file.entity';

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

  @Column({ type: 'int', nullable: true })
  age: number | null;

  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  date_of_birth: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  gender: string | null;

  @Column({ name: 'second_phone', type: 'varchar', length: 50, nullable: true })
  second_phone: string | null;

  @Column({
    type: 'enum',
    enum: Department,
  })
  department: Department;

  @Column({ nullable: true })
  specialty: string;

  @Column({ name: 'user_id' })
  user_id: number;

  @Column({ name: 'clinic_id' })
  clinic_id: number;

  @OneToMany(() => DoctorBranch, (db) => db.doctor, { cascade: true })
  doctorBranches: DoctorBranch[];

  @OneToMany(() => DoctorService, (ds) => ds.doctor, { cascade: true })
  doctorServices: DoctorService[];

  @OneToMany(() => DoctorFile, (df) => df.doctor, { cascade: true })
  doctorFiles: DoctorFile[];

  @Column({ name: 'experience_years', type: 'int', nullable: true })
  experience_years: number;

  @Column({ name: 'number_of_patients', type: 'int', nullable: true })
  number_of_patients: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true })
  rate: number;

  @Column({ nullable: true })
  avatar: string;

  @Column({ name: 'license_number', nullable: true })
  license_number: string;

  @Column({ nullable: true })
  degree: string;

  @Column({ type: 'text', nullable: true })
  languages: string;

  @Column({ type: 'text', nullable: true })
  bio: string;

  @Column({
    name: 'appointment_types',
    type: 'simple-array',
    nullable: true,
    comment: 'Comma-separated: in-clinic, online, home',
  })
  appointment_types: AppointType[];

  @Column({ name: 'is_active', type: 'boolean', default: true })
  is_active: boolean;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => SlotTemplate, (slotTemplate) => slotTemplate.doctor, {
    cascade: true,
  })
  slotTemplates: SlotTemplate[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

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

  @Column({ type: 'int' })
  age: number;

  @Column({
    type: 'enum',
    enum: Department,
  })
  department: Department;

  @Column({ name: 'user_id' })
  user_id: number;

  @Column({ name: 'clinic_id' })
  clinic_id: number;

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
    name: 'appoint_type',
    type: 'enum',
    enum: AppointType,
    nullable: true,
  })
  appoint_type: AppointType;

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

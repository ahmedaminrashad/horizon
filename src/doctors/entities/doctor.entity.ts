import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

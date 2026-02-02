import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Clinic } from './clinic.entity';

/**
 * Main DB: links users to clinics (e.g. after a main user makes a reservation at a clinic).
 */
@Entity('clinic_user')
@Unique('UQ_clinic_user_user_clinic', ['user_id', 'clinic_id'])
@Index('IDX_clinic_user_user_id', ['user_id'])
@Index('IDX_clinic_user_clinic_id', ['clinic_id'])
export class ClinicUser {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  user_id: number;

  @Column({ name: 'clinic_id' })
  clinic_id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Clinic, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clinic_id' })
  clinic: Clinic;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

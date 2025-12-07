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

@Entity('slot_template')
export class SlotTemplate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'time',
    comment: 'Duration of the slot (e.g., 00:30:00 for 30 minutes)',
  })
  duration: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    comment: 'Cost of the slot',
  })
  cost: number;

  @Column({
    type: 'varchar',
    length: 255,
    comment: 'Days of the week (comma-separated: MONDAY,TUESDAY,WEDNESDAY, etc.)',
  })
  days: string;

  @Column({ name: 'doctor_id' })
  doctor_id: number;

  @ManyToOne(() => Doctor, (doctor) => doctor.slotTemplates, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'doctor_id' })
  doctor: Doctor;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

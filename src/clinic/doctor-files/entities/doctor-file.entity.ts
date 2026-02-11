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

@Entity('doctor_files')
export class DoctorFile {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'doctor_id' })
  doctor_id: number;

  @ManyToOne(() => Doctor, (d) => d.doctorFiles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'doctor_id' })
  doctor: Doctor;

  @Column({ name: 'file_path', type: 'varchar', length: 500 })
  file_path: string;

  @Column({ name: 'file_name', type: 'varchar', length: 255, nullable: true })
  file_name: string | null;

  @Column({ name: 'file_type', type: 'varchar', length: 50, nullable: true })
  file_type: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

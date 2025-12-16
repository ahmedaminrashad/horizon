import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum ServiceType {
  CONSULTATION = 'consultation',
  FOLLOW_UP = 'follow-up',
  ONLINE_CONSULTATION = 'online consultation',
  HOME_VISIT = 'home visit',
}

@Entity('services')
export class Service {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ name: 'clinic_id' })
  @Index('IDX_services_clinic_id')
  clinic_id: number;

  @Column({ name: 'clinic_service_id' })
  @Index('IDX_services_clinic_service_id')
  clinic_service_id: number;

  @Column({ nullable: true })
  category: string;

  @Column({ nullable: true })
  specialty: string;

  @Column({ nullable: true })
  degree: string;

  @Column({
    type: 'enum',
    enum: ServiceType,
    nullable: true,
  })
  type: ServiceType;

  @Column({ name: 'default_duration', type: 'int', nullable: true })
  default_duration: number;

  @Column({ name: 'default_price', type: 'decimal', precision: 10, scale: 2, nullable: true })
  default_price: number;

  @Column({ nullable: true })
  currency: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

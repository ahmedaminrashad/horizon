import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
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

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
import { Country } from '../../countries/entities/country.entity';
import { City } from '../../cities/entities/city.entity';
import { Branch } from '../../branches/entities/branch.entity';
import { Package } from '../../packages/entities/package.entity';

@Entity('clinics')
export class Clinic {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column({ unique: true })
  phone: string;

  @Column({ nullable: true })
  image: string;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  lat: number;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  longit: number;

  @Column({ type: 'json', nullable: true })
  departments: string[];

  @Column({ unique: true, nullable: true })
  database_name: string;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ nullable: true })
  country_id: number;

  @ManyToOne(() => Country, { nullable: true })
  @JoinColumn({ name: 'country_id' })
  country: Country;

  @Column({ nullable: true })
  city_id: number;

  @ManyToOne(() => City, { nullable: true })
  @JoinColumn({ name: 'city_id' })
  city: City;

  @OneToMany(() => Branch, (branch) => branch.clinic)
  branches: Branch[];

  @Column({ type: 'text', nullable: true })
  owner: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ nullable: true })
  wa_number: string;

  @Column({ type: 'text', nullable: true })
  bio: string;

  @Column({ type: 'int', nullable: true })
  package_id: number;

  @ManyToOne(() => Package, { nullable: true })
  @JoinColumn({ name: 'package_id' })
  package: Package;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

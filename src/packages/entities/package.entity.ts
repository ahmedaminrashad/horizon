import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PackageTranslation } from './package-translation.entity';

@Entity('packages')
export class Package {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price_monthly: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price_annual: number;

  @Column({ type: 'boolean', default: false })
  is_featured: boolean;

  @OneToMany(() => PackageTranslation, (translation) => translation.package, {
    cascade: true,
  })
  translations: PackageTranslation[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

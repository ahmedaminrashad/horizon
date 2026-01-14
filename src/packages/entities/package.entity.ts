import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('packages')
export class Package {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'name_ar', type: 'varchar', length: 255, nullable: true })
  name_ar: string | null;

  @Column({ name: 'name_en', type: 'varchar', length: 255, nullable: true })
  name_en: string | null;

  @Column({ name: 'content_ar', type: 'text', nullable: true })
  content_ar: string | null;

  @Column({ name: 'content_en', type: 'text', nullable: true })
  content_en: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price_monthly: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price_annual: number;

  @Column({ type: 'boolean', default: false })
  is_featured: boolean;

  @Column({ name: 'features_ar', type: 'json', nullable: true })
  features_ar: string[] | null;

  @Column({ name: 'features_en', type: 'json', nullable: true })
  features_en: string[] | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

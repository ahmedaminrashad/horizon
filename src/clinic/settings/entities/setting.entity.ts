import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Clinic Settings entity - Singleton pattern
 * Only one settings record should exist (id: 1) per clinic database
 * All operations should target the first record only
 */
@Entity('settings')
export class Setting {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  logo: string;

  @Column({ nullable: true })
  title_ar: string;

  @Column({ nullable: true })
  title_en: string;

  @Column({ nullable: true })
  android_version: string;

  @Column({ nullable: true })
  ios_version: string;

  @Column({ nullable: true })
  color: string;

  @Column({ nullable: true })
  theme: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

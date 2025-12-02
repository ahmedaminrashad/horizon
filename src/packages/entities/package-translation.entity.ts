import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { Package } from './package.entity';

@Entity('package_translations')
@Unique(['package_id', 'lang'])
@Index(['package_id'])
export class PackageTranslation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'package_id' })
  package_id: number;

  @Column({ length: 10 })
  lang: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  content: string;

  @ManyToOne(() => Package, (pkg) => pkg.translations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'package_id' })
  package: Package;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

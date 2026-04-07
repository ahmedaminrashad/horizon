import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Index,
} from 'typeorm';

@Entity('password_reset_tokens')
export class PasswordResetToken {
  @PrimaryGeneratedColumn()
  id: number;

  @Index('UQ_password_reset_tokens_jti', { unique: true })
  @Column({ type: 'varchar', length: 36 })
  jti: string;

  @Column({ name: 'user_id' })
  user_id: number;

  @Column({ name: 'expires_at', type: 'datetime' })
  expires_at: Date;

  @Column({ name: 'used_at', type: 'datetime', nullable: true })
  used_at: Date | null;

  /** Bcrypt hash of the 6-digit code sent by email (JWT reset flow removed). */
  @Column({ name: 'code_hash', type: 'varchar', length: 255, nullable: true })
  code_hash: string | null;
}

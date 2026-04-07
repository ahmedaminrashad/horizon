import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { DataSource, IsNull, Repository } from 'typeorm';
import { randomInt, randomUUID } from 'crypto';
import { PasswordResetToken } from './entities/password-reset-token.entity';

const ONE_HOUR_MS = 60 * 60 * 1000;

function generateSixDigitCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

@Injectable()
export class PasswordResetTokenService {
  constructor(
    @InjectRepository(PasswordResetToken)
    private readonly mainRepo: Repository<PasswordResetToken>,
  ) {}

  private async invalidatePendingForUser(
    repo: Repository<PasswordResetToken>,
    userId: number,
  ): Promise<void> {
    const now = new Date();
    await repo
      .createQueryBuilder()
      .update(PasswordResetToken)
      .set({ used_at: now })
      .where('user_id = :userId', { userId })
      .andWhere('used_at IS NULL')
      .execute();
  }

  /**
   * Creates a one-time 6-digit code (stored hashed). Invalidates prior pending codes for this user.
   */
  async issueMainResetCode(userId: number): Promise<string> {
    await this.invalidatePendingForUser(this.mainRepo, userId);
    const code = generateSixDigitCode();
    const code_hash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + ONE_HOUR_MS);
    await this.mainRepo.insert({
      jti: randomUUID(),
      user_id: userId,
      expires_at: expiresAt,
      used_at: null,
      code_hash,
    });
    return code;
  }

  async validateAndConsumeMainCode(
    userId: number,
    rawCode: string,
  ): Promise<void> {
    const code = rawCode.trim();
    if (!/^\d{6}$/.test(code)) {
      throw new BadRequestException('Invalid or expired reset code');
    }
    const now = new Date();
    const row = await this.mainRepo.findOne({
      where: {
        user_id: userId,
        used_at: IsNull(),
      },
      order: { id: 'DESC' },
    });
    if (
      !row ||
      !row.code_hash ||
      row.expires_at <= now ||
      row.used_at != null
    ) {
      throw new BadRequestException('Invalid or expired reset code');
    }
    const ok = await bcrypt.compare(code, row.code_hash);
    if (!ok) {
      throw new BadRequestException('Invalid or expired reset code');
    }
    const result = await this.mainRepo
      .createQueryBuilder()
      .update(PasswordResetToken)
      .set({ used_at: new Date() })
      .where('id = :id', { id: row.id })
      .andWhere('used_at IS NULL')
      .andWhere('expires_at > :now', { now })
      .execute();
    if (!result.affected) {
      throw new BadRequestException('Invalid or expired reset code');
    }
  }

  async issueClinicResetCode(
    dataSource: DataSource,
    userId: number,
  ): Promise<string> {
    const repo = dataSource.getRepository(PasswordResetToken);
    await this.invalidatePendingForUser(repo, userId);
    const code = generateSixDigitCode();
    const code_hash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + ONE_HOUR_MS);
    await repo.insert({
      jti: randomUUID(),
      user_id: userId,
      expires_at: expiresAt,
      used_at: null,
      code_hash,
    });
    return code;
  }

  async validateAndConsumeClinicCode(
    dataSource: DataSource,
    userId: number,
    rawCode: string,
  ): Promise<void> {
    const code = rawCode.trim();
    if (!/^\d{6}$/.test(code)) {
      throw new BadRequestException('Invalid or expired reset code');
    }
    const repo = dataSource.getRepository(PasswordResetToken);
    const now = new Date();
    const row = await repo.findOne({
      where: {
        user_id: userId,
        used_at: IsNull(),
      },
      order: { id: 'DESC' },
    });
    if (
      !row ||
      !row.code_hash ||
      row.expires_at <= now ||
      row.used_at != null
    ) {
      throw new BadRequestException('Invalid or expired reset code');
    }
    const ok = await bcrypt.compare(code, row.code_hash);
    if (!ok) {
      throw new BadRequestException('Invalid or expired reset code');
    }
    const result = await repo
      .createQueryBuilder()
      .update(PasswordResetToken)
      .set({ used_at: new Date() })
      .where('id = :id', { id: row.id })
      .andWhere('used_at IS NULL')
      .andWhere('expires_at > :now', { now })
      .execute();
    if (!result.affected) {
      throw new BadRequestException('Invalid or expired reset code');
    }
  }
}

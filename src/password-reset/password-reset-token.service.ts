import { BadRequestException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { PasswordResetToken } from './entities/password-reset-token.entity';

const ONE_HOUR_MS = 60 * 60 * 1000;

@Injectable()
export class PasswordResetTokenService {
  constructor(
    @InjectRepository(PasswordResetToken)
    private readonly mainRepo: Repository<PasswordResetToken>,
    private readonly jwtService: JwtService,
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

  async issueMainResetJwt(userId: number): Promise<string> {
    await this.invalidatePendingForUser(this.mainRepo, userId);
    const jti = randomUUID();
    const expiresAt = new Date(Date.now() + ONE_HOUR_MS);
    await this.mainRepo.insert({
      jti,
      user_id: userId,
      expires_at: expiresAt,
      used_at: null,
    });
    return this.jwtService.sign(
      { purpose: 'password-reset-main', sub: userId, jti },
      { expiresIn: '1h' },
    );
  }

  async consumeMainToken(decoded: {
    purpose?: string;
    sub?: number;
    jti?: string;
  }): Promise<void> {
    if (decoded.purpose !== 'password-reset-main' || decoded.sub == null) {
      throw new BadRequestException('Invalid reset token');
    }
    if (!decoded.jti || typeof decoded.jti !== 'string') {
      throw new BadRequestException(
        'Invalid or expired reset token',
      );
    }
    const now = new Date();
    const result = await this.mainRepo
      .createQueryBuilder()
      .update(PasswordResetToken)
      .set({ used_at: new Date() })
      .where('jti = :jti', { jti: decoded.jti })
      .andWhere('user_id = :sub', { sub: decoded.sub })
      .andWhere('used_at IS NULL')
      .andWhere('expires_at > :now', { now })
      .execute();
    if (!result.affected) {
      throw new BadRequestException(
        'Invalid, expired, or already used reset token',
      );
    }
  }

  async issueClinicResetJwt(
    dataSource: DataSource,
    userId: number,
    claims: { clinic_id: number; database_name: string },
  ): Promise<string> {
    const repo = dataSource.getRepository(PasswordResetToken);
    await this.invalidatePendingForUser(repo, userId);
    const jti = randomUUID();
    const expiresAt = new Date(Date.now() + ONE_HOUR_MS);
    await repo.insert({
      jti,
      user_id: userId,
      expires_at: expiresAt,
      used_at: null,
    });
    return this.jwtService.sign(
      {
        purpose: 'password-reset',
        sub: userId,
        jti,
        clinic_id: claims.clinic_id,
        database_name: claims.database_name,
      },
      { expiresIn: '1h' },
    );
  }

  async consumeClinicToken(
    dataSource: DataSource,
    decoded: {
      purpose?: string;
      sub?: number;
      jti?: string;
    },
  ): Promise<void> {
    if (decoded.purpose !== 'password-reset' || decoded.sub == null) {
      throw new BadRequestException('Invalid reset token');
    }
    if (!decoded.jti || typeof decoded.jti !== 'string') {
      throw new BadRequestException(
        'Invalid or expired reset token',
      );
    }
    const repo = dataSource.getRepository(PasswordResetToken);
    const now = new Date();
    const result = await repo
      .createQueryBuilder()
      .update(PasswordResetToken)
      .set({ used_at: new Date() })
      .where('jti = :jti', { jti: decoded.jti })
      .andWhere('user_id = :sub', { sub: decoded.sub })
      .andWhere('used_at IS NULL')
      .andWhere('expires_at > :now', { now })
      .execute();
    if (!result.affected) {
      throw new BadRequestException(
        'Invalid, expired, or already used reset token',
      );
    }
  }
}

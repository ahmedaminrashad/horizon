import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RolesService } from '../roles/roles.service';
import { RegisterDto } from './dto/register.dto';
import { RegisterPatientDto } from './dto/register-patient.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { User } from '../users/entities/user.entity';
import { TranslationService } from '../common/services/translation.service';
import { MailService } from '../mail/mail.service';
import { PasswordResetTokenService } from '../password-reset/password-reset-token.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private rolesService: RolesService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private translationService: TranslationService,
    private mailService: MailService,
    private passwordResetTokenService: PasswordResetTokenService,
  ) {}

  async register(registerDto: RegisterDto) {
    const user = await this.usersService.create(registerDto);

    // Get full user with role info
    const fullUser = await this.usersService.findOne(user.id);

    // Remove password from response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = fullUser;

    return {
      ...result,
      access_token: this.generateToken(fullUser),
    };
  }

  async registerPatient(registerPatientDto: RegisterPatientDto) {
    // Create user with patient role and default package_id
    const createUserDto = {
      ...registerPatientDto,
      package_id: 0,
    };

    const user = await this.usersService.create(createUserDto);

    // Get full user with role info
    const fullUser = await this.usersService.findOne(user.id);

    return {
      fullUser,
      access_token: this.generateToken(fullUser),
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByPhone(loginDto.phone);
    if (!user) {
      throw new UnauthorizedException(this.translationService.t('Invalid credentials'));
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException(this.translationService.t('Invalid credentials'));
    }

    // Get full user with role info
    const fullUser = await this.usersService.findOne(user.id);

    // Remove password from response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _password, ...result } = fullUser;

    return {
      ...result,
      access_token: this.generateToken(fullUser),
    };
  }

  async getCurrentUser(userId: number) {
    const user = await this.usersService.findOne(userId);
    return user;
  }

  private generateToken(user: User): string {
    const payload = {
      sub: user.id,
      role_id: user.role_id,
      database_name: user.database_name,
      role_slug: user.role?.slug,
    };
    return this.jwtService.sign(payload);
  }

  /**
   * Forgot password (main users): find user by phone, issue a one-time 6-digit code (stored hashed).
   * When MAIL_MAILER=mailgun and the user has an email, sends the code via Mailgun.
   * Response is always the generic message only (no code in JSON).
   */
  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.usersService.findByPhone(dto.phone.trim());
    const message =
      'If an account exists with this phone number, you will receive instructions to reset your password.';

    if (!user) {
      return { message };
    }

    const resetCode = await this.passwordResetTokenService.issueMainResetCode(
      user.id,
    );

    await this.mailService.sendPasswordResetEmail(user.email, resetCode);

    return { message };
  }

  /**
   * Reset password (main users): verify 6-digit code from email, update password.
   */
  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.usersService.findByPhone(dto.phone.trim());
    if (!user) {
      throw new BadRequestException('Invalid or expired reset code');
    }

    await this.passwordResetTokenService.validateAndConsumeMainCode(
      user.id,
      dto.code,
    );

    await this.usersService.update(user.id, { password: dto.new_password });

    return { message: 'Password has been reset successfully.' };
  }

  /**
   * Admin reset password (main users): set a user's password without token. Caller must be admin.
   */
  async adminResetPassword(userId: number, newPassword: string) {
    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    await this.usersService.update(userId, { password: newPassword });
    return { message: 'Password has been reset successfully.' };
  }
}

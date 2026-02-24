import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { ClinicsService } from '../../clinics/clinics.service';
import { TenantRepositoryService } from '../../database/tenant-repository.service';
import { TenantDataSourceService } from '../../database/tenant-data-source.service';
import { DoctorsService as MainDoctorsService } from '../../doctors/doctors.service';
import { User as ClinicUser } from '../permissions/entities/user.entity';
import { Reservation, ReservationStatus } from '../reservations/entities/reservation.entity';
import { ClinicLoginDto } from './dto/clinic-login.dto';
import { DoctorLoginDto } from './dto/doctor-login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { TranslationService } from '../../common/services/translation.service';

@Injectable()
export class ClinicAuthService {
  constructor(
    private clinicsService: ClinicsService,
    private jwtService: JwtService,
    private tenantRepositoryService: TenantRepositoryService,
    private tenantDataSourceService: TenantDataSourceService,
    private mainDoctorsService: MainDoctorsService,
    private translationService: TranslationService,
  ) {}

  /**
   * Get dashboard stats for clinic (after login).
   * - total_appointments_last_7_days: non-cancelled reservations in last 7 days
   * - total_revenue_last_7_days: sum of fees for non-cancelled in last 7 days
   * - doctor_workload_today: non-cancelled reservations today
   * - cancellations_last_7_days: cancelled reservations in last 7 days
   */
  private async getClinicDashboardStats() {
    const reservationRepo =
      await this.tenantRepositoryService.getRepository<Reservation>(Reservation);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      totalAppointmentsLast7Days,
      totalRevenueResult,
      doctorWorkloadToday,
      cancellationsLast7Days,
    ] = await Promise.all([
      reservationRepo
        .createQueryBuilder('r')
        .where('r.date >= :from', { from: sevenDaysAgo })
        .andWhere('r.date < :to', { to: tomorrow })
        .andWhere('r.status != :cancelled', {
          cancelled: ReservationStatus.CANCELLED,
        })
        .getCount(),
      reservationRepo
        .createQueryBuilder('r')
        .select('COALESCE(SUM(r.fees), 0)', 'total')
        .where('r.date >= :from', { from: sevenDaysAgo })
        .andWhere('r.date < :to', { to: tomorrow })
        .andWhere('r.status != :cancelled', {
          cancelled: ReservationStatus.CANCELLED,
        })
        .getRawOne<{ total: string }>(),
      reservationRepo
        .createQueryBuilder('r')
        .where('r.date >= :today', { today })
        .andWhere('r.date < :tomorrow', { tomorrow })
        .andWhere('r.status != :cancelled', {
          cancelled: ReservationStatus.CANCELLED,
        })
        .getCount(),
      reservationRepo
        .createQueryBuilder('r')
        .where('r.date >= :from', { from: sevenDaysAgo })
        .andWhere('r.date < :to', { to: tomorrow })
        .andWhere('r.status = :cancelled', {
          cancelled: ReservationStatus.CANCELLED,
        })
        .getCount(),
    ]);

    const totalRevenue = totalRevenueResult?.total
      ? parseFloat(totalRevenueResult.total)
      : 0;

    return {
      total_appointments_last_7_days: totalAppointmentsLast7Days,
      total_revenue_last_7_days: totalRevenue,
      doctor_workload_today: doctorWorkloadToday,
      cancellations_last_7_days: cancellationsLast7Days,
    };
  }

  /**
   * Same as getClinicDashboardStats but using a given DataSource (e.g. for doctor login without tenant context).
   */
  private async getDashboardStatsFromDataSource(
    dataSource: DataSource,
  ): Promise<{
    total_appointments_last_7_days: number;
    total_revenue_last_7_days: number;
    doctor_workload_today: number;
    cancellations_last_7_days: number;
  }> {
    const reservationRepo = dataSource.getRepository(Reservation);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      totalAppointmentsLast7Days,
      totalRevenueResult,
      doctorWorkloadToday,
      cancellationsLast7Days,
    ] = await Promise.all([
      reservationRepo
        .createQueryBuilder('r')
        .where('r.date >= :from', { from: sevenDaysAgo })
        .andWhere('r.date < :to', { to: tomorrow })
        .andWhere('r.status != :cancelled', {
          cancelled: ReservationStatus.CANCELLED,
        })
        .getCount(),
      reservationRepo
        .createQueryBuilder('r')
        .select('COALESCE(SUM(r.fees), 0)', 'total')
        .where('r.date >= :from', { from: sevenDaysAgo })
        .andWhere('r.date < :to', { to: tomorrow })
        .andWhere('r.status != :cancelled', {
          cancelled: ReservationStatus.CANCELLED,
        })
        .getRawOne<{ total: string }>(),
      reservationRepo
        .createQueryBuilder('r')
        .where('r.date >= :today', { today })
        .andWhere('r.date < :tomorrow', { tomorrow })
        .andWhere('r.status != :cancelled', {
          cancelled: ReservationStatus.CANCELLED,
        })
        .getCount(),
      reservationRepo
        .createQueryBuilder('r')
        .where('r.date >= :from', { from: sevenDaysAgo })
        .andWhere('r.date < :to', { to: tomorrow })
        .andWhere('r.status = :cancelled', {
          cancelled: ReservationStatus.CANCELLED,
        })
        .getCount(),
    ]);

    const totalRevenue = totalRevenueResult?.total
      ? parseFloat(totalRevenueResult.total)
      : 0;

    return {
      total_appointments_last_7_days: totalAppointmentsLast7Days,
      total_revenue_last_7_days: totalRevenue,
      doctor_workload_today: doctorWorkloadToday,
      cancellations_last_7_days: cancellationsLast7Days,
    };
  }

  /**
   * Clinic login when clinic_id is not in the path: resolve clinic by phone from clinics table, then validate user in clinic DB.
   */
  async loginByPhone(clinicLoginDto: ClinicLoginDto) {
    const clinic = await this.clinicsService.findOneByPhone(clinicLoginDto.phone);
    if (!clinic?.database_name) {
      throw new NotFoundException('Clinic not found');
    }

    const clinicDataSource =
      await this.tenantDataSourceService.getTenantDataSource(
        clinic.database_name,
      );
    if (!clinicDataSource) {
      throw new NotFoundException('Clinic database not available');
    }

    const clinicUserRepo = clinicDataSource.getRepository(ClinicUser);
    const clinicDbUser = await clinicUserRepo.findOne({
      where: { phone: clinicLoginDto.phone },
      relations: ['role', 'role.permissions'],
    });
    if (!clinicDbUser) {
      throw new UnauthorizedException(
        this.translationService.t('Invalid credentials'),
      );
    }

    const isPasswordValid = await bcrypt.compare(
      clinicLoginDto.password,
      clinicDbUser.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException(
        this.translationService.t('Invalid credentials'),
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _password, ...result } = clinicDbUser;

    await this.clinicsService.updateLastActive(clinic.id);

    const payload = {
      sub: clinicDbUser.id,
      role_id: clinicDbUser.role_id,
      database_name: clinic.database_name,
      clinic_id: clinic.id,
      role_slug: clinicDbUser.role?.slug,
    };

    const dashboard = await this.getDashboardStatsFromDataSource(
      clinicDataSource,
    );

    return {
      ...result,
      access_token: this.jwtService.sign(payload),
      dashboard: {
        total_appointments_last_7_days: dashboard.total_appointments_last_7_days,
        total_revenue_last_7_days: dashboard.total_revenue_last_7_days,
        doctor_workload_today: dashboard.doctor_workload_today,
        cancellations_last_7_days: dashboard.cancellations_last_7_days,
      },
    };
  }

  /**
   * Clinic login with clinic_id from path (tenant context set by guard). Kept for backward compatibility.
   */
  async login(clinicId: number, clinicLoginDto: ClinicLoginDto) {
    const clinic = await this.clinicsService.findOneWithoutRelations(clinicId);
    if (!clinic?.database_name) {
      throw new NotFoundException('Clinic not found');
    }

    const userRepository =
      await this.tenantRepositoryService.getRepository<ClinicUser>(ClinicUser);

    const clinicDbUser = await userRepository.findOne({
      where: { phone: clinicLoginDto.phone },
      relations: ['role', 'role.permissions'],
    });

    if (!clinicDbUser) {
      throw new UnauthorizedException(
        this.translationService.t('Invalid credentials'),
      );
    }

    const isPasswordValid = await bcrypt.compare(
      clinicLoginDto.password,
      clinicDbUser.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException(
        this.translationService.t('Invalid credentials'),
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _password, ...result } = clinicDbUser;

    await this.clinicsService.updateLastActive(clinicId);

    const payload = {
      sub: clinicDbUser.id,
      role_id: clinicDbUser.role_id,
      database_name: clinic.database_name,
      clinic_id: clinicId,
      role_slug: clinicDbUser.role?.slug,
    };

    const dashboard = await this.getClinicDashboardStats();

    return {
      ...result,
      access_token: this.jwtService.sign(payload),
      dashboard: {
        total_appointments_last_7_days: dashboard.total_appointments_last_7_days,
        total_revenue_last_7_days: dashboard.total_revenue_last_7_days,
        doctor_workload_today: dashboard.doctor_workload_today,
        cancellations_last_7_days: dashboard.cancellations_last_7_days,
      },
    };
  }

  /**
   * Doctor login: identify by email or phone, resolve clinic from main doctors table, validate password in clinic DB, return clinic JWT + dashboard.
   */
  async doctorLogin(dto: DoctorLoginDto) {
    const identifier = (dto.user_name ?? '').trim();
    if (!identifier) {
      throw new BadRequestException('user_name is required');
    }

    const mainDoctor = await this.mainDoctorsService.findOneByEmailOrPhone(
      identifier,
    );
    if (!mainDoctor) {
      throw new UnauthorizedException(
        this.translationService.t('Invalid credentials'),
      );
    }

    const clinic = await this.clinicsService.findOneWithoutRelations(
      mainDoctor.clinic_id,
    );
    if (!clinic?.database_name) {
      throw new NotFoundException('Clinic not found');
    }

    console.info('clinic', clinic);

    const clinicDataSource =
      await this.tenantDataSourceService.getTenantDataSource(
        clinic.database_name,
      );
    if (!clinicDataSource) {
      throw new NotFoundException('Clinic database not available');
    }

    const clinicUserRepo = clinicDataSource.getRepository(ClinicUser);
    const clinicDbUser = await clinicUserRepo.findOne({
      where: [{ email: identifier }, { phone: identifier }],
      relations: ['role', 'role.permissions'],
    });
    if (!clinicDbUser) {
      throw new UnauthorizedException(
        this.translationService.t('Invalid credentials'),
      );
    }
    const isPasswordValid = await bcrypt.compare(
      dto.password,
      clinicDbUser.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException(
        this.translationService.t('Invalid credentials'),
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _password, ...result } = clinicDbUser;

    await this.clinicsService.updateLastActive(clinic.id);

    const payload = {
      sub: clinicDbUser.id,
      role_id: clinicDbUser.role_id,
      database_name: clinic.database_name,
      clinic_id: clinic.id,
      role_slug: clinicDbUser.role?.slug,
    };

    const dashboard = await this.getDashboardStatsFromDataSource(
      clinicDataSource,
    );

    return {
      ...result,
      access_token: this.jwtService.sign(payload),
      dashboard: {
        total_appointments_last_7_days: dashboard.total_appointments_last_7_days,
        total_revenue_last_7_days: dashboard.total_revenue_last_7_days,
        doctor_workload_today: dashboard.doctor_workload_today,
        cancellations_last_7_days: dashboard.cancellations_last_7_days,
      },
    };
  }

  /**
   * Forgot password: find user by email in clinic DB, generate short-lived reset token.
   * Returns generic message (do not leak whether email exists). Optionally return token for development.
   */
  async forgotPassword(clinicId: number, dto: ForgotPasswordDto) {
    const clinic = await this.clinicsService.findOneWithoutRelations(clinicId);
    if (!clinic?.database_name) {
      throw new NotFoundException('Clinic not found');
    }

    const clinicDataSource =
      await this.tenantDataSourceService.getTenantDataSource(
        clinic.database_name,
      );
    if (!clinicDataSource) {
      throw new NotFoundException('Clinic database not available');
    }

    const userRepo = clinicDataSource.getRepository(ClinicUser);
    const user = await userRepo.findOne({
      where: { email: dto.email.trim() },
    });

    const message =
      'If an account exists with this email, you will receive instructions to reset your password.';

    if (!user) {
      return { message };
    }

    const resetPayload = {
      purpose: 'password-reset',
      sub: user.id,
      clinic_id: clinicId,
      database_name: clinic.database_name,
    };
    const resetToken = this.jwtService.sign(resetPayload, { expiresIn: '1h' });

    // In production: send email with link containing resetToken. For now return token for development.
    return {
      message,
      reset_token: resetToken,
    };
  }

  /**
   * Reset password: verify reset token, update user password in clinic DB.
   * Caller must have permission CanResetPassword (e.g. admin or staff).
   */
  async resetPassword(clinicId: number, dto: ResetPasswordDto) {
    let decoded: {
      purpose?: string;
      sub?: number;
      clinic_id?: number;
      database_name?: string;
    };
    try {
      decoded = this.jwtService.verify(dto.token);
    } catch {
      throw new BadRequestException('Invalid or expired reset token');
    }

    if (decoded.purpose !== 'password-reset' || decoded.sub == null) {
      throw new BadRequestException('Invalid reset token');
    }
    if (decoded.clinic_id !== clinicId) {
      throw new BadRequestException('Token does not match this clinic');
    }

    const clinic = await this.clinicsService.findOneWithoutRelations(clinicId);
    if (!clinic?.database_name || clinic.database_name !== decoded.database_name) {
      throw new NotFoundException('Clinic not found');
    }

    const clinicDataSource =
      await this.tenantDataSourceService.getTenantDataSource(
        clinic.database_name,
      );
    if (!clinicDataSource) {
      throw new NotFoundException('Clinic database not available');
    }

    const userRepo = clinicDataSource.getRepository(ClinicUser);
    const user = await userRepo.findOne({ where: { id: decoded.sub } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const hashedPassword = await bcrypt.hash(dto.new_password, 10);
    user.password = hashedPassword;
    await userRepo.save(user);

    return { message: 'Password has been reset successfully.' };
  }

  /**
   * Admin reset password: set a user's password without token. Caller must have CanResetPassword.
   */
  async adminResetPassword(
    clinicId: number,
    userId: number,
    newPassword: string,
  ) {
    const clinic = await this.clinicsService.findOneWithoutRelations(clinicId);
    if (!clinic?.database_name) {
      throw new NotFoundException('Clinic not found');
    }

    const clinicDataSource =
      await this.tenantDataSourceService.getTenantDataSource(
        clinic.database_name,
      );
    if (!clinicDataSource) {
      throw new NotFoundException('Clinic database not available');
    }

    const userRepo = clinicDataSource.getRepository(ClinicUser);
    const user = await userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await userRepo.save(user);

    return { message: 'Password has been reset successfully.' };
  }
}

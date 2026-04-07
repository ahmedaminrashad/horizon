import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { ClinicsService } from '../../clinics/clinics.service';
import { TenantRepositoryService } from '../../database/tenant-repository.service';
import { TenantDataSourceService } from '../../database/tenant-data-source.service';
import { DoctorsService as MainDoctorsService } from '../../doctors/doctors.service';
import { User as ClinicUser } from '../permissions/entities/user.entity';
import { Doctor as ClinicDoctor } from '../doctors/entities/doctor.entity';
import { Reservation, ReservationStatus } from '../reservations/entities/reservation.entity';
import { ClinicLoginDto } from './dto/clinic-login.dto';
import { DoctorLoginDto } from './dto/doctor-login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { TranslationService } from '../../common/services/translation.service';
import { MailService } from '../../mail/mail.service';
import { PasswordResetTokenService } from '../../password-reset/password-reset-token.service';
import {
  DoctorProfileNextReservationDto,
  DoctorProfileNextReservationBranchDto,
} from '../doctors/dto/profile/doctor-profile-next-reservation.dto';

@Injectable()
export class ClinicAuthService {
  constructor(
    private clinicsService: ClinicsService,
    private jwtService: JwtService,
    private tenantRepositoryService: TenantRepositoryService,
    private tenantDataSourceService: TenantDataSourceService,
    private mainDoctorsService: MainDoctorsService,
    private translationService: TranslationService,
    private mailService: MailService,
    private configService: ConfigService,
    private passwordResetTokenService: PasswordResetTokenService,
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
   * When doctorId is provided, all stats are scoped to that doctor.
   */
  private async getDashboardStatsFromDataSource(
    dataSource: DataSource,
    doctorId?: number,
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

    const q1 = reservationRepo
      .createQueryBuilder('r')
      .where('r.date >= :from', { from: sevenDaysAgo })
      .andWhere('r.date < :to', { to: tomorrow })
      .andWhere('r.status != :cancelled', {
        cancelled: ReservationStatus.CANCELLED,
      });
    if (doctorId != null) q1.andWhere('r.doctor_id = :doctorId', { doctorId });

    const q2 = reservationRepo
      .createQueryBuilder('r')
      .select('COALESCE(SUM(r.fees), 0)', 'total')
      .where('r.date >= :from', { from: sevenDaysAgo })
      .andWhere('r.date < :to', { to: tomorrow })
      .andWhere('r.status != :cancelled', {
        cancelled: ReservationStatus.CANCELLED,
      });
    if (doctorId != null) q2.andWhere('r.doctor_id = :doctorId', { doctorId });

    const q3 = reservationRepo
      .createQueryBuilder('r')
      .where('r.date >= :today', { today })
      .andWhere('r.date < :tomorrow', { tomorrow })
      .andWhere('r.status != :cancelled', {
        cancelled: ReservationStatus.CANCELLED,
      });
    if (doctorId != null) q3.andWhere('r.doctor_id = :doctorId', { doctorId });

    const q4 = reservationRepo
      .createQueryBuilder('r')
      .where('r.date >= :from', { from: sevenDaysAgo })
      .andWhere('r.date < :to', { to: tomorrow })
      .andWhere('r.status = :cancelled', {
        cancelled: ReservationStatus.CANCELLED,
      });
    if (doctorId != null) q4.andWhere('r.doctor_id = :doctorId', { doctorId });

    const [
      totalAppointmentsLast7Days,
      totalRevenueResult,
      doctorWorkloadToday,
      cancellationsLast7Days,
    ] = await Promise.all([
      q1.getCount(),
      q2.getRawOne<{ total: string }>(),
      q3.getCount(),
      q4.getCount(),
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
   * Get next upcoming reservation for a doctor (date >= today, not cancelled).
   */
  private async getNextReservationForDoctor(
    dataSource: DataSource,
    doctorId: number,
  ): Promise<DoctorProfileNextReservationDto | null> {
    if (!doctorId) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().slice(0, 10);
    const reservationRepo = dataSource.getRepository(Reservation);
    const notCancelled = await reservationRepo
      .createQueryBuilder('r')
      .where('r.doctor_id = :doctorId', { doctorId })
      .andWhere('r.date >= :today', { today: todayStr })
      .andWhere('r.status != :cancelled', {
        cancelled: ReservationStatus.CANCELLED,
      })
      .orderBy('r.date', 'ASC')
      .addOrderBy('r.createdAt', 'ASC')
      .leftJoinAndSelect('r.patient', 'patient')
      .leftJoinAndSelect('r.doctor_working_hour', 'wh')
      .leftJoinAndSelect('wh.branch', 'whBranch')
      .take(1)
      .getOne();

    if (!notCancelled) return null;

    const wh = notCancelled.doctor_working_hour;
    const patient = notCancelled.patient as { name?: string } | undefined;
    const dateStr =
      notCancelled.date instanceof Date
        ? notCancelled.date.toISOString().slice(0, 10)
        : String(notCancelled.date).slice(0, 10);
    const nextDto = new DoctorProfileNextReservationDto();
    nextDto.id = notCancelled.id;
    nextDto.date = dateStr;
    nextDto.time = wh?.start_time ?? null;
    nextDto.time_range =
      wh != null
        ? { from: wh.start_time, to: wh.end_time }
        : { from: null, to: null };
    nextDto.patient_id = notCancelled.patient_id;
    nextDto.patient_name = patient?.name ?? null;
    nextDto.status = notCancelled.status;
    nextDto.fees = Number(notCancelled.fees);
    nextDto.paid = notCancelled.paid;
    nextDto.appoint_type = notCancelled.appoint_type ?? null;
    nextDto.medical_status = notCancelled.medical_status ?? null;
    if (wh?.branch != null) {
      nextDto.branch = Object.assign(
        new DoctorProfileNextReservationBranchDto(),
        { id: wh.branch.id, name: wh.branch.name },
      );
    }
    return nextDto;
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
      clinic_id: clinic.id,
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
      clinic_id: clinicId,
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

    const clinicDoctorRepo = clinicDataSource.getRepository(ClinicDoctor);
    const clinicDoctor = await clinicDoctorRepo.findOne({
      where: { user_id: clinicDbUser.id },
    });
    const doctorIdForReservations = clinicDoctor?.id ?? mainDoctor.clinic_doctor_id;

    const payload = {
      sub: clinicDbUser.id,
      role_id: clinicDbUser.role_id,
      database_name: clinic.database_name,
      clinic_id: clinic.id,
      role_slug: clinicDbUser.role?.slug,
      doctor_id: doctorIdForReservations ?? null,
    };

    const [dashboard, next_reservation] = await Promise.all([
      this.getDashboardStatsFromDataSource(
        clinicDataSource,
        doctorIdForReservations,
      ),
      this.getNextReservationForDoctor(
        clinicDataSource,
        doctorIdForReservations,
      ),
    ]);


    const strOrEmpty = (v: string | number | null | undefined): string =>
      v === null || v === undefined ? '' : String(v);

    return {
      ...result,
      access_token: this.jwtService.sign(payload),
      clinic_id: clinic.id,
      clinic_name: clinic.name_en ?? clinic.name_ar ?? null,
      doctor_id: doctorIdForReservations ?? null,
      specialty: clinicDoctor?.specialty ?? null,
      bio: strOrEmpty(clinicDoctor?.bio),
      rate: strOrEmpty(clinicDoctor?.rate),
      experience_years: strOrEmpty(clinicDoctor?.experience_years),
      number_of_patients: strOrEmpty(clinicDoctor?.number_of_patients),
      dashboard: {
        total_appointments_last_7_days: dashboard.total_appointments_last_7_days,
        total_revenue_last_7_days: dashboard.total_revenue_last_7_days,
        doctor_workload_today: dashboard.doctor_workload_today,
        cancellations_last_7_days: dashboard.cancellations_last_7_days,
      },
      next_reservation,
      doctor_avatar:
        clinicDoctor?.avatar ??
        (mainDoctor as { avatar?: string })?.avatar ??
        null,
    };
  }

  /**
   * Forgot password: find user by email in clinic DB, generate short-lived reset token.
   * Returns generic message only (no reset_token in JSON).
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

    const resetCode = await this.passwordResetTokenService.issueClinicResetCode(
      clinicDataSource,
      user.id,
    );

    const clinicPath = this.configService.get<string>(
      'CLINIC_PASSWORD_RESET_PATH',
      '/clinic/reset-password',
    );
    await this.mailService.sendPasswordResetEmail(user.email, resetCode, {
      clinicId,
      path: clinicPath,
      subject: 'Clinic account password reset',
    });

    return { message };
  }

  /**
   * Doctor forgot password: resolve `clinic_id` + `clinic_doctor_id` from main `doctors` by email,
   * load clinic tenant doctor by id, then clinic `users` via `doctor.user_id`. No clinic id in URL.
   */
  async doctorForgotPassword(dto: {
    email: string;
  }): Promise<{ message: string }> {
    const message =
      'If a doctor account exists with this email, you will receive instructions to reset your password.';

    const mainDoctor = await this.mainDoctorsService.findMainDoctorByEmailForPasswordReset(
      dto.email,
    );
    if (
      !mainDoctor?.clinic_id ||
      mainDoctor.clinic_doctor_id == null
    ) {
      return { message };
    }

    const clinicId = mainDoctor.clinic_id;
    const clinic = await this.clinicsService.findOneWithoutRelations(clinicId);
    if (!clinic?.database_name) {
      return { message };
    }

    const clinicDataSource =
      await this.tenantDataSourceService.getTenantDataSource(
        clinic.database_name,
      );
    if (!clinicDataSource) {
      return { message };
    }

    const doctorRepo = clinicDataSource.getRepository(ClinicDoctor);
    const clinicDoctor = await doctorRepo.findOne({
      where: {
        id: mainDoctor.clinic_doctor_id,
        clinic_id: clinicId,
      },
    });
    if (!clinicDoctor?.user_id) {
      return { message };
    }

    const userRepo = clinicDataSource.getRepository(ClinicUser);
    const user = await userRepo.findOne({
      where: { id: clinicDoctor.user_id },
    });
    if (!user) {
      return { message };
    }

    const resetCode = await this.passwordResetTokenService.issueClinicResetCode(
      clinicDataSource,
      user.id,
    );

    const doctorPath = this.configService.get<string>(
      'CLINIC_DOCTOR_PASSWORD_RESET_PATH',
      '/clinic/doctor/reset-password',
    );
    await this.mailService.sendPasswordResetEmail(user.email, resetCode, {
      clinicId,
      path: doctorPath,
      subject: 'Doctor password reset',
    });

    return { message };
  }

  /**
   * Reset password: verify 6-digit code from email, update clinic `users` password.
   * With `clinicIdFromRoute` (e.g. /clinic/:clinicId/auth/reset-password), user is resolved by email in that tenant.
   * Without it (POST /clinic/doctor/reset-password), clinic is resolved from main `doctors` by the same email as forgot-password.
   */
  async resetPassword(
    dto: ResetPasswordDto,
    clinicIdFromRoute?: number,
  ) {
    const email = dto.email.trim();

    let clinicId: number;
    let user: ClinicUser | null = null;

    const mainDoctorForDoctorFlow =
      clinicIdFromRoute == null
        ? await this.mainDoctorsService.findMainDoctorByEmailForPasswordReset(
            email,
          )
        : null;

    if (clinicIdFromRoute != null) {
      clinicId = clinicIdFromRoute;
    } else {
      if (
        !mainDoctorForDoctorFlow?.clinic_id ||
        mainDoctorForDoctorFlow.clinic_doctor_id == null
      ) {
        throw new BadRequestException('Invalid or expired reset code');
      }
      clinicId = mainDoctorForDoctorFlow.clinic_id;
    }

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

    if (clinicIdFromRoute != null) {
      user = await userRepo.findOne({
        where: { email },
      });
    } else if (mainDoctorForDoctorFlow) {
      const doctorRepo = clinicDataSource.getRepository(ClinicDoctor);
      const clinicDoctor = await doctorRepo.findOne({
        where: { id: mainDoctorForDoctorFlow.clinic_doctor_id },
      });
      if (!clinicDoctor?.user_id) {
        throw new BadRequestException('Invalid or expired reset code');
      }
      user = await userRepo.findOne({
        where: { id: clinicDoctor.user_id },
      });
    }

    if (!user) {
      throw new BadRequestException('Invalid or expired reset code');
    }

    await this.passwordResetTokenService.validateAndConsumeClinicCode(
      clinicDataSource,
      user.id,
      dto.code,
    );

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

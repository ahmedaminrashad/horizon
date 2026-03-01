import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Repository, In, Not, DataSource } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { TenantRepositoryService } from '../../database/tenant-repository.service';
import { TenantDataSourceService } from '../../database/tenant-data-source.service';
import { Reservation, ReservationStatus } from './entities/reservation.entity';
import { Reservation as MainReservation, ReservationStatus as MainReservationStatus } from '../../reservations/entities/reservation.entity';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { CreateMainUserReservationDto } from './dto/create-main-user-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { Doctor } from '../doctors/entities/doctor.entity';
import { DoctorsService as MainDoctorsService } from '../../doctors/doctors.service';
import { BranchesService as MainBranchesService } from '../../branches/branches.service';
import { DoctorBranchesService } from '../doctor-branches/doctor-branches.service';
import { DoctorWorkingHour } from '../working-hours/entities/doctor-working-hour.entity';
import { DayOfWeek } from '../working-hours/entities/working-hour.entity';
import { User as ClinicUser } from '../permissions/entities/user.entity';
import { ClinicUser as ClinicUserLink } from '../../clinics/entities/clinic-user.entity';
import { ClinicsService } from '../../clinics/clinics.service';
import { UsersService } from '../../users/users.service';
import { PatientQuestionAnswersService } from '../patient-question-answers/patient-question-answers.service';
import { stripPasswordFromUser, sanitizeUserInEntity } from '../../common/utils/user.utils';
import * as bcrypt from 'bcrypt';

@Injectable()
export class ReservationsService {
  constructor(
    private tenantRepositoryService: TenantRepositoryService,
    private tenantDataSourceService: TenantDataSourceService,
    private mainDoctorsService: MainDoctorsService,
    private mainBranchesService: MainBranchesService,
    private doctorBranchesService: DoctorBranchesService,
    private clinicsService: ClinicsService,
    private usersService: UsersService,
    private patientQuestionAnswersService: PatientQuestionAnswersService,
    @InjectRepository(MainReservation)
    private mainReservationRepository: Repository<MainReservation>,
    @InjectRepository(ClinicUserLink)
    private clinicUserLinkRepository: Repository<ClinicUserLink>,
    private dataSource: DataSource,
  ) {}

  /**
   * Get repository for the current tenant context
   */
  private async getRepository(): Promise<Repository<Reservation>> {
    const repository = await this.tenantRepositoryService.getRepository<Reservation>(
      Reservation,
    );

    if (!repository) {
      throw new BadRequestException(
        'Clinic context not found. Please ensure you are accessing this endpoint as a clinic user.',
      );
    }

    return repository;
  }

  /**
   * Resolve main user id to clinic user id (users.id in clinic tenant DB).
   * Uses existing clinic_user link if present; otherwise finds or creates a user in the clinic DB by phone and sets the link.
   */
  private async getOrCreateClinicUserIdForMainUser(
    mainUserId: number,
    clinicId: number,
  ): Promise<number> {
    const existing = await this.clinicsService.getClinicUserIdForMainUser(
      mainUserId,
      clinicId,
    );
    if (existing != null) return existing;

    const mainUser = await this.usersService.findOne(mainUserId);
    if (!mainUser) {
      throw new NotFoundException('User not found');
    }

    const clinicUserRepository =
      await this.tenantRepositoryService.getRepository<ClinicUser>(ClinicUser);
    if (!clinicUserRepository) {
      throw new BadRequestException(
        'Clinic context not found. Cannot resolve patient to clinic user.',
      );
    }

    let clinicUser = await clinicUserRepository.findOne({
      where: { phone: mainUser.phone },
    });

    if (!clinicUser) {
      if (mainUser.email) {
        const existingByEmail = await clinicUserRepository.findOne({
          where: { email: mainUser.email },
        });
        if (existingByEmail) {
          throw new BadRequestException(
            'User with this email already exists in clinic',
          );
        }
      }
      const randomPassword = await bcrypt.hash(
        Math.random().toString(36).slice(-8),
        10,
      );
      clinicUser = clinicUserRepository.create({
        name: mainUser.name ?? undefined,
        phone: mainUser.phone,
        email: mainUser.email ?? undefined,
        password: randomPassword,
        package_id: 0,
      });
      clinicUser = await clinicUserRepository.save(clinicUser);
    }

    await this.clinicsService.setClinicUserIdForMainUser(
      mainUserId,
      clinicId,
      clinicUser.id,
    );
    return clinicUser.id;
  }

  /**
   * Get reservation fees from doctor service price (working hour's first linked doctor_service, if any).
   * Returns 0 if no doctor service or price is null/undefined.
   */
  private getFeesFromDoctorService(
    doctorService: { price?: number | string | null } | null | undefined,
  ): number {
    if (doctorService?.price == null) return 0;
    const n = Number(doctorService.price);
    return Number.isFinite(n) ? n : 0;
  }

  /**
   * Get last_visit and next_visit dates per patient (clinic DB).
   */
  private async getClinicPatientVisitDates(
    repository: Repository<Reservation>,
    patientIds: number[],
  ): Promise<Map<number, { last_visit: Date | null; next_visit: Date | null }>> {
    const map = new Map<
      number,
      { last_visit: Date | null; next_visit: Date | null }
    >();
    if (patientIds.length === 0) return map;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeStatuses = [
      ReservationStatus.PENDING,
      ReservationStatus.SCHEDULED,
      ReservationStatus.TAKEN,
    ];

    const lastVisits = await repository
      .createQueryBuilder('r')
      .select('r.patient_id', 'patient_id')
      .addSelect('MAX(r.date)', 'last_date')
      .where('r.patient_id IN (:...ids)', { ids: patientIds })
      .andWhere('r.date < :today', { today })
      .groupBy('r.patient_id')
      .getRawMany<{ patient_id: number; last_date: Date }>();

    const nextVisits = await repository
      .createQueryBuilder('r')
      .select('r.patient_id', 'patient_id')
      .addSelect('MIN(r.date)', 'next_date')
      .where('r.patient_id IN (:...ids)', { ids: patientIds })
      .andWhere('r.date >= :today', { today })
      .andWhere('r.status IN (:...statuses)', { statuses: activeStatuses })
      .groupBy('r.patient_id')
      .getRawMany<{ patient_id: number; next_date: Date }>();

    for (const id of patientIds) {
      const last = lastVisits.find((r) => r.patient_id === id);
      const next = nextVisits.find((r) => r.patient_id === id);
      map.set(id, {
        last_visit: last?.last_date ? new Date(last.last_date) : null,
        next_visit: next?.next_date ? new Date(next.next_date) : null,
      });
    }
    return map;
  }

  /**
   * Get last_visit and next_visit for a main user from main reservations.
   */
  private async getMainUserVisitDates(mainUserId: number): Promise<{
    last_visit: Date | null;
    next_visit: Date | null;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const last = await this.mainReservationRepository
      .createQueryBuilder('r')
      .select('MAX(r.date)', 'd')
      .where('r.main_user_id = :uid', { uid: mainUserId })
      .andWhere('r.date < :today', { today })
      .getRawOne<{ d: Date }>();

    const next = await this.mainReservationRepository
      .createQueryBuilder('r')
      .select('MIN(r.date)', 'd')
      .where('r.main_user_id = :uid', { uid: mainUserId })
      .andWhere('r.date >= :today', { today })
      .andWhere('r.status IN (:...s)', {
        s: [
          MainReservationStatus.PENDING,
          MainReservationStatus.SCHEDULED,
          MainReservationStatus.TAKEN,
        ],
      })
      .getRawOne<{ d: Date }>();

    return {
      last_visit: last?.d ? new Date(last.d) : null,
      next_visit: next?.d ? new Date(next.d) : null,
    };
  }

  /**
   * Map clinic reservation entity to response with time, names, time_range, schedule_type, appoint_type, patient last/next visit, patient_answers.
   */
  private mapClinicReservationToResponse(
    r: Reservation,
    visitDates: Map<
      number,
      { last_visit: Date | null; next_visit: Date | null }
    >,
    patientAnswers?: { id: number; question_id: number; is_answer_yes: boolean | null; comment: string | null; question?: { content_en?: string; content_ar?: string } }[],
  ) {
    const wh = r.doctor_working_hour;
    const visits = visitDates.get(r.patient_id) ?? {
      last_visit: null,
      next_visit: null,
    };
    const patient = r.patient as { name?: string } | undefined;
    const doctor = r.doctor as {
      user?: { name?: string };
      appointment_types?: string[];
    } | undefined;
    return {
      ...r,
      doctor: r.doctor ? sanitizeUserInEntity(r.doctor) : r.doctor,
      patient: r.patient != null ? stripPasswordFromUser(r.patient as unknown as Record<string, unknown>) : r.patient,
      time: wh?.start_time ?? null,
      time_range:
        wh != null
          ? { from: wh.start_time, to: wh.end_time }
          : { from: null, to: null },
      doctor_name: doctor?.user?.name ?? null,
      patient_name: patient?.name ?? null,
      service: null,
      schedule_type:
        wh != null ? (wh.waterfall ? 'waterfall' : 'fixed') : null,
      appoint_type: r.appoint_type ?? null,
      medical_status: r.medical_status ?? null,
      appointment_types: doctor?.appointment_types ?? null,
      patient_last_visit: visits.last_visit,
      patient_next_visit: visits.next_visit,
      patient_answers: patientAnswers ?? [],
    } as unknown as Reservation;
  }

  /**
   * Map main reservation to response with time, names, time_range, appoint_type, patient last/next visit.
   */
  private mapMainReservationToResponse(
    r: MainReservation,
    visitDates: { last_visit: Date | null; next_visit: Date | null },
  ) {
    const doctor = r.doctor as { name?: string } | undefined;
    const mainUser = r.mainUser as { name?: string } | undefined;
    return {
      ...r,
      time: r.from_time ?? null,
      time_range: {
        from: r.from_time ?? null,
        to: r.to_time ?? null,
      },
      doctor_name: doctor?.name ?? null,
      patient_name: mainUser?.name ?? null,
      service: null,
      schedule_type: null,
      appoint_type: r.appoint_type ?? null,
      patient_last_visit: visitDates.last_visit,
      patient_next_visit: visitDates.next_visit,
    };
  }

  async create(
    clinicId: number,
    createReservationDto: CreateReservationDto,
    authenticatedUserId: number,
    isMainUser: boolean = false,
  ): Promise<Reservation> {
    // patient_id must reference clinic DB users.id. Use clinic_user_id from body when provided; otherwise resolve from authenticated user.
    let patientId: number;
    if (createReservationDto.clinic_user_id != null) {
      patientId = createReservationDto.clinic_user_id;
    } else if (isMainUser) {
      patientId = await this.getOrCreateClinicUserIdForMainUser(
        authenticatedUserId,
        clinicId,
      );
    } else {
      patientId = authenticatedUserId;
    }

    const repository = await this.getRepository();

    // Parse the date from the request
    const reservationDate = new Date(createReservationDto.date);
    // Set time to start of day to ensure it's a date only
    reservationDate.setHours(0, 0, 0, 0);
    
    // Validate that reservation date is not in the past
    this.validateReservationDate(reservationDate);
    
    // Get working hour first for validation
    const workingHour = await this.getWorkingHourForValidation(
      createReservationDto.doctor_working_hour_id,
      createReservationDto.doctor_id,
    );
    
    // Validate and enforce waterfall rules for working hour
    await this.validateWorkingHourReservation(
      createReservationDto.doctor_working_hour_id,
      createReservationDto.doctor_id,
      reservationDate,
    );
    
    const fees = this.getFeesFromDoctorService(workingHour.doctor_services?.[0]);

    const { clinic_user_id: _clinicUserId, ...dtoWithoutClinicUserId } = createReservationDto;
    const reservation = repository.create({
      ...dtoWithoutClinicUserId,
      patient_id: patientId,
      date: reservationDate, // Date only
      status: ReservationStatus.PENDING, // Always default to PENDING
      paid: false, // Default to false
      fees, // From doctor service linked to working hour
    });

    const savedReservation = await repository.save(reservation);

    // Increment doctor's number_of_patients only when this is the first reservation for this patient with this doctor
    await this.incrementDoctorPatientCount(
      clinicId,
      createReservationDto.doctor_id,
      patientId,
    );

    // If working hour is waterfall, set busy to true
    if (!workingHour.waterfall) {
      await this.updateWorkingHourBusyStatus(
        createReservationDto.doctor_working_hour_id,
        true,
      );
    }
    

    // Reload reservation with relations for response
    const reservationWithRelations = await repository.findOne({
      where: { id: savedReservation.id },
      relations: ['doctor', 'doctor.user', 'patient', 'doctor_working_hour'],
    });

    // Sync to main reservations table
    await this.syncToMainReservations(
      clinicId,
      reservationWithRelations || savedReservation,
    );

    const r = reservationWithRelations || savedReservation;
    const visitDates = await this.getClinicPatientVisitDates(repository, [
      r.patient_id,
    ]);
    return this.mapClinicReservationToResponse(r, visitDates);
  }

  /**
   * Validate that reservation date is not in the past
   */
  private validateReservationDate(reservationDate: Date): void {
    const now = new Date();
    // Set time to start of day for comparison (ignore time component)
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const reservationDay = new Date(
      reservationDate.getFullYear(),
      reservationDate.getMonth(),
      reservationDate.getDate(),
    );

    if (reservationDay < today) {
      throw new BadRequestException(
        'Reservation date cannot be in the past. Please select today or a future date.',
      );
    }
  }

  /**
   * Get working hour for validation (without full validation)
   */
  private async getWorkingHourForValidation(
    workingHourId: number,
    doctorId: number,
  ): Promise<DoctorWorkingHour> {
    // Get working hour repository
    const workingHourRepository = await this.tenantRepositoryService.getRepository<DoctorWorkingHour>(
      DoctorWorkingHour,
    );

    if (!workingHourRepository) {
      throw new BadRequestException(
        'Clinic context not found. Please ensure you are accessing this endpoint as a clinic user.',
      );
    }

    // Get the working hour with doctor_services for fees
    const workingHour = await workingHourRepository.findOne({
      where: { id: workingHourId },
      relations: ['doctor_services'],
    });

    if (!workingHour) {
      throw new NotFoundException(
        `Working hour with ID ${workingHourId} not found`,
      );
    }

    // Verify the working hour belongs to the doctor
    if (workingHour.doctor_id !== doctorId) {
      throw new BadRequestException(
        `Working hour ${workingHourId} does not belong to doctor ${doctorId}`,
      );
    }

    // Check if working hour is active
    if (!workingHour.is_active) {
      throw new BadRequestException(
        `Working hour ${workingHourId} is not active`,
      );
    }

    return workingHour;
  }

  /**
   * Validate working hour reservation based on waterfall setting
   * Returns the working hour object for use in reservation creation
   */
  private async validateWorkingHourReservation(
    workingHourId: number,
    doctorId: number,
    reservationDate: Date,
    excludeReservationId?: number, // For update operations, exclude current reservation
  ): Promise<DoctorWorkingHour> {
    // Get working hour
    const workingHour = await this.getWorkingHourForValidation(
      workingHourId,
      doctorId,
    );

    // Validate that reservation date matches the working hour day
    const reservationDay = this.getDayOfWeek(reservationDate);

    // Check if reservation day matches working hour day
    if (reservationDay !== workingHour.day) {
      throw new BadRequestException(
        `Reservation day (${reservationDay}) does not match working hour day (${workingHour.day})`,
      );
    }

    // Get reservation repository to check existing reservations
    const reservationRepository = await this.getRepository();

    // Check existing reservations for this working hour on the same date
    const whereConditions: any = {
      doctor_working_hour_id: workingHourId,
      status: In([ReservationStatus.SCHEDULED, ReservationStatus.TAKEN, ReservationStatus.PENDING]),
      date: reservationDate,
    };

    if (excludeReservationId) {
      whereConditions.id = Not(excludeReservationId);
    }

    const existingReservations = await reservationRepository.find({
      where: whereConditions,
    });

    // Check patient limit based on waterfall setting
    if (workingHour.waterfall) {
      // For waterfall working hours, allow multiple reservations up to patients_limit on the same date
      if (workingHour.patients_limit !== null && existingReservations.length >= workingHour.patients_limit) {
        throw new BadRequestException(
          `Working hour ${workingHourId} has reached its patient limit (${workingHour.patients_limit}) for this date. Maximum ${workingHour.patients_limit} reservation(s) allowed per day for waterfall working hours.`,
        );
      }
    } else {
      // If waterfall is false, only allow 1 reservation (patients_limit should be 1)
      if (existingReservations.length > 0) {
        throw new BadRequestException(
          `Working hour ${workingHourId} has already a reservation for this time. Only one reservation is allowed for non-waterfall working hours.`,
        );
      }
    }
    // Return the working hour so fees can be used
    return workingHour;
  }

  /**
   * Update working hour busy status
   */
  private async updateWorkingHourBusyStatus(
    workingHourId: number,
    busy: boolean,
  ): Promise<void> {
    try {
      // Get working hour repository
      const workingHourRepository = await this.tenantRepositoryService.getRepository<DoctorWorkingHour>(
        DoctorWorkingHour,
      );

      if (!workingHourRepository) {
        return; // Silently fail if repository not available
      }

      // Get the working hour
      const workingHour = await workingHourRepository.findOne({
        where: { id: workingHourId },
      });

      if (!workingHour) {
        return; // Silently fail if working hour not found
      }

      // Update busy status
      workingHour.busy = busy;
      await workingHourRepository.save(workingHour);
    } catch (error) {
      // Log error but don't fail the reservation creation
      console.error(
        `Failed to update working hour busy status for working hour ${workingHourId}:`,
        error,
      );
    }
  }

  /**
   * Get day of week from Date object (0 = Sunday, 1 = Monday, etc.)
   * Convert to DayOfWeek enum format
   */
  private getDayOfWeek(date: Date): DayOfWeek {
    const dayMap: { [key: number]: DayOfWeek } = {
      0: DayOfWeek.SUNDAY,
      1: DayOfWeek.MONDAY,
      2: DayOfWeek.TUESDAY,
      3: DayOfWeek.WEDNESDAY,
      4: DayOfWeek.THURSDAY,
      5: DayOfWeek.FRIDAY,
      6: DayOfWeek.SATURDAY,
    };
    return dayMap[date.getDay()];
  }

  /**
   * Increment doctor's number_of_patients only when this is the first reservation for this patient with this doctor.
   * Then sync clinic doctor to main doctors table.
   */
  private async incrementDoctorPatientCount(
    clinicId: number,
    doctorId: number,
    patientId: number,
  ): Promise<void> {
    try {
      const reservationRepository =
        await this.tenantRepositoryService.getRepository<Reservation>(Reservation);
      const doctorRepository =
        await this.tenantRepositoryService.getRepository<Doctor>(Doctor);

      if (!reservationRepository || !doctorRepository) return;

      // Only increment if this is the first reservation for this patient with this doctor
      const count = await reservationRepository.count({
        where: { doctor_id: doctorId, patient_id: patientId },
      });
      if (count !== 1) return;

      const doctor = await doctorRepository.findOne({
        where: { id: doctorId },
        relations: ['user'],
      });

      if (doctor) {
        doctor.number_of_patients = (doctor.number_of_patients || 0) + 1;
        await doctorRepository.save(doctor);

        const doctorName = doctor.user?.name || '';
        const branchIds = await this.doctorBranchesService.getBranchIdsForDoctor(doctorId);
        const firstBranchId = branchIds[0];
        let mainBranchId: number | undefined;
        if (firstBranchId) {
          const mainBranch = await this.mainBranchesService.findByClinicBranchId(
            clinicId,
            firstBranchId,
          );
          mainBranchId = mainBranch?.id;
        }

        await this.mainDoctorsService.syncDoctor(clinicId, doctorId, {
          name: doctorName,
          age: doctor.age ?? undefined,
          avatar: doctor.avatar,
          email: doctor.user?.email,
          phone: doctor.user?.phone,
          department: doctor.department,
          license_number: doctor.license_number,
          degree: doctor.degree,
          languages: doctor.languages,
          bio: doctor.bio,
          appoint_type:
            Array.isArray(doctor.appointment_types) &&
            doctor.appointment_types.length > 0
              ? doctor.appointment_types[0]
              : undefined,
          is_active: doctor.is_active,
          branch_id: mainBranchId,
          experience_years: doctor.experience_years,
          number_of_patients: doctor.number_of_patients,
          rate: doctor.rate,
        });
      }
    } catch (error) {
      // Log error but don't fail the reservation creation
      console.error(`Failed to increment doctor patient count for doctor ${doctorId}:`, error);
    }
  }

  async findAll(
    clinicId: number,
    page: number = 1,
    limit: number = 10,
    filters?: {
      search?: string;
      from_date?: string;
      to_date?: string;
      doctor_id?: number;
      service_id?: number;
      status?: ReservationStatus;
      schedule_type?: 'waterfall' | 'fixed';
      appoint_type?: string;
      medical_status?: string;
    },
  ) {
    const repository = await this.getRepository();
    const skip = (page - 1) * limit;

    const qb = repository
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.doctor', 'doctor')
      .leftJoinAndSelect('doctor.user', 'doctorUser')
      .leftJoinAndSelect('r.patient', 'patient')
      .leftJoinAndSelect('r.doctor_working_hour', 'wh')
      .orderBy('r.date', 'DESC')
      .addOrderBy('r.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (filters?.search?.trim()) {
      const term = `%${filters.search.trim()}%`;
      qb.andWhere(
        '(patient.name ILIKE :searchTerm OR patient.phone ILIKE :searchTerm)',
        { searchTerm: term },
      );
    }
    if (filters?.from_date) {
      qb.andWhere('r.date >= :fromDate', {
        fromDate: filters.from_date,
      });
    }
    if (filters?.to_date) {
      qb.andWhere('r.date <= :toDate', {
        toDate: filters.to_date,
      });
    }
    if (filters?.doctor_id != null) {
      qb.andWhere('r.doctor_id = :doctorId', {
        doctorId: filters.doctor_id,
      });
    }
    if (filters?.service_id != null) {
      qb.innerJoin('wh.doctor_services', 'ds', 'ds.id = :serviceId', {
        serviceId: filters.service_id,
      });
    }
    if (filters?.status) {
      qb.andWhere('r.status = :status', { status: filters.status });
    }
    if (filters?.schedule_type === 'waterfall') {
      qb.andWhere('wh.waterfall = :waterfallTrue', { waterfallTrue: true });
    } else if (filters?.schedule_type === 'fixed') {
      qb.andWhere('wh.waterfall = :waterfallFalse', { waterfallFalse: false });
    }
    if (filters?.appoint_type) {
      qb.andWhere('r.appoint_type = :appointType', {
        appointType: filters.appoint_type,
      });
    }
    if (filters?.medical_status) {
      qb.andWhere('r.medical_status = :medicalStatus', {
        medicalStatus: filters.medical_status,
      });
    }

    const [rawData, total] = await qb.getManyAndCount();

    const patientIds = [
      ...new Set(rawData.map((r) => r.patient_id).filter((id) => id != null)),
    ];
    const visitDates = await this.getClinicPatientVisitDates(
      repository,
      patientIds,
    );

    const pairs = rawData.map((r) => ({
      patient_id: r.patient_id,
      doctor_id: r.doctor_id,
    }));
    const patientAnswersMap =
      await this.patientQuestionAnswersService.findByPatientDoctorPairs(
        clinicId,
        pairs,
      );

    const data = rawData.map((r) => {
      const key = `${r.patient_id}-${r.doctor_id}`;
      const answers = patientAnswersMap.get(key) ?? [];
      const patientAnswers = answers.map((a) => ({
        id: a.id,
        question_id: a.question_id,
        is_answer_yes: a.is_answer_yes,
        comment: a.comment,
        question: a.question
          ? {
              content_en: (a.question as { content_en?: string }).content_en,
              content_ar: (a.question as { content_ar?: string }).content_ar,
            }
          : undefined,
      }));
      return this.mapClinicReservationToResponse(r, visitDates, patientAnswers);
    });

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * Get all reservations for a main user from main reservations table
   */
  async findAllForMainUser(
    mainUserId: number,
    page: number = 1,
    limit: number = 10,
  ) {
    const skip = (page - 1) * limit;

    const [rawData, total] =
      await this.mainReservationRepository.findAndCount({
        where: { main_user_id: mainUserId },
        relations: ['doctor', 'mainUser'],
        skip,
        take: limit,
        order: { date: 'DESC', createdAt: 'DESC' },
      });

    const visitDates = await this.getMainUserVisitDates(mainUserId);
    const data = rawData.map((r) =>
      this.mapMainReservationToResponse(r, visitDates),
    );

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * Get a single reservation by ID for a main user from main reservations table
   */
  async findOneForMainUser(
    mainUserId: number,
    reservationId: number,
  ) {
    const reservation = await this.mainReservationRepository.findOne({
      where: {
        id: reservationId,
        main_user_id: mainUserId,
      },
      relations: ['doctor', 'mainUser'],
    });

    if (!reservation) {
      throw new NotFoundException(
        `Reservation with ID ${reservationId} not found for this user`,
      );
    }

    const visitDates = await this.getMainUserVisitDates(mainUserId);
    return this.mapMainReservationToResponse(reservation, visitDates);
  }

  /**
   * Cancel a reservation for a main user
   * Updates both main and clinic reservation status to CANCELLED
   * Also handles working hour busy status if needed
   */
  async cancelMainUserReservation(
    mainUserId: number,
    reservationId: number,
  ): Promise<MainReservation> {
    // Find the main reservation
    const mainReservation = await this.mainReservationRepository.findOne({
      where: { 
        id: reservationId,
        main_user_id: mainUserId,
      },
    });

    if (!mainReservation) {
      throw new NotFoundException(
        `Reservation with ID ${reservationId} not found for this user`,
      );
    }

    // Check if already cancelled
    if (mainReservation.status === MainReservationStatus.CANCELLED) {
      throw new BadRequestException('Reservation is already cancelled');
    }

    // Update main reservation status
    mainReservation.status = MainReservationStatus.CANCELLED;
    const updatedMainReservation = await this.mainReservationRepository.save(mainReservation);

    // Update clinic reservation and handle side effects
    try {
      const clinic = await this.clinicsService.findOne(mainReservation.clinic_id);
      if (clinic && clinic.database_name) {
        const clinicDataSource = await this.tenantDataSourceService.getTenantDataSource(
          clinic.database_name,
        );
        
        if (clinicDataSource) {
          const clinicReservationRepository = clinicDataSource.getRepository(Reservation);
          const clinicReservation = await clinicReservationRepository.findOne({
            where: { id: mainReservation.clinic_reservation_id },
            relations: ['doctor_working_hour'],
          });

          if (clinicReservation) {
            // Update clinic reservation status
            clinicReservation.status = ReservationStatus.CANCELLED;
            await clinicReservationRepository.save(clinicReservation);

            // Handle working hour busy status if it's not a waterfall working hour
            if (clinicReservation.doctor_working_hour && !clinicReservation.doctor_working_hour.waterfall) {
              // Check if there are other active reservations for this working hour on the same date
              const activeReservations = await clinicReservationRepository.find({
                where: {
                  doctor_working_hour_id: clinicReservation.doctor_working_hour_id,
                  date: clinicReservation.date,
                  status: In([ReservationStatus.PENDING, ReservationStatus.SCHEDULED, ReservationStatus.TAKEN]),
                },
              });

              // If no other active reservations, set busy to false
              if (activeReservations.length === 0) {
                const workingHourRepository = clinicDataSource.getRepository(DoctorWorkingHour);
                const workingHour = await workingHourRepository.findOne({
                  where: { id: clinicReservation.doctor_working_hour_id },
                });

                if (workingHour) {
                  workingHour.busy = false;
                  await workingHourRepository.save(workingHour);
                }
              }
            }

            // Sync the updated clinic reservation back to main to ensure consistency
            await this.syncToMainReservations(
              mainReservation.clinic_id,
              clinicReservation,
            );
          }
        }
      }
    } catch (error) {
      // Log error but don't fail the cancellation - main reservation is already updated
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(
        `Failed to update clinic reservation ${mainReservation.clinic_reservation_id} status:`,
        errorMessage,
      );
    }

    // Reload with relations and enrich response
    const reservationWithRelations = await this.mainReservationRepository.findOne({
      where: { id: updatedMainReservation.id },
      relations: ['doctor', 'mainUser'],
    });
    const r = reservationWithRelations || updatedMainReservation;
    const visitDates = await this.getMainUserVisitDates(mainUserId);
    return this.mapMainReservationToResponse(r, visitDates);
  }

  async findOne(clinicId: number, id: number) {
    const repository = await this.getRepository();
    const reservation = await repository.findOne({
      where: { id },
      relations: ['doctor', 'doctor.user', 'patient', 'doctor_working_hour'],
    });

    if (!reservation) {
      throw new NotFoundException(`Reservation with ID ${id} not found`);
    }

    const visitDates = await this.getClinicPatientVisitDates(repository, [
      reservation.patient_id,
    ]);

    const patientAnswersMap =
      await this.patientQuestionAnswersService.findByPatientDoctorPairs(
        clinicId,
        [{ patient_id: reservation.patient_id, doctor_id: reservation.doctor_id }],
      );
    const answers =
      patientAnswersMap.get(
        `${reservation.patient_id}-${reservation.doctor_id}`,
      ) ?? [];
    const patientAnswers = answers.map((a) => ({
      id: a.id,
      question_id: a.question_id,
      is_answer_yes: a.is_answer_yes,
      comment: a.comment,
      question: a.question
        ? {
            content_en: (a.question as { content_en?: string }).content_en,
            content_ar: (a.question as { content_ar?: string }).content_ar,
          }
        : undefined,
    }));

    return this.mapClinicReservationToResponse(
      reservation,
      visitDates,
      patientAnswers,
    );
  }

  async update(clinicId: number, id: number, updateReservationDto: UpdateReservationDto): Promise<Reservation> {
    const repository = await this.getRepository();
    const reservation = await this.findOne(clinicId, id);

    // Determine which working hour to use (updated or existing)
    const workingHourId = updateReservationDto.doctor_working_hour_id ?? reservation.doctor_working_hour_id;
    const doctorId = updateReservationDto.doctor_id ?? reservation.doctor_id;
    
    // Get the working hour to extract time
    const workingHour = await this.getWorkingHourForValidation(workingHourId, doctorId);
    
    // Determine the date to use (updated or existing)
    let reservationDate: Date;
    if (updateReservationDto.date) {
      reservationDate = new Date(updateReservationDto.date);
      // Set time to start of day to ensure it's a date only
      reservationDate.setHours(0, 0, 0, 0);
      // Validate that reservation date is not in the past
      this.validateReservationDate(reservationDate);
    } else {
      // Use existing reservation date
      reservationDate = new Date(reservation.date);
      reservationDate.setHours(0, 0, 0, 0);
    }

    // If working hour ID or date is being updated, validate
    if (updateReservationDto.doctor_working_hour_id !== undefined || updateReservationDto.date) {
      await this.validateWorkingHourReservation(
        workingHourId,
        doctorId,
        reservationDate,
        reservation.id, // Exclude current reservation from conflict check
      );
    }
    
    // When changing working hour, set fees from new working hour's doctor service; otherwise keep or use DTO
    let updatedFees: number;
    if (updateReservationDto.doctor_working_hour_id !== undefined) {
      const whRepo = await this.tenantRepositoryService.getRepository<DoctorWorkingHour>(DoctorWorkingHour);
      const newWorkingHour = whRepo
        ? await whRepo.findOne({
            where: { id: updateReservationDto.doctor_working_hour_id },
            relations: ['doctor_services'],
          })
        : null;
      updatedFees = newWorkingHour
        ? this.getFeesFromDoctorService(newWorkingHour.doctor_services?.[0])
        : reservation.fees;
    } else {
      updatedFees =
        updateReservationDto.fees !== undefined
          ? updateReservationDto.fees
          : reservation.fees;
    }

    const updateData: Partial<Reservation> = {
      ...updateReservationDto,
      date: reservationDate,
      fees: updatedFees,
    };

    Object.assign(reservation, updateData);
    const updatedReservation = await repository.save(reservation);

    // Reload reservation with relations for response
    const reservationWithRelations = await repository.findOne({
      where: { id: updatedReservation.id },
      relations: ['doctor', 'doctor.user', 'patient', 'doctor_working_hour'],
    });

    // Sync to main reservations table
    await this.syncToMainReservations(
      clinicId,
      reservationWithRelations || updatedReservation,
    );

    const r = reservationWithRelations || updatedReservation;
    const visitDates = await this.getClinicPatientVisitDates(repository, [
      r.patient_id,
    ]);
    return this.mapClinicReservationToResponse(r, visitDates);
  }

  async remove(clinicId: number, id: number): Promise<void> {
    const repository = await this.getRepository();
    const reservation = await this.findOne(clinicId, id);
    
    // Delete from main reservations table first
    await this.deleteFromMainReservations(clinicId, reservation.id);
    
    await repository.remove(reservation);
  }

  /**
   * Create reservation for main user
   * This method is used when a main user (not clinic user) creates a reservation
   * It will auto-create a clinic user if the phone doesn't exist
   */
  async createMainUserReservation(
    createMainUserReservationDto: CreateMainUserReservationDto,
    mainUserData: { id: number; name?: string; phone: string; email?: string },
  ): Promise<Reservation> {
    // Get clinic by ID
    const clinic = await this.clinicsService.findOne(
      createMainUserReservationDto.clinic_id,
    );

    if (!clinic || !clinic.database_name) {
      throw new NotFoundException(
        `Clinic with ID ${createMainUserReservationDto.clinic_id} not found or has no database`,
      );
    }

    // Get clinic database connection
    const clinicDataSource = await this.tenantDataSourceService.getTenantDataSource(
      clinic.database_name,
    );

    if (!clinicDataSource) {
      throw new BadRequestException(
        `Cannot connect to clinic database: ${clinic.database_name}`,
      );
    }

    // Get main user from main database (should exist since user is authenticated)
    const mainUser = await this.usersService.findOne(mainUserData.id);

    if (!mainUser) {
      throw new NotFoundException('Main user not found');
    }

    // Get clinic user repository
    const clinicUserRepository = clinicDataSource.getRepository<ClinicUser>(
      ClinicUser,
    );

    // Check if phone exists in clinic users
    let clinicUser = await clinicUserRepository.findOne({
      where: { phone: mainUserData.phone },
    });

    // If phone doesn't exist, create a new clinic user
    if (!clinicUser) {
      // Check if email already exists (if provided)
      if (mainUserData.email) {
        const existingUserByEmail = await clinicUserRepository.findOne({
          where: { email: mainUserData.email },
        });

        if (existingUserByEmail) {
          throw new BadRequestException(
            'User with this email already exists in clinic',
          );
        }
      }

      // Generate a random password for clinic user (they won't use it for main user reservations)
      const randomPassword = await bcrypt.hash(
        Math.random().toString(36).slice(-8),
        10,
      );

      clinicUser = clinicUserRepository.create({
        name: mainUserData.name || mainUser.name,
        phone: mainUserData.phone,
        email: mainUserData.email || mainUser.email,
        password: randomPassword,
        package_id: 0,
      });

      clinicUser = await clinicUserRepository.save(clinicUser);
    }

    // Get reservation repository for clinic database
    const reservationRepository = clinicDataSource.getRepository<Reservation>(
      Reservation,
    );

    // Parse the date from the request
    const reservationDate = new Date(createMainUserReservationDto.date);
    reservationDate.setHours(0, 0, 0, 0);

    // Validate that reservation date is not in the past
    this.validateReservationDate(reservationDate);

    // Get working hour for validation
    const workingHourRepository = clinicDataSource.getRepository<DoctorWorkingHour>(
      DoctorWorkingHour,
    );

    const workingHour = await workingHourRepository.findOne({
      where: { id: createMainUserReservationDto.doctor_working_hour_id },
      relations: ['doctor_services'],
    });

    if (!workingHour) {
      throw new NotFoundException(
        `Working hour with ID ${createMainUserReservationDto.doctor_working_hour_id} not found`,
      );
    }

    // Verify the working hour belongs to the doctor
    if (workingHour.doctor_id !== createMainUserReservationDto.doctor_id) {
      throw new BadRequestException(
        `Working hour ${createMainUserReservationDto.doctor_working_hour_id} does not belong to doctor ${createMainUserReservationDto.doctor_id}`,
      );
    }

    // Check if working hour is active
    if (!workingHour.is_active) {
      throw new BadRequestException(
        `Working hour ${createMainUserReservationDto.doctor_working_hour_id} is not active`,
      );
    }

    // Validate working hour reservation
    await this.validateWorkingHourReservationForClinic(
      reservationRepository,
      workingHourRepository,
      createMainUserReservationDto.doctor_working_hour_id,
      createMainUserReservationDto.doctor_id,
      reservationDate,
    );

    const fees = this.getFeesFromDoctorService(workingHour.doctor_services?.[0]);

    // Create reservation (fees from doctor service linked to working hour)
    const reservation = reservationRepository.create({
      doctor_id: createMainUserReservationDto.doctor_id,
      patient_id: clinicUser.id,
      doctor_working_hour_id: createMainUserReservationDto.doctor_working_hour_id,
      date: reservationDate,
      status: ReservationStatus.PENDING,
      paid: false,
      fees,
      main_user_id: mainUser.id,
    });

    const savedReservation = await reservationRepository.save(reservation);

    // Increment doctor's number_of_patients only when this is the first reservation for this patient with this doctor
    await this.incrementDoctorPatientCount(
      createMainUserReservationDto.clinic_id,
      createMainUserReservationDto.doctor_id,
      clinicUser.id,
    );

    // If working hour is not waterfall, set busy to true
    if (!workingHour.waterfall) {
      workingHour.busy = true;
      await workingHourRepository.save(workingHour);
    }

    // Reload reservation with relations
    // Note: We avoid loading 'doctor.user' and 'patient' to prevent TypeORM from
    // trying to query the main users table which doesn't have main_user_id
    const reservationWithRelations = await reservationRepository.findOne({
      where: { id: savedReservation.id },
      relations: ['doctor', 'doctor.user', 'patient', 'doctor_working_hour'],
    });

    const rForSync = reservationWithRelations || savedReservation;

    // Store main user -> clinic user link so future requests can resolve by clinic_user_id
    try {
      await this.clinicsService.setClinicUserIdForMainUser(
        mainUser.id,
        createMainUserReservationDto.clinic_id,
        clinicUser.id,
      );
    } catch (linkError) {
      const errMsg =
        linkError instanceof Error ? linkError.message : String(linkError);
      // eslint-disable-next-line no-console
      console.warn(
        `[SYNC WARNING] Could not set clinic_user_id for main user ${mainUser.id} in clinic ${createMainUserReservationDto.clinic_id}:`,
        errMsg,
      );
    }

    // Sync to main reservations table
    try {
      await this.syncToMainReservations(
        createMainUserReservationDto.clinic_id,
        rForSync,
      );
    } catch (syncError) {
      // Log sync error but don't fail the reservation creation
      const errorMessage =
        syncError instanceof Error ? syncError.message : String(syncError);
      // eslint-disable-next-line no-console
      console.error(
        `[SYNC ERROR] Failed to sync main user reservation ${savedReservation.id} to main database:`,
        errorMessage,
      );
      // Continue - the clinic reservation was created successfully
    }

    const r = reservationWithRelations || savedReservation;
    const visitDates = await this.getClinicPatientVisitDates(
      reservationRepository,
      [r.patient_id],
    );
    return this.mapClinicReservationToResponse(r, visitDates);
  }

  /**
   * Validate working hour reservation for clinic database
   */
  private async validateWorkingHourReservationForClinic(
    reservationRepository: Repository<Reservation>,
    workingHourRepository: Repository<DoctorWorkingHour>,
    workingHourId: number,
    doctorId: number,
    reservationDate: Date,
  ): Promise<void> {
    const workingHour = await workingHourRepository.findOne({
      where: { id: workingHourId },
    });

    if (!workingHour) {
      throw new NotFoundException(
        `Working hour with ID ${workingHourId} not found`,
      );
    }

    // Validate that reservation date matches the working hour day
    const reservationDay = this.getDayOfWeek(reservationDate);

    if (reservationDay !== workingHour.day) {
      throw new BadRequestException(
        `Reservation day (${reservationDay}) does not match working hour day (${workingHour.day})`,
      );
    }

    // Check existing reservations
    const existingReservations = await reservationRepository.find({
      where: {
        doctor_working_hour_id: workingHourId,
        status: In([
          ReservationStatus.SCHEDULED,
          ReservationStatus.TAKEN,
          ReservationStatus.PENDING,
        ]),
        date: reservationDate,
      },
    });

    // Check patient limit based on waterfall setting
    if (workingHour.waterfall) {
      if (
        workingHour.patients_limit !== null &&
        existingReservations.length >= workingHour.patients_limit
      ) {
        throw new BadRequestException(
          `Working hour ${workingHourId} has reached its patient limit (${workingHour.patients_limit}) for this date. Maximum ${workingHour.patients_limit} reservation(s) allowed per day for waterfall working hours.`,
        );
      }
    } else {
      if (existingReservations.length > 0) {
        throw new BadRequestException(
          `Working hour ${workingHourId} has already a reservation for this time. Only one reservation is allowed for non-waterfall working hours.`,
        );
      }
    }
  }

  /**
   * Ensure clinic_user link exists in main database (user_id, clinic_id).
   * Called after creating a reservation when main_user_id is set.
   */
  private async syncClinicUser(
    userId: number,
    clinicId: number,
  ): Promise<void> {
    try {
      const existing = await this.clinicUserLinkRepository.findOne({
        where: { user_id: userId, clinic_id: clinicId },
      });
      if (!existing) {
        const link = this.clinicUserLinkRepository.create({
          user_id: userId,
          clinic_id: clinicId,
        });
        await this.clinicUserLinkRepository.save(link);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      // eslint-disable-next-line no-console
      console.warn(
        `[SYNC WARNING] Could not sync clinic_user (user ${userId}, clinic ${clinicId}):`,
        errorMessage,
      );
    }
  }

  /**
   * Sync clinic reservation to main reservations table
   */
  private async syncToMainReservations(
    clinicId: number,
    clinicReservation: Reservation,
  ): Promise<void> {
    try {
      // Find main doctor by clinic_id and clinic_doctor_id
      let mainDoctor = await this.mainDoctorsService.findByClinicDoctorId(
        clinicId,
        clinicReservation.doctor_id,
      );

      if (!mainDoctor) {
        // Try to get clinic doctor and sync it to main database
        // eslint-disable-next-line no-console
        console.warn(
          `Main doctor not found for clinic ${clinicId}, clinic doctor ID ${clinicReservation.doctor_id}. Attempting to fetch and sync doctor from clinic database...`,
        );

        // Get clinic database to fetch doctor info
        const clinic = await this.clinicsService.findOne(clinicId);
        if (!clinic || !clinic.database_name) {
          // eslint-disable-next-line no-console
          console.error(
            `[SYNC ERROR] Cannot sync reservation ${clinicReservation.id}: Clinic ${clinicId} not found or has no database.`,
          );
          return;
        }

        const clinicDataSource =
          await this.tenantDataSourceService.getTenantDataSource(
            clinic.database_name,
          );
        if (!clinicDataSource) {
          // eslint-disable-next-line no-console
          console.error(
            `[SYNC ERROR] Cannot sync reservation ${clinicReservation.id}: Cannot connect to clinic database.`,
          );
          return;
        }

        // Get clinic doctor
        const clinicDoctorRepository =
          clinicDataSource.getRepository(Doctor);
        const clinicDoctor = await clinicDoctorRepository.findOne({
          where: { id: clinicReservation.doctor_id },
          relations: ['user'],
        });

        if (!clinicDoctor) {
          // eslint-disable-next-line no-console
          console.error(
            `[SYNC ERROR] Cannot sync reservation ${clinicReservation.id}: Clinic doctor ${clinicReservation.doctor_id} not found in clinic database.`,
          );
          return;
        }

        // Sync doctor to main database
        try {
          const branchIds = await this.doctorBranchesService.getBranchIdsForDoctor(
            clinicReservation.doctor_id,
          );
          const firstBranchId = branchIds[0];
          let mainBranchId: number | undefined;
          if (firstBranchId) {
            const mainBranch = await this.mainBranchesService.findByClinicBranchId(
              clinicId,
              firstBranchId,
            );
            mainBranchId = mainBranch?.id;
          }
          await this.mainDoctorsService.syncDoctor(
            clinicId,
            clinicReservation.doctor_id,
            {
              name: clinicDoctor.user?.name || 'Unknown',
              age: clinicDoctor.age ?? undefined,
              avatar: clinicDoctor.avatar,
              email: clinicDoctor.user?.email,
              phone: clinicDoctor.user?.phone,
              department: clinicDoctor.department,
              license_number: clinicDoctor.license_number,
              degree: clinicDoctor.degree,
              languages: clinicDoctor.languages,
              bio: clinicDoctor.bio,
              appoint_type:
                Array.isArray(clinicDoctor.appointment_types) &&
                clinicDoctor.appointment_types.length > 0
                  ? clinicDoctor.appointment_types[0]
                  : undefined,
              is_active: clinicDoctor.is_active,
              branch_id: mainBranchId,
              experience_years: clinicDoctor.experience_years,
              number_of_patients: clinicDoctor.number_of_patients,
              rate: clinicDoctor.rate,
            },
          );

          // Retry lookup after sync
          mainDoctor = await this.mainDoctorsService.findByClinicDoctorId(
            clinicId,
            clinicReservation.doctor_id,
          );

          if (!mainDoctor) {
            // eslint-disable-next-line no-console
            console.error(
              `[SYNC ERROR] Doctor sync succeeded but lookup still failed. Cannot sync reservation ${clinicReservation.id}.`,
            );
            return;
          }

          // eslint-disable-next-line no-console
          console.log(
            `Successfully synced doctor ${clinicReservation.doctor_id} to main database (main doctor ID: ${mainDoctor.id}). Continuing with reservation sync...`,
          );
        } catch (doctorSyncError) {
          const errorMessage =
            doctorSyncError instanceof Error
              ? doctorSyncError.message
              : String(doctorSyncError);
          // eslint-disable-next-line no-console
          console.error(
            `[SYNC ERROR] Failed to sync doctor ${clinicReservation.doctor_id} to main database:`,
            errorMessage,
          );
          // eslint-disable-next-line no-console
          console.error(
            `[SYNC ERROR] Cannot sync reservation ${clinicReservation.id} without main doctor.`,
          );
          return;
        }
      }

      // Get working hour from clinic database to extract times
      let fromTime: string | undefined;
      let toTime: string | undefined;

      try {
        const clinic = await this.clinicsService.findOne(clinicId);
        if (clinic && clinic.database_name) {
          const clinicDataSource =
            await this.tenantDataSourceService.getTenantDataSource(
              clinic.database_name,
            );
          if (clinicDataSource) {
            const workingHourRepository =
              clinicDataSource.getRepository(DoctorWorkingHour);
            const workingHour = await workingHourRepository.findOne({
              where: { id: clinicReservation.doctor_working_hour_id },
            });

            if (workingHour) {
              fromTime = workingHour.start_time;
              toTime = workingHour.end_time;
            }
          }
        }
      } catch (error) {
        // Log error but continue - times are optional
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        // eslint-disable-next-line no-console
        console.warn(
          `[SYNC WARNING] Could not fetch working hour times for reservation ${clinicReservation.id}:`,
          errorMessage,
        );
      }

      // Check if main reservation already exists
      const existingMainReservation =
        await this.mainReservationRepository.findOne({
          where: {
            clinic_id: clinicId,
            clinic_reservation_id: clinicReservation.id,
          },
        });

      const reservationData: Partial<MainReservation> = {
        clinic_id: clinicId,
        clinic_reservation_id: clinicReservation.id,
        doctor_id: mainDoctor.id,
        main_user_id: clinicReservation.main_user_id || undefined,
        doctor_working_hour_id: clinicReservation.doctor_working_hour_id,
        fees: clinicReservation.fees,
        paid: clinicReservation.paid,
        date: clinicReservation.date instanceof Date
          ? clinicReservation.date
          : new Date(clinicReservation.date),
        from_time: fromTime,
        to_time: toTime,
        status: clinicReservation.status,
        appoint_type: clinicReservation.appoint_type ?? undefined,
        medical_status: clinicReservation.medical_status ?? undefined,
      };

      if (existingMainReservation) {
        // Update existing main reservation
        Object.assign(existingMainReservation, reservationData);
        const updated =
          await this.mainReservationRepository.save(existingMainReservation);
        // eslint-disable-next-line no-console
        console.log(
          `Successfully synced (updated) reservation ${clinicReservation.id} to main database (main reservation ID: ${updated.id})`,
        );
      } else {
        // Create new main reservation
        const mainReservation =
          this.mainReservationRepository.create(reservationData);
        const created =
          await this.mainReservationRepository.save(mainReservation);
        // eslint-disable-next-line no-console
        console.log(
          `Successfully synced (created) reservation ${clinicReservation.id} to main database (main reservation ID: ${created.id})`,
        );
      }

      // Sync clinic_user so main user is linked to this clinic
      if (clinicReservation.main_user_id) {
        await this.syncClinicUser(clinicReservation.main_user_id, clinicId);
      }
    } catch (error) {
      // Log error but don't fail the reservation operation
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      // eslint-disable-next-line no-console
      console.error(
        `Failed to sync reservation ${clinicReservation.id} (clinic ${clinicId}) to main database:`,
        errorMessage,
      );
    }
  }

  /**
   * Delete reservation from main reservations table
   */
  private async deleteFromMainReservations(
    clinicId: number,
    clinicReservationId: number,
  ): Promise<void> {
    try {
      const mainReservation = await this.mainReservationRepository.findOne({
        where: {
          clinic_id: clinicId,
          clinic_reservation_id: clinicReservationId,
        },
      });

      if (mainReservation) {
        await this.mainReservationRepository.remove(mainReservation);
      }
    } catch (error) {
      // Log error but don't fail the deletion operation
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      // eslint-disable-next-line no-console
      console.error(
        `Failed to delete reservation ${clinicReservationId} from main database:`,
        errorMessage,
      );
    }
  }
}

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Repository, In, Not } from 'typeorm';
import { TenantRepositoryService } from '../../database/tenant-repository.service';
import { TenantDataSourceService } from '../../database/tenant-data-source.service';
import { Reservation, ReservationStatus } from './entities/reservation.entity';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { CreateMainUserReservationDto } from './dto/create-main-user-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { Doctor } from '../doctors/entities/doctor.entity';
import { DoctorsService as MainDoctorsService } from '../../doctors/doctors.service';
import { DoctorWorkingHour } from '../working-hours/entities/doctor-working-hour.entity';
import { DayOfWeek } from '../working-hours/entities/working-hour.entity';
import { User as ClinicUser } from '../permissions/entities/user.entity';
import { ClinicsService } from '../../clinics/clinics.service';
import { UsersService } from '../../users/users.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class ReservationsService {
  constructor(
    private tenantRepositoryService: TenantRepositoryService,
    private tenantDataSourceService: TenantDataSourceService,
    private mainDoctorsService: MainDoctorsService,
    private clinicsService: ClinicsService,
    private usersService: UsersService,
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

  async create(clinicId: number, createReservationDto: CreateReservationDto, patientId: number): Promise<Reservation> {
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
    
    // Get fees from working hour
    const fees = workingHour.fees ?? 0;
    
    const reservation = repository.create({
      ...createReservationDto,
      patient_id: patientId, // Set from authenticated user
      date: reservationDate, // Date only
      status: ReservationStatus.PENDING, // Always default to PENDING
      paid: false, // Default to false
      fees: fees, // Set from working hour
    });

    const savedReservation = await repository.save(reservation);

    // Increment doctor's number_of_patients
    await this.incrementDoctorPatientCount(clinicId, createReservationDto.doctor_id);

    // If working hour is waterfall, set busy to true
    if (!workingHour.waterfall) {
      await this.updateWorkingHourBusyStatus(
        createReservationDto.doctor_working_hour_id,
        true,
      );
    }
    

    // Reload reservation with working hour relation
    const reservationWithWorkingHour = await repository.findOne({
      where: { id: savedReservation.id },
      relations: ['doctor', 'doctor.user', 'patient', 'doctor_working_hour'],
    });

    return reservationWithWorkingHour || savedReservation;
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

    // Get the working hour
    const workingHour = await workingHourRepository.findOne({
      where: { id: workingHourId },
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
   * Increment doctor's number_of_patients in both clinic and main doctors tables
   */
  private async incrementDoctorPatientCount(clinicId: number, doctorId: number): Promise<void> {
    try {
      // Get clinic doctor repository
      const doctorRepository = await this.tenantRepositoryService.getRepository<Doctor>(Doctor);
      
      if (doctorRepository) {
        // Load doctor with user relation to get name for syncing
        const doctor = await doctorRepository.findOne({ 
          where: { id: doctorId },
          relations: ['user'],
        });
        
        if (doctor) {
          // Increment in clinic doctors table
          doctor.number_of_patients = (doctor.number_of_patients || 0) + 1;
          await doctorRepository.save(doctor);

          // Get doctor name from user relation
          const doctorName = doctor.user?.name || '';
          
          // Sync to main doctors table using clinic doctor id as clinic_doctor_id
          await this.mainDoctorsService.syncDoctor(clinicId, doctorId, {
            name: doctorName,
            age: doctor.age,
            avatar: doctor.avatar,
            email: doctor.user?.email,
            phone: doctor.user?.phone,
            department: doctor.department,
            license_number: doctor.license_number,
            degree: doctor.degree,
            languages: doctor.languages,
            bio: doctor.bio,
            appoint_type: doctor.appoint_type,
            is_active: doctor.is_active,
            branch_id: doctor.branch_id,
            experience_years: doctor.experience_years,
            number_of_patients: doctor.number_of_patients,
          });
        }
      }
    } catch (error) {
      // Log error but don't fail the reservation creation
      console.error(`Failed to increment doctor patient count for doctor ${doctorId}:`, error);
    }
  }

  async findAll(clinicId: number, page: number = 1, limit: number = 10) {
    const repository = await this.getRepository();
    const skip = (page - 1) * limit;

    const [data, total] = await repository.findAndCount({
      relations: ['doctor', 'doctor.user', 'patient', 'doctor_working_hour'],
      skip,
      take: limit,
      order: {
        date: 'DESC',
      },
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

  async findOne(clinicId: number, id: number): Promise<Reservation> {
    const repository = await this.getRepository();
    const reservation = await repository.findOne({
      where: { id },
      relations: ['doctor', 'doctor.user', 'patient', 'doctor_working_hour'],
    });

    if (!reservation) {
      throw new NotFoundException(`Reservation with ID ${id} not found`);
    }

    return reservation;
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
    
    // Update fees from working hour if working hour changed
    const updatedFees = updateReservationDto.doctor_working_hour_id !== undefined 
      ? (workingHour.fees ?? reservation.fees)
      : reservation.fees;

    const updateData: Partial<Reservation> = {
      ...updateReservationDto,
      date: reservationDate,
      fees: updatedFees,
    };

    Object.assign(reservation, updateData);
    const updatedReservation = await repository.save(reservation);

    // Reload reservation with working hour relation
    const reservationWithWorkingHour = await repository.findOne({
      where: { id: updatedReservation.id },
      relations: ['doctor', 'doctor.user', 'patient', 'doctor_working_hour'],
    });

    return reservationWithWorkingHour || updatedReservation;
  }

  async remove(clinicId: number, id: number): Promise<void> {
    const repository = await this.getRepository();
    const reservation = await this.findOne(clinicId, id);
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

    // Get fees from working hour
    const fees = workingHour.fees ?? 0;

    // Create reservation
    const reservation = reservationRepository.create({
      doctor_id: createMainUserReservationDto.doctor_id,
      patient_id: clinicUser.id,
      doctor_working_hour_id: createMainUserReservationDto.doctor_working_hour_id,
      date: reservationDate,
      status: ReservationStatus.PENDING,
      paid: false,
      fees: fees,
      main_user_id: mainUser.id,
    });

    const savedReservation = await reservationRepository.save(reservation);

    // Increment doctor's number_of_patients
    await this.incrementDoctorPatientCount(
      createMainUserReservationDto.clinic_id,
      createMainUserReservationDto.doctor_id,
    );

    // If working hour is not waterfall, set busy to true
    if (!workingHour.waterfall) {
      workingHour.busy = true;
      await workingHourRepository.save(workingHour);
    }

    // Reload reservation with relations
    const reservationWithRelations = await reservationRepository.findOne({
      where: { id: savedReservation.id },
      relations: ['doctor', 'doctor.user', 'patient', 'doctor_working_hour'],
    });

    return reservationWithRelations || savedReservation;
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
}

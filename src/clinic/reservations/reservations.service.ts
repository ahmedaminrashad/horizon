import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Repository, Not } from 'typeorm';
import { TenantRepositoryService } from '../../database/tenant-repository.service';
import { Reservation, ReservationStatus } from './entities/reservation.entity';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { Doctor } from '../doctors/entities/doctor.entity';
import { DoctorsService as MainDoctorsService } from '../../doctors/doctors.service';
import { DoctorWorkingHour } from '../working-hours/entities/doctor-working-hour.entity';
import { DayOfWeek } from '../working-hours/entities/working-hour.entity';

@Injectable()
export class ReservationsService {
  constructor(
    private tenantRepositoryService: TenantRepositoryService,
    private mainDoctorsService: MainDoctorsService,
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
    const reservationDateOnly = new Date(createReservationDto.date);
    
    // Validate that reservation date is not in the past
    this.validateReservationDate(reservationDateOnly);
    
    // Get working hour first to extract time
    const workingHour = await this.getWorkingHourForValidation(
      createReservationDto.doctor_working_hour_id,
      createReservationDto.doctor_id,
    );
    
    // Combine date from request with start_time from working hour
    const reservationDateTime = this.combineDateAndTime(
      reservationDateOnly,
      workingHour.start_time,
    );
    
    // Validate and enforce waterfall rules for working hour
    await this.validateWorkingHourReservation(
      createReservationDto.doctor_working_hour_id,
      createReservationDto.doctor_id,
      reservationDateTime,
    );
    
    // Get fees from working hour
    const fees = workingHour.fees ?? 0;
    
    const reservation = repository.create({
      ...createReservationDto,
      patient_id: patientId, // Set from authenticated user
      date_time: reservationDateTime, // Combined date and time
      status: ReservationStatus.PENDING, // Always default to PENDING
      paid: false, // Default to false
      fees: fees, // Set from working hour
    });

    const savedReservation = await repository.save(reservation);

    // Increment doctor's number_of_patients
    await this.incrementDoctorPatientCount(clinicId, createReservationDto.doctor_id);

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
   * Combine date and time string into a Date object
   */
  private combineDateAndTime(date: Date, timeString: string): Date {
    const [hours, minutes, seconds] = timeString.split(':').map(Number);
    const combined = new Date(date);
    combined.setHours(hours, minutes, seconds || 0, 0);
    return combined;
  }

  /**
   * Validate working hour reservation based on waterfall setting
   * Returns the working hour object for use in reservation creation
   */
  private async validateWorkingHourReservation(
    workingHourId: number,
    doctorId: number,
    reservationDateTime: Date,
    excludeReservationId?: number, // For update operations, exclude current reservation
  ): Promise<DoctorWorkingHour> {
    // Get working hour
    const workingHour = await this.getWorkingHourForValidation(
      workingHourId,
      doctorId,
    );

    // Validate that reservation date matches the working hour day
    const reservationDay = this.getDayOfWeek(reservationDateTime);

    // Check if reservation day matches working hour day
    if (reservationDay !== workingHour.day) {
      throw new BadRequestException(
        `Reservation day (${reservationDay}) does not match working hour day (${workingHour.day})`,
      );
    }

    // Get reservation repository to check existing reservations
    const reservationRepository = await this.getRepository();

    // Check existing reservations for this working hour
    // Consider SCHEDULED and TAKEN as active reservations that should block new ones if waterfall is true
    const whereConditions: any[] = [
      {
        doctor_working_hour_id: workingHourId,
        status: ReservationStatus.SCHEDULED,
        ...(excludeReservationId ? { id: Not(excludeReservationId) } : {}),
      },
      {
        doctor_working_hour_id: workingHourId,
        status: ReservationStatus.TAKEN,
        ...(excludeReservationId ? { id: Not(excludeReservationId) } : {}),
      },
    ];

    const existingReservations = await reservationRepository.find({
      where: whereConditions,
    });

    // If waterfall is true, only allow one reservation per working hour
    if (workingHour.waterfall) {
      if (existingReservations.length > 0) {
        throw new BadRequestException(
          `Working hour ${workingHourId} uses waterfall scheduling and already has a reservation. Only one reservation is allowed per working hour.`,
        );
      }
    }
    // If waterfall is false, multiple reservations are allowed (no check needed)
    
    // Return the working hour so fees can be used
    return workingHour;
  }

  /**
   * Extract time string (HH:MM:SS) from Date object
   */
  private extractTimeFromDate(date: Date): string {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
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
        date_time: 'DESC',
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
    let reservationDateOnly: Date;
    if (updateReservationDto.date) {
      reservationDateOnly = new Date(updateReservationDto.date);
      // Validate that reservation date is not in the past
      this.validateReservationDate(reservationDateOnly);
    } else {
      // Use existing reservation date
      reservationDateOnly = new Date(reservation.date_time);
      reservationDateOnly.setHours(0, 0, 0, 0);
    }
    
    // Combine date with working hour start_time
    const reservationDateTime = this.combineDateAndTime(reservationDateOnly, workingHour.start_time);

    // If working hour ID or date is being updated, validate
    if (updateReservationDto.doctor_working_hour_id !== undefined || updateReservationDto.date) {
      await this.validateWorkingHourReservation(
        workingHourId,
        doctorId,
        reservationDateTime,
        reservation.id, // Exclude current reservation from conflict check
      );
    }
    
    // Update fees from working hour if working hour changed
    const updatedFees = updateReservationDto.doctor_working_hour_id !== undefined 
      ? (workingHour.fees ?? reservation.fees)
      : reservation.fees;

    const updateData: Partial<Reservation> = {
      ...updateReservationDto,
      date_time: reservationDateTime,
      fees: updatedFees,
    };
    
    // Remove 'date' from updateData as it's not a column in the entity
    delete (updateData as any).date;

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
}

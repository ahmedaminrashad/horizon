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

  async create(clinicId: number, createReservationDto: CreateReservationDto): Promise<Reservation> {
    const repository = await this.getRepository();
    
    // Validate and enforce waterfall rules for working hour, and get working hour with fees
    const workingHour = await this.validateWorkingHourReservation(
      createReservationDto.doctor_working_hour_id,
      createReservationDto.doctor_id,
      new Date(createReservationDto.date_time),
    );
    
    // Get fees from working hour, default to 0 if not set
    const fees = workingHour.fees ?? 0;
    
    const reservation = repository.create({
      ...createReservationDto,
      date_time: new Date(createReservationDto.date_time),
      status: createReservationDto.status || ReservationStatus.PENDING,
      paid: false, // Default to false
      fees: fees,
    });

    const savedReservation = await repository.save(reservation);

    // Increment doctor's number_of_patients
    await this.incrementDoctorPatientCount(clinicId, createReservationDto.doctor_id);

    return savedReservation;
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

    // Validate that reservation date_time matches the working hour time slot
    const reservationTime = this.extractTimeFromDate(reservationDateTime);
    const reservationDay = this.getDayOfWeek(reservationDateTime);

    // Check if reservation day matches working hour day
    if (reservationDay !== workingHour.day) {
      throw new BadRequestException(
        `Reservation day (${reservationDay}) does not match working hour day (${workingHour.day})`,
      );
    }

    // Check if reservation time is within working hour time range
    if (
      reservationTime < workingHour.start_time ||
      reservationTime >= workingHour.end_time
    ) {
      throw new BadRequestException(
        `Reservation time (${reservationTime}) is not within working hour range (${workingHour.start_time} - ${workingHour.end_time})`,
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
      relations: ['doctor', 'doctor.user', 'patient'],
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
      relations: ['doctor', 'doctor.user', 'patient'],
    });

    if (!reservation) {
      throw new NotFoundException(`Reservation with ID ${id} not found`);
    }

    return reservation;
  }

  async update(clinicId: number, id: number, updateReservationDto: UpdateReservationDto): Promise<Reservation> {
    const repository = await this.getRepository();
    const reservation = await this.findOne(clinicId, id);

    // If doctor_working_hour_id is being updated or changed, validate it
    const workingHourId = updateReservationDto.doctor_working_hour_id ?? reservation.doctor_working_hour_id;
    const doctorId = updateReservationDto.doctor_id ?? reservation.doctor_id;
    const dateTime = updateReservationDto.date_time 
      ? new Date(updateReservationDto.date_time) 
      : reservation.date_time;

    // If working hour ID is provided and either working hour or date_time is being updated, validate
    if (workingHourId && (updateReservationDto.doctor_working_hour_id !== undefined || updateReservationDto.date_time)) {
      const workingHour = await this.validateWorkingHourReservation(
        workingHourId,
        doctorId,
        dateTime,
        reservation.id, // Exclude current reservation from conflict check
      );
      
      // Update fees from working hour if working hour changed
      if (updateReservationDto.doctor_working_hour_id !== undefined) {
        const updateData = updateReservationDto as any;
        updateData.fees = workingHour.fees ?? reservation.fees;
      }
    }

    const updateData: any = { ...updateReservationDto };
    if (updateReservationDto.date_time) {
      updateData.date_time = new Date(updateReservationDto.date_time);
    }

    Object.assign(reservation, updateData);
    return repository.save(reservation);
  }

  async remove(clinicId: number, id: number): Promise<void> {
    const repository = await this.getRepository();
    const reservation = await this.findOne(clinicId, id);
    await repository.remove(reservation);
  }
}

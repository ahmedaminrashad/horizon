import {
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { Doctor } from './entities/doctor.entity';
import { ServicesService } from '../services/services.service';
import { Service } from '../services/entities/service.entity';
import { ClinicsService } from '../clinics/clinics.service';
import { TenantDataSourceService } from '../database/tenant-data-source.service';
import { DayOfWeek } from '../clinic/working-hours/entities/working-hour.entity';
import { DoctorWorkingHour } from '../clinic/working-hours/entities/doctor-working-hour.entity';
import { DoctorWorkingHour as MainDoctorWorkingHour } from '../clinics/entities/doctor-working-hour.entity';
import { WorkingHour } from '../clinic/working-hours/entities/working-hour.entity';
import {
  Reservation,
  ReservationStatus,
} from '../clinic/reservations/entities/reservation.entity';

export interface NextAvailableSlot {
  date: string;
  time: string;
  datetime?: string;
  session_time?: string | null;
  branch_id?: number | null;
}

@Injectable()
export class DoctorsService {
  constructor(
    @InjectRepository(Doctor)
    private doctorsRepository: Repository<Doctor>,
    @InjectRepository(MainDoctorWorkingHour)
    private doctorWorkingHourRepository: Repository<MainDoctorWorkingHour>,
    private servicesService: ServicesService,
    @Inject(forwardRef(() => ClinicsService))
    private clinicsService: ClinicsService,
    private tenantDataSourceService: TenantDataSourceService,
  ) {}

  async findAll(page: number = 1, limit: number = 10, clinicId?: number) {
    const skip = (page - 1) * limit;

    const where = clinicId ? { clinic_id: clinicId } : {};

    const [data, total] = await this.doctorsRepository.findAndCount({
      where,
      skip,
      take: limit,
      order: {
        createdAt: 'DESC',
      },
    });

    // Fetch working hours for each doctor
    const dataWithWorkingHours = await Promise.all(
      data.map(async (doctor) => {
        const workingHours = await this.doctorWorkingHourRepository.find({
          where: { doctor_id: doctor.id },
          order: { day: 'ASC', start_time: 'ASC' },
          relations: ['branch'],
        });

        return {
          ...doctor,
          working_hours: workingHours,
        };
      }),
    );

    const totalPages = Math.ceil(total / limit);

    return {
      data: dataWithWorkingHours,
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

  async findOne(id: number): Promise<Doctor & { working_hours?: MainDoctorWorkingHour[] }> {
    const doctor = await this.doctorsRepository.findOne({
      where: { id },
      relations: ['branch'],
    });

    if (!doctor) {
      throw new NotFoundException(`Doctor with ID ${id} not found`);
    }

    // Fetch working hours for the doctor
    const workingHours = await this.doctorWorkingHourRepository.find({
      where: { doctor_id: doctor.id },
      order: { day: 'ASC', start_time: 'ASC' },
      relations: ['branch'],
    });

    return {
      ...doctor,
      working_hours: workingHours,
    };
  }

  async findByClinicDoctorId(
    clinicId: number,
    clinicDoctorId: number,
  ): Promise<Doctor | null> {
    return this.doctorsRepository.findOne({
      where: {
        clinic_id: clinicId,
        clinic_doctor_id: clinicDoctorId,
      },
    });
  }

  async syncDoctor(
    clinicId: number,
    clinicDoctorId: number,
    doctorData: {
      name: string;
      age?: number;
      avatar?: string;
      email?: string;
      phone?: string;
      department?: string;
      license_number?: string;
      degree?: string;
      languages?: string;
      bio?: string;
      appoint_type?: string;
      is_active?: boolean;
      branch_id?: number;
      experience_years?: number;
      number_of_patients?: number;
      rate?: number;
    },
  ): Promise<Doctor> {
    const existingDoctor = await this.findByClinicDoctorId(
      clinicId,
      clinicDoctorId,
    );

    if (existingDoctor) {
      // Update existing doctor
      Object.assign(existingDoctor, {
        name: doctorData.name,
        age: doctorData.age,
        avatar: doctorData.avatar,
        email: doctorData.email,
        phone: doctorData.phone,
        department: doctorData.department as any,
        license_number: doctorData.license_number,
        degree: doctorData.degree,
        languages: doctorData.languages,
        bio: doctorData.bio,
        appoint_type: doctorData.appoint_type as any,
        is_active: doctorData.is_active,
        branch_id: doctorData.branch_id,
        experience_years: doctorData.experience_years,
        number_of_patients: doctorData.number_of_patients,
        rate: doctorData.rate,
      });
      return this.doctorsRepository.save(existingDoctor);
    } else {
      // Create new doctor
      const doctor = this.doctorsRepository.create({
        name: doctorData.name,
        age: doctorData.age,
        clinic_id: clinicId,
        clinic_doctor_id: clinicDoctorId,
        avatar: doctorData.avatar,
        email: doctorData.email,
        phone: doctorData.phone,
        department: doctorData.department as any,
        license_number: doctorData.license_number,
        degree: doctorData.degree,
        languages: doctorData.languages,
        bio: doctorData.bio,
        appoint_type: doctorData.appoint_type as any,
        is_active:
          doctorData.is_active !== undefined ? doctorData.is_active : true,
        branch_id: doctorData.branch_id,
        experience_years: doctorData.experience_years,
        number_of_patients: doctorData.number_of_patients || 0,
        rate: doctorData.rate,
      });
      return this.doctorsRepository.save(doctor);
    }
  }

  async suggestServices(doctorId: number): Promise<Service[]> {
    const doctor = await this.findOne(doctorId);

    // Find services matching doctor's specialty and degree
    const services = await this.servicesService.findMatchingServices(
      doctor.specialty || undefined,
      doctor.degree || undefined,
      doctor.clinic_id,
    );

    return services;
  }

  /**
   * Get next available slot for a doctor based on working hours and reservations
   */
  async getNextAvailableSlot(
    doctor: Doctor,
    databaseName?: string,
  ): Promise<NextAvailableSlot | null> {
    try {
      // Get clinic database name
      let dbName = databaseName;
      if (!dbName) {
        const clinic = await this.clinicsService.findOne(doctor.clinic_id);
        if (!clinic?.database_name) {
          return null;
        }
        dbName = clinic.database_name;
      }

      // Get clinic database
      const clinicDataSource =
        await this.tenantDataSourceService.getTenantDataSource(
          dbName,
        );
      if (!clinicDataSource) {
        return null;
      }

      // Get working hours (doctor-specific or default)
      const workingHours = await this.getDoctorWorkingHours(
        clinicDataSource,
        doctor.clinic_doctor_id,
        doctor.branch_id,
      );

      if (!workingHours || workingHours.length === 0) {
        return null;
      }

      // Get existing reservations
      const reservations = await this.getDoctorReservations(
        clinicDataSource,
        doctor.clinic_doctor_id,
      );

      // Calculate next available slot
      return this.calculateNextAvailableSlot(workingHours, reservations);
    } catch (error) {
      // Return null if any error occurs (e.g., database not accessible)
      console.error(
        `Error calculating next available slot for doctor ${doctor.id}:`,
        error,
      );
      return null;
    }
  }

  /**
   * Get working hours for a doctor (prefer doctor-specific, fallback to branch/clinic defaults)
   */
  private async getDoctorWorkingHours(
    dataSource: DataSource,
    clinicDoctorId: number,
    branchId: number | null,
  ): Promise<
    Array<{
      day: DayOfWeek;
      start_time: string;
      end_time: string;
      session_time?: string | null;
      branch_id?: number | null;
    }>
  > {
    // Try to get doctor-specific working hours
    const doctorWorkingHourRepo = dataSource.getRepository(DoctorWorkingHour);

    const doctorHours = await doctorWorkingHourRepo.find({
      where: {
        doctor_id: clinicDoctorId,
        is_active: true,
      },
      order: { day: 'ASC' },
    });

    if (doctorHours.length > 0) {
      return doctorHours.map((h) => ({
        day: h.day,
        start_time: h.start_time,
        end_time: h.end_time,
        session_time: h.session_time,
        branch_id: h.branch_id ?? null,
      }));
    }

    // Fallback to branch/clinic working hours
    const workingHourRepo = dataSource.getRepository(WorkingHour);

    const where: any = { is_active: true };
    if (branchId) {
      where.branch_id = branchId;
    }

    const defaultHours = await workingHourRepo.find({
      where,
      order: { day: 'ASC', range_order: 'ASC' },
    });

    if (defaultHours.length > 0) {
      // Group by day and take the first range for each day
      const dayMap = new Map();
      for (const hour of defaultHours) {
        if (!dayMap.has(hour.day)) {
          dayMap.set(hour.day, {
            day: hour.day,
            start_time: hour.start_time,
            end_time: hour.end_time,
            branch_id: branchId,
          });
        }
      }
      return Array.from(dayMap.values());
    }

    return [];
  }

  /**
   * Get existing reservations for a doctor
   */
  private async getDoctorReservations(
    dataSource: DataSource,
    clinicDoctorId: number,
  ): Promise<Array<{ date: Date }>> {
    const reservationRepo = dataSource.getRepository(Reservation);

    // Get reservations that block slots (all except cancelled)
    const reservations = await reservationRepo.find({
      where: {
        doctor_id: clinicDoctorId,
        status: In([
          ReservationStatus.SCHEDULED,
          ReservationStatus.TAKEN,
          ReservationStatus.PENDING,
        ]),
      },
      order: { date: 'ASC' },
    });

    // Convert date to Date object if it's a string (TypeORM returns date columns as strings)
    return reservations.map((r) => ({
      date: r.date instanceof Date ? r.date : new Date(r.date),
    }));
  }

  /**
   * Calculate next available slot based on working hours and reservations
   */
  private calculateNextAvailableSlot(
    workingHours: Array<{
      day: DayOfWeek;
      start_time: string;
      end_time: string;
      session_time?: string | null;
      branch_id?: number | null;
    }>,
    reservations: Array<{ date: Date }>,
  ): NextAvailableSlot | null {
    const now = new Date();
    const defaultSlotDurationMinutes = 30; // Default slot duration in minutes if session_time not specified
    const daysToCheck = 30; // Check up to 30 days ahead

    // Helper function to convert time string to minutes
    const timeToMinutes = (timeStr: string): number => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };

    // Map day names to numbers (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
    const dayMap: Record<DayOfWeek, number> = {
      SUNDAY: 0,
      MONDAY: 1,
      TUESDAY: 2,
      WEDNESDAY: 3,
      THURSDAY: 4,
      FRIDAY: 5,
      SATURDAY: 6,
    };

    // Group working hours by day
    const hoursByDay = new Map<
      number,
      Array<{
        start_time: string;
        end_time: string;
        session_time?: string | null;
        branch_id?: number | null;
      }>
    >();
    for (const wh of workingHours) {
      const dayNum = dayMap[wh.day];
      if (!hoursByDay.has(dayNum)) {
        hoursByDay.set(dayNum, []);
      }
      hoursByDay.get(dayNum)!.push({
        start_time: wh.start_time,
        end_time: wh.end_time,
        session_time: wh.session_time,
        branch_id: wh.branch_id,
      });
    }

    // Group reservations by date (YYYY-MM-DD)
    const reservationsByDate = new Map<string, Date[]>();
    for (const res of reservations) {
      // Ensure date is a Date object
      const dateObj = res.date instanceof Date ? res.date : new Date(res.date);
      const dateKey = dateObj.toISOString().split('T')[0];
      if (!reservationsByDate.has(dateKey)) {
        reservationsByDate.set(dateKey, []);
      }
      reservationsByDate.get(dateKey)!.push(dateObj);
    }

    // Check each day for the next 30 days
    for (let dayOffset = 0; dayOffset < daysToCheck; dayOffset++) {
      const checkDate = new Date(now);
      checkDate.setDate(now.getDate() + dayOffset);
      checkDate.setHours(0, 0, 0, 0);

      const dayOfWeek = checkDate.getDay();
      const dayHours = hoursByDay.get(dayOfWeek);

      if (!dayHours || dayHours.length === 0) {
        continue; // No working hours for this day
      }

      const dateKey = checkDate.toISOString().split('T')[0];
      const dayReservations = reservationsByDate.get(dateKey) || [];

      // Check each working hour range for this day
      for (const hourRange of dayHours) {
        const [startHour, startMin] = hourRange.start_time
          .split(':')
          .map(Number);
        const [endHour, endMin] = hourRange.end_time.split(':').map(Number);

        const rangeStart = new Date(checkDate);
        rangeStart.setHours(startHour, startMin, 0, 0);

        const rangeEnd = new Date(checkDate);
        rangeEnd.setHours(endHour, endMin, 0, 0);

        // Get session duration from working hours or use default
        const sessionTimeMinutes = hourRange.session_time
          ? timeToMinutes(hourRange.session_time)
          : defaultSlotDurationMinutes;

        // If checking today and range has passed, skip
        if (dayOffset === 0 && rangeStart <= now) {
          const nextSlotStart = new Date(rangeStart);
          nextSlotStart.setMinutes(
            nextSlotStart.getMinutes() +
              Math.ceil(
                (now.getTime() - rangeStart.getTime()) /
                  (1000 * 60) /
                  sessionTimeMinutes,
              ) *
                sessionTimeMinutes,
          );
          if (nextSlotStart >= rangeEnd) {
            continue;
          }
          rangeStart.setTime(nextSlotStart.getTime());
        }

        // Try to find an available slot in this range
        let currentSlot = new Date(rangeStart);

        while (currentSlot < rangeEnd) {
          const slotEnd = new Date(currentSlot);
          slotEnd.setMinutes(slotEnd.getMinutes() + sessionTimeMinutes);

          if (slotEnd > rangeEnd) {
            break; // Slot doesn't fit in range
          }

          // Check if this slot conflicts with existing reservations
          const hasConflict = dayReservations.some((res) => {
            const resStart = new Date(res);
            const resEnd = new Date(res);
            resEnd.setMinutes(resEnd.getMinutes() + sessionTimeMinutes);
            return (
              (currentSlot >= resStart && currentSlot < resEnd) ||
              (slotEnd > resStart && slotEnd <= resEnd) ||
              (currentSlot <= resStart && slotEnd >= resEnd)
            );
          });

          if (!hasConflict && currentSlot > now) {
            // Found available slot
            return {
              date: currentSlot.toISOString().split('T')[0],
              time: `${String(currentSlot.getHours()).padStart(2, '0')}:${String(currentSlot.getMinutes()).padStart(2, '0')}`,
              datetime: currentSlot.toISOString(),
              session_time: hourRange.session_time || null,
              branch_id: hourRange.branch_id ?? null,
            };
          }

          // Move to next slot
          currentSlot.setMinutes(currentSlot.getMinutes() + sessionTimeMinutes);
        }
      }
    }

    return null; // No available slot found
  }
}

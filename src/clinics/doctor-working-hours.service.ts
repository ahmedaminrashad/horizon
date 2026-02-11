import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DoctorWorkingHour, DayOfWeek } from './entities/doctor-working-hour.entity';
import { Doctor } from '../doctors/entities/doctor.entity';
import { Clinic } from './entities/clinic.entity';
import {
  CreateDoctorWorkingHoursDto,
  CreateBulkDoctorWorkingHoursDto,
} from './dto/create-doctor-working-hours.dto';
import { TenantDataSourceService } from '../database/tenant-data-source.service';
import { DoctorWorkingHour as ClinicDoctorWorkingHour } from '../clinic/working-hours/entities/doctor-working-hour.entity';

@Injectable()
export class DoctorWorkingHoursService {
  constructor(
    @InjectRepository(DoctorWorkingHour)
    private doctorWorkingHoursRepository: Repository<DoctorWorkingHour>,
    @InjectRepository(Doctor)
    private doctorsRepository: Repository<Doctor>,
    @InjectRepository(Clinic)
    private clinicsRepository: Repository<Clinic>,
    private tenantDataSourceService: TenantDataSourceService,
  ) {}

  /**
   * Validate time range
   */
  private validateTimeRange(startTime: string, endTime: string): void {
    const start = this.timeToMinutes(startTime);
    const end = this.timeToMinutes(endTime);

    if (start >= end) {
      throw new BadRequestException(
        `Invalid time range: end time (${endTime}) must be after start time (${startTime})`,
      );
    }
  }

  /**
   * Convert time string (HH:MM:SS) to minutes
   */
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Check if two time ranges overlap
   */
  private rangesOverlap(
    start1: string,
    end1: string,
    start2: string,
    end2: string,
  ): boolean {
    const s1 = this.timeToMinutes(start1);
    const e1 = this.timeToMinutes(end1);
    const s2 = this.timeToMinutes(start2);
    const e2 = this.timeToMinutes(end2);

    return !(e1 <= s2 || e2 <= s1);
  }

  /**
   * Convert minutes to time string (HH:MM:SS)
   */
  private minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:00`;
  }

  /**
   * Generate time slots from start_time to end_time based on session_time
   * Returns an array of { start_time, end_time } objects
   */
  private generateTimeSlots(
    startTime: string,
    endTime: string,
    sessionTime: string,
  ): Array<{ start_time: string; end_time: string }> {
    const slots: Array<{ start_time: string; end_time: string }> = [];
    const startMinutes = this.timeToMinutes(startTime);
    const endMinutes = this.timeToMinutes(endTime);
    const sessionMinutes = this.timeToMinutes(sessionTime);

    if (sessionMinutes <= 0) {
      // If session_time is invalid, return a single slot
      return [{ start_time: startTime, end_time: endTime }];
    }

    let currentStart = startMinutes;
    while (currentStart < endMinutes) {
      const slotEnd = Math.min(currentStart + sessionMinutes, endMinutes);
      slots.push({
        start_time: this.minutesToTime(currentStart),
        end_time: this.minutesToTime(slotEnd),
      });
      currentStart = slotEnd;
    }

    return slots;
  }

  /**
   * Get all working hours for a doctor
   */
  async getWorkingHours(doctorId: number): Promise<DoctorWorkingHour[]> {
    return this.doctorWorkingHoursRepository.find({
      where: { doctor_id: doctorId },
      order: {
        day: 'ASC',
        start_time: 'ASC',
      },
    });
  }

  /**
   * Get doctor working hours by day
   */
  async getWorkingHoursByDay(
    doctorId: number,
    day: DayOfWeek,
  ): Promise<DoctorWorkingHour[]> {
    return this.doctorWorkingHoursRepository.find({
      where: { doctor_id: doctorId, day },
      order: {
        start_time: 'ASC',
      },
    });
  }

  /**
   * Get doctor working hours by branch
   */
  async getWorkingHoursByBranch(
    doctorId: number,
    branchId: number,
  ): Promise<DoctorWorkingHour[]> {
    return this.doctorWorkingHoursRepository.find({
      where: { doctor_id: doctorId, branch_id: branchId },
      order: {
        day: 'ASC',
        start_time: 'ASC',
      },
    });
  }

  /**
   * Create or update doctor working hours
   */
  async setWorkingHours(
    doctorId: number,
    createDto: CreateDoctorWorkingHoursDto,
    skipClinicSync = false,
  ): Promise<DoctorWorkingHour> {
    // Verify doctor exists
    const doctor = await this.doctorsRepository.findOne({
      where: { id: doctorId },
    });

    if (!doctor) {
      throw new NotFoundException(`Doctor with ID ${doctorId} not found`);
    }

    // Validate time range
    this.validateTimeRange(createDto.start_time, createDto.end_time);

    // Check for existing working hours on the same day, branch, and time overlap
    const whereCondition: any = {
      doctor_id: doctorId,
      day: createDto.day,
      is_active: true,
    };
    if (createDto.branch_id !== undefined) {
      whereCondition.branch_id = createDto.branch_id;
    } else {
      whereCondition.branch_id = null;
    }
    const existing = await this.doctorWorkingHoursRepository.find({
      where: whereCondition,
    });

    const waterfall = createDto.waterfall ?? true;
    const sessionTime = createDto.session_time;

    // If waterfall is false/0 and session_time is provided, generate multiple slots
    if (!waterfall && sessionTime) {
      const timeSlots = this.generateTimeSlots(
        createDto.start_time,
        createDto.end_time,
        sessionTime,
      );

      if (timeSlots.length === 0) {
        throw new BadRequestException(
          'No time slots can be generated with the provided parameters',
        );
      }

      // Check for overlaps with all slots
      for (const existingHour of existing) {
        for (const slot of timeSlots) {
          if (
            this.rangesOverlap(
              existingHour.start_time,
              existingHour.end_time,
              slot.start_time,
              slot.end_time,
            )
          ) {
            throw new BadRequestException(
              `Working hours overlap with existing schedule on ${createDto.day} ` +
                `(${existingHour.start_time} - ${existingHour.end_time})`,
            );
          }
        }
      }

      // Create multiple working hour records
      const createdHours: DoctorWorkingHour[] = [];
      for (const slot of timeSlots) {
        const workingHourData: any = {
          doctor_id: doctorId,
          clinic_id: doctor.clinic_id,
          day: createDto.day,
          start_time: slot.start_time,
          end_time: slot.end_time,
          is_active: createDto.is_active ?? true,
          waterfall: false,
          session_time: sessionTime,
          fees: createDto.fees ?? 0,
          busy: createDto.busy ?? false,
          patients_limit: createDto.patients_limit ?? 1, // If not waterfall, default to 1
        };
        if (createDto.branch_id !== undefined) {
          workingHourData.branch_id = createDto.branch_id;
        }
        const workingHour = this.doctorWorkingHoursRepository.create(workingHourData);
        const saved = (await this.doctorWorkingHoursRepository.save(workingHour)) as unknown as DoctorWorkingHour;
        createdHours.push(saved);
      }

      // Sync all created hours to clinic database if not skipping
      if (!skipClinicSync && createdHours.length > 0) {
        await this.syncToClinic(doctorId, createdHours);
      }

      // Return the first created hour for backward compatibility
      return createdHours[0];
    }

    // Original logic for waterfall = true (single record)
    // Check for overlaps
    for (const existingHour of existing) {
      if (
        this.rangesOverlap(
          existingHour.start_time,
          existingHour.end_time,
          createDto.start_time,
          createDto.end_time,
        )
      ) {
        throw new BadRequestException(
          `Working hours overlap with existing schedule on ${createDto.day} ` +
            `(${existingHour.start_time} - ${existingHour.end_time})`,
        );
      }
    }

    // Create new working hour
    const workingHourData: any = {
      doctor_id: doctorId,
      clinic_id: doctor.clinic_id,
      day: createDto.day,
      start_time: createDto.start_time,
      end_time: createDto.end_time,
      is_active: createDto.is_active ?? true,
      waterfall: waterfall,
      session_time: sessionTime,
      fees: createDto.fees ?? 0,
      busy: createDto.busy ?? false,
      patients_limit: waterfall ? (createDto.patients_limit ?? null) : 1, // If not waterfall, set to 1
    };
    if (createDto.branch_id !== undefined) {
      workingHourData.branch_id = createDto.branch_id;
    }
    const workingHour = this.doctorWorkingHoursRepository.create(workingHourData);

    const saved = (await this.doctorWorkingHoursRepository.save(workingHour)) as unknown as DoctorWorkingHour;

    // Sync to clinic database if not skipping
    if (!skipClinicSync) {
      await this.syncToClinic(doctorId, [saved]);
    }

    return saved;
  }

  /**
   * Bulk create doctor working hours
   */
  async setBulkWorkingHours(
    createDto: CreateBulkDoctorWorkingHoursDto,
    skipClinicSync = false,
  ): Promise<DoctorWorkingHour[]> {
    // Verify doctor exists
    const doctor = await this.doctorsRepository.findOne({
      where: { id: createDto.doctor_id },
    });

    if (!doctor) {
      throw new NotFoundException(
        `Doctor with ID ${createDto.doctor_id} not found`,
      );
    }

    const createdHours: DoctorWorkingHour[] = [];

    for (const workingHourDto of createDto.working_hours) {
      // Validate time range
      this.validateTimeRange(
        workingHourDto.start_time,
        workingHourDto.end_time,
      );

      const waterfall = workingHourDto.waterfall ?? true;
      const sessionTime = workingHourDto.session_time;

      // Check for existing working hours on the same day, branch, and time overlap
      const whereCondition: any = {
        doctor_id: createDto.doctor_id,
        day: workingHourDto.day,
        is_active: true,
      };
      if (workingHourDto.branch_id !== undefined) {
        whereCondition.branch_id = workingHourDto.branch_id;
      } else {
        whereCondition.branch_id = null;
      }
      const existing = await this.doctorWorkingHoursRepository.find({
        where: whereCondition,
      });

      // If waterfall is false/0 and session_time is provided, generate multiple slots
      if (!waterfall && sessionTime) {
        const timeSlots = this.generateTimeSlots(
          workingHourDto.start_time,
          workingHourDto.end_time,
          sessionTime,
        );

        if (timeSlots.length === 0) {
          continue; // Skip this working hour if no slots can be generated
        }

        // Check for overlaps with all slots
        let hasOverlap = false;
        for (const existingHour of existing) {
          for (const slot of timeSlots) {
            if (
              this.rangesOverlap(
                existingHour.start_time,
                existingHour.end_time,
                slot.start_time,
                slot.end_time,
              )
            ) {
              hasOverlap = true;
              break;
            }
          }
          if (hasOverlap) break;
        }

        if (!hasOverlap) {
          // Create multiple working hour records
          const slotHours: DoctorWorkingHour[] = [];
          for (const slot of timeSlots) {
            const workingHourData: any = {
              doctor_id: createDto.doctor_id,
              clinic_id: doctor.clinic_id,
              day: workingHourDto.day,
              start_time: slot.start_time,
              end_time: slot.end_time,
              is_active: workingHourDto.is_active ?? true,
              waterfall: false,
              session_time: sessionTime,
              fees: workingHourDto.fees ?? 0,
              busy: workingHourDto.busy ?? false,
              patients_limit: workingHourDto.patients_limit ?? 1, // If not waterfall, default to 1
            };
            if (workingHourDto.branch_id !== undefined) {
              workingHourData.branch_id = workingHourDto.branch_id;
            }
            const workingHour = this.doctorWorkingHoursRepository.create(workingHourData);
            const saved = (await this.doctorWorkingHoursRepository.save(workingHour)) as unknown as DoctorWorkingHour;
            slotHours.push(saved);
            createdHours.push(saved);
          }

          // Sync to clinic database if not skipping
          if (!skipClinicSync && slotHours.length > 0) {
            await this.syncToClinic(createDto.doctor_id, slotHours);
          }
        }
      } else {
        // Original logic for waterfall = true (single record)
        // Check for overlaps
        let hasOverlap = false;
        for (const existingHour of existing) {
          if (
            this.rangesOverlap(
              existingHour.start_time,
              existingHour.end_time,
              workingHourDto.start_time,
              workingHourDto.end_time,
            )
          ) {
            hasOverlap = true;
            break;
          }
        }

        if (!hasOverlap) {
          const workingHourData: any = {
            doctor_id: createDto.doctor_id,
            clinic_id: doctor.clinic_id,
            day: workingHourDto.day,
            start_time: workingHourDto.start_time,
            end_time: workingHourDto.end_time,
            is_active: workingHourDto.is_active ?? true,
            waterfall: waterfall,
            session_time: sessionTime,
            fees: workingHourDto.fees ?? 0,
            busy: workingHourDto.busy ?? false,
            patients_limit: waterfall ? (workingHourDto.patients_limit ?? null) : 1, // If not waterfall, set to 1
          };
          if (workingHourDto.branch_id !== undefined) {
            workingHourData.branch_id = workingHourDto.branch_id;
          }
          const workingHour = this.doctorWorkingHoursRepository.create(workingHourData);

          const saved = (await this.doctorWorkingHoursRepository.save(workingHour)) as unknown as DoctorWorkingHour;
          createdHours.push(saved);

          // Sync to clinic database if not skipping
          if (!skipClinicSync) {
            await this.syncToClinic(createDto.doctor_id, saved);
          }
        }
      }
    }

    // Sync all created hours to clinic database if not skipping
    if (!skipClinicSync && createdHours.length > 0) {
      await this.syncToClinic(createDto.doctor_id, createdHours);
    }

    return createdHours;
  }

  /**
   * Update doctor working hour
   */
  async updateWorkingHour(
    id: number,
    updateDto: Partial<CreateDoctorWorkingHoursDto>,
  ): Promise<DoctorWorkingHour> {
    const workingHour = await this.doctorWorkingHoursRepository.findOne({
      where: { id },
    });

    if (!workingHour) {
      throw new NotFoundException(`Working hour with ID ${id} not found`);
    }

    // If updating time range, validate it
    const startTime = updateDto.start_time ?? workingHour.start_time;
    const endTime = updateDto.end_time ?? workingHour.end_time;

    if (updateDto.start_time || updateDto.end_time) {
      this.validateTimeRange(startTime, endTime);

      // Check for overlaps with other working hours (excluding current one)
      const existing = await this.doctorWorkingHoursRepository.find({
        where: {
          doctor_id: workingHour.doctor_id,
          day: updateDto.day ?? workingHour.day,
          branch_id: updateDto.branch_id ?? workingHour.branch_id ?? null,
          is_active: true,
        },
      });

      for (const existingHour of existing) {
        if (existingHour.id !== id) {
          if (
            this.rangesOverlap(
              existingHour.start_time,
              existingHour.end_time,
              startTime,
              endTime,
            )
          ) {
            throw new BadRequestException(
              `Working hours overlap with existing schedule on ${updateDto.day ?? workingHour.day} ` +
                `(${existingHour.start_time} - ${existingHour.end_time})`,
            );
          }
        }
      }
    }

    // Update fields
    Object.assign(workingHour, {
      day: updateDto.day ?? workingHour.day,
      branch_id: updateDto.branch_id ?? workingHour.branch_id,
      start_time: startTime,
      end_time: endTime,
      is_active:
        updateDto.is_active !== undefined
          ? updateDto.is_active
          : workingHour.is_active,
      waterfall:
        updateDto.waterfall !== undefined
          ? updateDto.waterfall
          : workingHour.waterfall,
      session_time: updateDto.session_time !== undefined ? updateDto.session_time : workingHour.session_time,
    });

    const saved = await this.doctorWorkingHoursRepository.save(workingHour);

    // Sync to clinic database
    await this.syncToClinic(workingHour.doctor_id, saved);

    return saved;
  }

  /**
   * Delete doctor working hour
   */
  async deleteWorkingHour(id: number): Promise<void> {
    const result = await this.doctorWorkingHoursRepository.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException(`Working hour with ID ${id} not found`);
    }
  }

  /**
   * Delete all working hours for a doctor
   */
  async deleteWorkingHours(doctorId: number): Promise<void> {
    await this.doctorWorkingHoursRepository.delete({ doctor_id: doctorId });
  }

  /**
   * Delete doctor working hours by day
   */
  async deleteWorkingHoursByDay(
    doctorId: number,
    day: DayOfWeek,
  ): Promise<void> {
    await this.doctorWorkingHoursRepository.delete({
      doctor_id: doctorId,
      day,
    });
  }

  /**
   * Sync working hours to clinic database
   */
  private async syncToClinic(
    doctorId: number,
    workingHours: DoctorWorkingHour | DoctorWorkingHour[],
  ): Promise<void> {
    const workingHoursArray = Array.isArray(workingHours)
      ? workingHours
      : [workingHours];
    try {
      // Get doctor to find clinic_id and clinic_doctor_id
      const doctor = await this.doctorsRepository.findOne({
        where: { id: doctorId },
      });

      if (!doctor) {
        return;
      }

      // Get clinic to find database name
      const clinic = await this.clinicsRepository.findOne({
        where: { id: doctor.clinic_id },
      });

      if (!clinic || !clinic.database_name) {
        return;
      }

      // Get tenant DataSource for the clinic
      const tenantDataSource =
        await this.tenantDataSourceService.getTenantDataSource(
          clinic.database_name,
        );

      if (!tenantDataSource || !tenantDataSource.isInitialized) {
        return;
      }

      const clinicWorkingHourRepository =
        tenantDataSource.getRepository<ClinicDoctorWorkingHour>(
          ClinicDoctorWorkingHour,
        );

      // Sync each working hour
      for (const workingHour of workingHoursArray) {
        // Check if working hour already exists in clinic database
        const whereCondition: any = {
          doctor_id: doctor.clinic_doctor_id,
          day: workingHour.day,
          start_time: workingHour.start_time,
          end_time: workingHour.end_time,
        };
        if (workingHour.branch_id !== undefined && workingHour.branch_id !== null) {
          whereCondition.branch_id = workingHour.branch_id;
        } else {
          whereCondition.branch_id = null;
        }

        const existing = await clinicWorkingHourRepository.findOne({
          where: whereCondition,
        });

        if (existing) {
          // Update existing
          Object.assign(existing, {
            is_active: workingHour.is_active,
            waterfall: workingHour.waterfall,
            session_time: workingHour.session_time,
          });
          await clinicWorkingHourRepository.save(existing);
        } else {
          // Create new
          const clinicWorkingHourData: any = {
            doctor_id: doctor.clinic_doctor_id,
            clinic_id: doctor.clinic_id,
            day: workingHour.day,
            start_time: workingHour.start_time,
            end_time: workingHour.end_time,
            is_active: workingHour.is_active,
            waterfall: workingHour.waterfall,
            session_time: workingHour.session_time,
          };
          if (workingHour.branch_id !== undefined && workingHour.branch_id !== null) {
            clinicWorkingHourData.branch_id = workingHour.branch_id;
          } else {
            clinicWorkingHourData.branch_id = null;
          }
          const clinicWorkingHour = clinicWorkingHourRepository.create(clinicWorkingHourData);
          await clinicWorkingHourRepository.save(clinicWorkingHour);
        }
      }
    } catch (error) {
      // Log error but don't throw - syncing is not critical
      console.error(
        `Error syncing doctor working hours to clinic database: ${error.message}`,
      );
    }
  }
}


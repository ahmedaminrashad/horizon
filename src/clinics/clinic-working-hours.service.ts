import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  ClinicWorkingHour,
  DayOfWeek,
} from './entities/clinic-working-hour.entity';
import { ClinicBreakHour } from './entities/clinic-break-hour.entity';
import { Clinic } from './entities/clinic.entity';
import { CreateClinicWorkingHoursDto } from './dto/create-clinic-working-hours.dto';
import { CreateClinicBreakHoursDto } from './dto/create-clinic-break-hours.dto';
import { TenantDataSourceService } from '../database/tenant-data-source.service';
import { WorkingHour } from '../clinic/working-hours/entities/working-hour.entity';
import { BreakHour } from '../clinic/working-hours/entities/break-hour.entity';

@Injectable()
export class ClinicWorkingHoursService {
  constructor(
    @InjectRepository(ClinicWorkingHour)
    private clinicWorkingHoursRepository: Repository<ClinicWorkingHour>,
    @InjectRepository(ClinicBreakHour)
    private clinicBreakHoursRepository: Repository<ClinicBreakHour>,
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
   * Validate working hours ranges for overlaps
   */
  private validateWorkingRanges(
    ranges: Array<{ start_time: string; end_time: string }>,
    day: DayOfWeek,
  ): void {
    for (const range of ranges) {
      this.validateTimeRange(range.start_time, range.end_time);
    }

    for (let i = 0; i < ranges.length; i++) {
      for (let j = i + 1; j < ranges.length; j++) {
        if (
          this.rangesOverlap(
            ranges[i].start_time,
            ranges[i].end_time,
            ranges[j].start_time,
            ranges[j].end_time,
          )
        ) {
          throw new BadRequestException(
            `Overlapping working hours detected on ${day}: ` +
              `${ranges[i].start_time}-${ranges[i].end_time} overlaps with ` +
              `${ranges[j].start_time}-${ranges[j].end_time}`,
          );
        }
      }
    }
  }

  /**
   * Get all working hours for a clinic
   */
  async getWorkingHours(clinicId: number): Promise<ClinicWorkingHour[]> {
    return this.clinicWorkingHoursRepository.find({
      where: { clinic_id: clinicId },
      order: {
        day: 'ASC',
        range_order: 'ASC',
      },
    });
  }

  /**
   * Set working hours for a clinic (main database)
   * @param skipClinicSync If true, skip syncing to clinic database (prevents circular sync)
   */
  async setWorkingHours(
    clinicId: number,
    createWorkingHoursDto: CreateClinicWorkingHoursDto,
    skipClinicSync = false,
  ): Promise<ClinicWorkingHour[]> {
    // Verify clinic exists
    const clinic = await this.clinicsRepository.findOne({
      where: { id: clinicId },
    });

    if (!clinic) {
      throw new NotFoundException(`Clinic with ID ${clinicId} not found`);
    }

    // Validate all working hours first
    for (const dayData of createWorkingHoursDto.days) {
      this.validateWorkingRanges(dayData.working_ranges, dayData.day);
    }

    // Get all days that will be updated
    const daysToUpdate = createWorkingHoursDto.days.map((d) => d.day);

    // Delete existing working hours for these days
    await this.clinicWorkingHoursRepository.delete({
      clinic_id: clinicId,
      day: In(daysToUpdate),
    });

    // Create new working hours
    const workingHours: ClinicWorkingHour[] = [];
    for (const dayData of createWorkingHoursDto.days) {
      for (let i = 0; i < dayData.working_ranges.length; i++) {
        const range = dayData.working_ranges[i];
        const workingHour = this.clinicWorkingHoursRepository.create({
          clinic_id: clinicId,
          day: dayData.day,
          start_time: range.start_time,
          end_time: range.end_time,
          range_order: i,
          is_active: true,
        });
        workingHours.push(workingHour);
      }
    }

    const savedWorkingHours =
      await this.clinicWorkingHoursRepository.save(workingHours);

    // Automatically sync to clinic database if it exists (unless skipClinicSync is true)
    if (!skipClinicSync) {
      try {
        await this.syncWorkingHoursToClinic(clinicId);
      } catch (error) {
        // Log error but don't fail the operation if sync fails
        console.warn(
          `Failed to auto-sync working hours to clinic database for clinic ${clinicId}:`,
          error,
        );
      }
    }

    return savedWorkingHours;
  }

  /**
   * Get all break hours for a clinic
   */
  async getBreakHours(clinicId: number): Promise<ClinicBreakHour[]> {
    return this.clinicBreakHoursRepository.find({
      where: { clinic_id: clinicId },
      order: {
        day: 'ASC',
        break_order: 'ASC',
      },
    });
  }

  /**
   * Set break hours for a clinic (main database)
   * @param skipClinicSync If true, skip syncing to clinic database (prevents circular sync)
   */
  async setBreakHours(
    clinicId: number,
    createBreakHoursDto: CreateClinicBreakHoursDto,
    skipClinicSync = false,
  ): Promise<ClinicBreakHour[]> {
    // Verify clinic exists
    const clinic = await this.clinicsRepository.findOne({
      where: { id: clinicId },
    });

    if (!clinic) {
      throw new NotFoundException(`Clinic with ID ${clinicId} not found`);
    }

    // Get working hours for validation
    const allWorkingHours = await this.getWorkingHours(clinicId);
    const workingHoursByDay = new Map<
      DayOfWeek,
      Array<{ start_time: string; end_time: string }>
    >();

    for (const wh of allWorkingHours) {
      if (!workingHoursByDay.has(wh.day)) {
        workingHoursByDay.set(wh.day, []);
      }
      workingHoursByDay.get(wh.day)!.push({
        start_time: wh.start_time,
        end_time: wh.end_time,
      });
    }

    // Validate break hours
    for (const dayData of createBreakHoursDto.days) {
      const workingRanges = workingHoursByDay.get(dayData.day) || [];

      if (workingRanges.length === 0) {
        throw new BadRequestException(
          `Cannot set break hours for ${dayData.day}: No working hours defined for this day`,
        );
      }

      // Validate each break range
      for (const breakRange of dayData.break_ranges) {
        this.validateTimeRange(breakRange.start_time, breakRange.end_time);
      }

      // Check for overlaps between breaks
      for (let i = 0; i < dayData.break_ranges.length; i++) {
        for (let j = i + 1; j < dayData.break_ranges.length; j++) {
          if (
            this.rangesOverlap(
              dayData.break_ranges[i].start_time,
              dayData.break_ranges[i].end_time,
              dayData.break_ranges[j].start_time,
              dayData.break_ranges[j].end_time,
            )
          ) {
            throw new BadRequestException(
              `Overlapping break hours detected on ${dayData.day}`,
            );
          }
        }
      }

      // Check if breaks are within working hours
      for (const breakRange of dayData.break_ranges) {
        const isWithinWorkingHours = workingRanges.some((workingRange) => {
          const breakStart = this.timeToMinutes(breakRange.start_time);
          const breakEnd = this.timeToMinutes(breakRange.end_time);
          const workStart = this.timeToMinutes(workingRange.start_time);
          const workEnd = this.timeToMinutes(workingRange.end_time);

          return breakStart >= workStart && breakEnd <= workEnd;
        });

        if (!isWithinWorkingHours) {
          throw new BadRequestException(
            `Break time ${breakRange.start_time}-${breakRange.end_time} on ${dayData.day} ` +
              `is outside of working hours. Breaks must be within working time ranges.`,
          );
        }
      }
    }

    // Get all days that will be updated
    const daysToUpdate = createBreakHoursDto.days.map((d) => d.day);

    // Delete existing break hours for these days
    await this.clinicBreakHoursRepository.delete({
      clinic_id: clinicId,
      day: In(daysToUpdate),
    });

    // Create new break hours
    const breakHours: ClinicBreakHour[] = [];
    for (const dayData of createBreakHoursDto.days) {
      for (let i = 0; i < dayData.break_ranges.length; i++) {
        const range = dayData.break_ranges[i];
        const breakHour = this.clinicBreakHoursRepository.create({
          clinic_id: clinicId,
          day: dayData.day,
          start_time: range.start_time,
          end_time: range.end_time,
          break_order: i,
          is_active: true,
        });
        breakHours.push(breakHour);
      }
    }

    const savedBreakHours = await this.clinicBreakHoursRepository.save(breakHours);

    // Automatically sync to clinic database if it exists (unless skipClinicSync is true)
    if (!skipClinicSync) {
      try {
        await this.syncBreakHoursToClinic(clinicId);
      } catch (error) {
        // Log error but don't fail the operation if sync fails
        console.warn(
          `Failed to auto-sync break hours to clinic database for clinic ${clinicId}:`,
          error,
        );
      }
    }

    return savedBreakHours;
  }

  /**
   * Sync both working hours and break hours to clinic database
   */
  async syncToClinic(clinicId: number): Promise<void> {
    await this.syncWorkingHoursToClinic(clinicId);
    await this.syncBreakHoursToClinic(clinicId);
  }

  /**
   * Sync working hours from main database to clinic database
   * This is called automatically when working hours are set, but can also be called manually
   */
  private async syncWorkingHoursToClinic(clinicId: number): Promise<void> {
    const clinic = await this.clinicsRepository.findOne({
      where: { id: clinicId },
    });

    if (!clinic || !clinic.database_name) {
      // Clinic database doesn't exist yet, skip sync
      return;
    }

    // Get working hours from main database
    const mainWorkingHours = await this.getWorkingHours(clinicId);

    if (mainWorkingHours.length === 0) {
      return; // No working hours to sync
    }

    // Get clinic database DataSource
    const tenantDataSource =
      await this.tenantDataSourceService.getTenantDataSource(
        clinic.database_name,
      );

    if (!tenantDataSource || !tenantDataSource.isInitialized) {
      // Database not accessible
      throw new BadRequestException(
        `Clinic database "${clinic.database_name}" is not accessible`,
      );
    }

    const workingHoursRepository =
      tenantDataSource.getRepository(WorkingHour);

    // Group by day and delete existing
    const daysToUpdate = [
      ...new Set(mainWorkingHours.map((wh) => wh.day)),
    ];
    await workingHoursRepository.delete({ day: In(daysToUpdate) });

    // Create working hours in clinic database
    const clinicWorkingHours = mainWorkingHours.map((wh) =>
      workingHoursRepository.create({
        day: wh.day,
        start_time: wh.start_time,
        end_time: wh.end_time,
        range_order: wh.range_order,
        is_active: wh.is_active,
      }),
    );

    await workingHoursRepository.save(clinicWorkingHours);
  }

  /**
   * Sync break hours from main database to clinic database
   * This is called automatically when break hours are set, but can also be called manually
   */
  private async syncBreakHoursToClinic(clinicId: number): Promise<void> {
    const clinic = await this.clinicsRepository.findOne({
      where: { id: clinicId },
    });

    if (!clinic || !clinic.database_name) {
      // Clinic database doesn't exist yet, skip sync
      return;
    }

    // Get break hours from main database
    const mainBreakHours = await this.getBreakHours(clinicId);

    if (mainBreakHours.length === 0) {
      return; // No break hours to sync
    }

    // Get clinic database DataSource
    const tenantDataSource =
      await this.tenantDataSourceService.getTenantDataSource(
        clinic.database_name,
      );

    if (!tenantDataSource || !tenantDataSource.isInitialized) {
      // Database not accessible
      throw new BadRequestException(
        `Clinic database "${clinic.database_name}" is not accessible`,
      );
    }

    const breakHoursRepository = tenantDataSource.getRepository(BreakHour);

    // Group by day and delete existing
    const daysToUpdate = [...new Set(mainBreakHours.map((bh) => bh.day))];
    await breakHoursRepository.delete({ day: In(daysToUpdate) });

    // Create break hours in clinic database
    const clinicBreakHours = mainBreakHours.map((bh) =>
      breakHoursRepository.create({
        day: bh.day,
        start_time: bh.start_time,
        end_time: bh.end_time,
        break_order: bh.break_order,
        is_active: bh.is_active,
      }),
    );

    await breakHoursRepository.save(clinicBreakHours);
  }

  /**
   * Get paginated working hours with filters (public endpoint)
   */
  async findAllWorkingHours(
    clinic_id?: number,
    day?: DayOfWeek,
    start_time?: string,
    end_time?: string,
    page: number = 1,
    limit: number = 10,
  ) {
    const skip = (page - 1) * limit;

    const queryBuilder =
      this.clinicWorkingHoursRepository.createQueryBuilder('wh');

    // Join with clinic to get clinic details
    queryBuilder.leftJoinAndSelect('wh.clinic', 'clinic');

    // Apply filters
    if (clinic_id) {
      queryBuilder.andWhere('wh.clinic_id = :clinic_id', { clinic_id });
    }

    if (day) {
      queryBuilder.andWhere('wh.day = :day', { day });
    }

    if (start_time) {
      queryBuilder.andWhere('wh.start_time >= :start_time', { start_time });
    }

    if (end_time) {
      queryBuilder.andWhere('wh.end_time <= :end_time', { end_time });
    }

    // Only get active working hours
    queryBuilder.andWhere('wh.is_active = :is_active', { is_active: true });

    // Order by clinic_id, day, and range_order
    queryBuilder.orderBy('wh.clinic_id', 'ASC');
    queryBuilder.addOrderBy('wh.day', 'ASC');
    queryBuilder.addOrderBy('wh.range_order', 'ASC');

    // Apply pagination
    queryBuilder.skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}


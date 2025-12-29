import {
  Injectable,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { Repository, In } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { TenantRepositoryService } from '../../database/tenant-repository.service';
import { TenantDataSourceService } from '../../database/tenant-data-source.service';
import { WorkingHour, DayOfWeek } from './entities/working-hour.entity';
import { BreakHour } from './entities/break-hour.entity';
import { CreateWorkingHoursDto } from './dto/create-working-hours.dto';
import { CreateBreakHoursDto } from './dto/create-break-hours.dto';
import { ClinicWorkingHoursService } from '../../clinics/clinic-working-hours.service';
import type { CreateClinicWorkingHoursDto } from '../../clinics/dto/create-clinic-working-hours.dto';
import type { CreateClinicBreakHoursDto } from '../../clinics/dto/create-clinic-break-hours.dto';
import { ClinicWorkingHour } from '../../clinics/entities/clinic-working-hour.entity';

@Injectable()
export class WorkingHoursService {
  constructor(
    private tenantRepositoryService: TenantRepositoryService,
    private tenantDataSourceService: TenantDataSourceService,
    @Inject(forwardRef(() => ClinicWorkingHoursService))
    private clinicWorkingHoursService: ClinicWorkingHoursService,
    @InjectRepository(ClinicWorkingHour)
    private clinicWorkingHourRepository: Repository<ClinicWorkingHour>,
  ) {}

  private async getWorkingHoursRepository(): Promise<Repository<WorkingHour>> {
    // Verify tenant context is set
    if (!this.tenantRepositoryService.isTenantContext()) {
      throw new BadRequestException(
        'Clinic context not found. Please ensure you are accessing this endpoint as a clinic user.',
      );
    }

    // Get tenant database name
    const tenantDatabase =
      this.tenantRepositoryService.getCurrentTenantDatabase();
    if (!tenantDatabase) {
      throw new BadRequestException(
        'Tenant database context is not set. Please ensure you are accessing this endpoint as a clinic user.',
      );
    }

    // Verify tenant DataSource is initialized
    const tenantDataSource =
      await this.tenantDataSourceService.getTenantDataSource(tenantDatabase);
    if (!tenantDataSource || !tenantDataSource.isInitialized) {
      throw new BadRequestException(
        `Clinic database "${tenantDatabase}" is not accessible. Please ensure the database exists and migrations have been run.`,
      );
    }

    // Get repository from tenant DataSource directly to ensure we're using the correct database
    return tenantDataSource.getRepository<WorkingHour>(WorkingHour);
  }

  private async getBreakHoursRepository(): Promise<Repository<BreakHour>> {
    // Verify tenant context is set
    if (!this.tenantRepositoryService.isTenantContext()) {
      throw new BadRequestException(
        'Clinic context not found. Please ensure you are accessing this endpoint as a clinic user.',
      );
    }

    // Get tenant database name
    const tenantDatabase =
      this.tenantRepositoryService.getCurrentTenantDatabase();
    if (!tenantDatabase) {
      throw new BadRequestException(
        'Tenant database context is not set. Please ensure you are accessing this endpoint as a clinic user.',
      );
    }

    // Verify tenant DataSource is initialized
    const tenantDataSource =
      await this.tenantDataSourceService.getTenantDataSource(tenantDatabase);
    if (!tenantDataSource || !tenantDataSource.isInitialized) {
      throw new BadRequestException(
        `Clinic database "${tenantDatabase}" is not accessible. Please ensure the database exists and migrations have been run.`,
      );
    }

    // Get repository from tenant DataSource directly to ensure we're using the correct database
    return tenantDataSource.getRepository<BreakHour>(BreakHour);
  }

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
    // Validate each range
    for (const range of ranges) {
      this.validateTimeRange(range.start_time, range.end_time);
    }

    // Check for overlaps
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
   * Validate break hours ranges and ensure they are within working hours
   */
  private validateBreakRanges(
    breakRanges: Array<{ start_time: string; end_time: string }>,
    workingRanges: Array<{ start_time: string; end_time: string }>,
    day: DayOfWeek,
  ): void {
    // Validate each break range
    for (const breakRange of breakRanges) {
      this.validateTimeRange(breakRange.start_time, breakRange.end_time);
    }

    // Check for overlaps between breaks
    for (let i = 0; i < breakRanges.length; i++) {
      for (let j = i + 1; j < breakRanges.length; j++) {
        if (
          this.rangesOverlap(
            breakRanges[i].start_time,
            breakRanges[i].end_time,
            breakRanges[j].start_time,
            breakRanges[j].end_time,
          )
        ) {
          throw new BadRequestException(
            `Overlapping break hours detected on ${day}: ` +
              `${breakRanges[i].start_time}-${breakRanges[i].end_time} overlaps with ` +
              `${breakRanges[j].start_time}-${breakRanges[j].end_time}`,
          );
        }
      }
    }

    // Check if breaks are within working hours
    for (const breakRange of breakRanges) {
      const isWithinWorkingHours = workingRanges.some((workingRange) => {
        const breakStart = this.timeToMinutes(breakRange.start_time);
        const breakEnd = this.timeToMinutes(breakRange.end_time);
        const workStart = this.timeToMinutes(workingRange.start_time);
        const workEnd = this.timeToMinutes(workingRange.end_time);

        return breakStart >= workStart && breakEnd <= workEnd;
      });

      if (!isWithinWorkingHours) {
        throw new BadRequestException(
          `Break time ${breakRange.start_time}-${breakRange.end_time} on ${day} ` +
            `is outside of working hours. Breaks must be within working time ranges.`,
        );
      }
    }
  }

  /**
   * Get all working hours
   */
  async getWorkingHours(): Promise<WorkingHour[]> {
    const repository = await this.getWorkingHoursRepository();
    return repository.find({
      order: {
        day: 'ASC',
        range_order: 'ASC',
      },
    });
  }

  /**
   * Get working hours with filters (public endpoint)
   * This queries the main database clinic_working_hours table
   */
  async getWorkingHoursWithFilters(
    clinicId?: number,
    day?: DayOfWeek,
    start_time?: string,
    end_time?: string,
  ): Promise<WorkingHour[]> {
    const queryBuilder =
      this.clinicWorkingHourRepository.createQueryBuilder('wh');

    if (clinicId) {
      queryBuilder.where('wh.clinic_id = :clinicId', { clinicId });
    }
    if (day) {
      queryBuilder.andWhere('wh.day = :day', { day });
    }
    if (start_time) {
      queryBuilder.andWhere('wh.start_time >= :start_time', {
        start_time: this.timeToMinutes(start_time),
      });
    }
    if (end_time) {
      queryBuilder.andWhere('wh.end_time <= :end_time', {
        end_time: this.timeToMinutes(end_time),
      });
    }

    queryBuilder.andWhere('wh.is_active = :isActive', { isActive: true });
    queryBuilder.orderBy('wh.day', 'ASC');
    queryBuilder.addOrderBy('wh.range_order', 'ASC');

    const clinicWorkingHours = await queryBuilder.getMany();

    // Convert ClinicWorkingHour to WorkingHour format
    return clinicWorkingHours.map((wh) => ({
      id: wh.id,
      day: wh.day,
      start_time: wh.start_time,
      end_time: wh.end_time,
      range_order: wh.range_order,
      is_active: wh.is_active,
      createdAt: wh.createdAt,
      updatedAt: wh.updatedAt,
    })) as WorkingHour[];
  }

  /**
   * Get working hours for a specific day
   */
  async getWorkingHoursByDay(day: DayOfWeek): Promise<WorkingHour[]> {
    const repository = await this.getWorkingHoursRepository();
    return repository.find({
      where: { day },
      order: {
        range_order: 'ASC',
      },
    });
  }

  /**
   * Create or update working hours
   */
  async setWorkingHours(
    clinicId: number,
    createWorkingHoursDto: CreateWorkingHoursDto,
  ): Promise<WorkingHour[]> {
    const repository = await this.getWorkingHoursRepository();

    // Validate all working hours first
    for (const dayData of createWorkingHoursDto.days) {
      this.validateWorkingRanges(dayData.working_ranges, dayData.day);
    }

    // Get all days that will be updated
    const daysToUpdate = createWorkingHoursDto.days.map((d) => d.day);

    // Delete existing working hours for these days
    await repository.delete({
      day: In(daysToUpdate),
    });

    // Create new working hours
    const workingHours: WorkingHour[] = [];
    for (const dayData of createWorkingHoursDto.days) {
      for (let i = 0; i < dayData.working_ranges.length; i++) {
        const range = dayData.working_ranges[i];
        const workingHour = repository.create({
          day: dayData.day,
          start_time: range.start_time,
          end_time: range.end_time,
          range_order: i,
          is_active: true,
        });
        workingHours.push(workingHour);
      }
    }

    const savedWorkingHours = await repository.save(workingHours);

    // Automatically sync to main database
    try {
      await this.syncWorkingHoursToMain(clinicId, createWorkingHoursDto);
    } catch (error) {
      // Log error but don't fail the operation if sync fails
      console.warn(
        `Failed to auto-sync working hours to main database for clinic ${clinicId}:`,
        error,
      );
    }

    return savedWorkingHours;
  }

  /**
   * Get all break hours
   */
  async getBreakHours(): Promise<BreakHour[]> {
    const repository = await this.getBreakHoursRepository();
    return repository.find({
      order: {
        day: 'ASC',
        break_order: 'ASC',
      },
    });
  }

  /**
   * Get break hours for a specific day
   */
  async getBreakHoursByDay(day: DayOfWeek): Promise<BreakHour[]> {
    const repository = await this.getBreakHoursRepository();
    return repository.find({
      where: { day },
      order: {
        break_order: 'ASC',
      },
    });
  }

  /**
   * Create or update break hours
   */
  async setBreakHours(
    clinicId: number,
    createBreakHoursDto: CreateBreakHoursDto,
  ): Promise<BreakHour[]> {
    // Get working hours for validation
    const allWorkingHours = await this.getWorkingHours();
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

      this.validateBreakRanges(
        dayData.break_ranges,
        workingRanges,
        dayData.day,
      );
    }

    // Get all days that will be updated
    const daysToUpdate = createBreakHoursDto.days.map((d) => d.day);

    // Delete existing break hours for these days
    const breakHoursRepository = await this.getBreakHoursRepository();
    await breakHoursRepository.delete({
      day: In(daysToUpdate),
    });

    // Create new break hours
    const breakHours: BreakHour[] = [];
    for (const dayData of createBreakHoursDto.days) {
      for (let i = 0; i < dayData.break_ranges.length; i++) {
        const range = dayData.break_ranges[i];
        const breakHour = breakHoursRepository.create({
          day: dayData.day,
          start_time: range.start_time,
          end_time: range.end_time,
          break_order: i,
          is_active: true,
        });
        breakHours.push(breakHour);
      }
    }

    const savedBreakHours = await breakHoursRepository.save(breakHours);

    // Automatically sync to main database
    try {
      await this.syncBreakHoursToMain(clinicId, createBreakHoursDto);
    } catch (error) {
      // Log error but don't fail the operation if sync fails
      console.warn(
        `Failed to auto-sync break hours to main database for clinic ${clinicId}:`,
        error,
      );
    }

    return savedBreakHours;
  }

  /**
   * Get complete schedule (working hours + breaks) for a day
   */
  async getScheduleByDay(day: DayOfWeek): Promise<{
    day: DayOfWeek;
    working_hours: WorkingHour[];
    break_hours: BreakHour[];
  }> {
    const workingHours = await this.getWorkingHoursByDay(day);
    const breakHours = await this.getBreakHoursByDay(day);

    return {
      day,
      working_hours: workingHours,
      break_hours: breakHours,
    };
  }

  /**
   * Get complete weekly schedule
   */
  async getWeeklySchedule(): Promise<
    Array<{
      day: DayOfWeek;
      working_hours: WorkingHour[];
      break_hours: BreakHour[];
    }>
  > {
    const allDays = Object.values(DayOfWeek);
    const schedule: Array<{
      day: DayOfWeek;
      working_hours: WorkingHour[];
      break_hours: BreakHour[];
    }> = [];

    for (const day of allDays) {
      schedule.push(await this.getScheduleByDay(day));
    }

    return schedule;
  }

  /**
   * Delete all working hours for a specific day
   */
  async deleteWorkingHoursByDay(day: DayOfWeek): Promise<void> {
    const repository = await this.getWorkingHoursRepository();
    await repository.delete({ day });
  }

  /**
   * Delete all break hours for a specific day
   */
  async deleteBreakHoursByDay(day: DayOfWeek): Promise<void> {
    const repository = await this.getBreakHoursRepository();
    await repository.delete({ day });
  }

  /**
   * Get default working hours formatted for slot template creation
   * Returns working hours grouped by day, excluding break times
   */
  async getDefaultScheduleForDoctor(): Promise<
    Array<{
      day: DayOfWeek;
      working_ranges: Array<{ start_time: string; end_time: string }>;
    }>
  > {
    const allWorkingHours = await this.getWorkingHours();
    const allBreakHours = await this.getBreakHours();

    // Group working hours by day
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

    // Get breaks by day
    const breaksByDay = new Map<
      DayOfWeek,
      Array<{ start_time: string; end_time: string }>
    >();

    for (const bh of allBreakHours) {
      if (!breaksByDay.has(bh.day)) {
        breaksByDay.set(bh.day, []);
      }
      breaksByDay.get(bh.day)!.push({
        start_time: bh.start_time,
        end_time: bh.end_time,
      });
    }

    // Format for slot template (working hours minus breaks)
    const schedule: Array<{
      day: DayOfWeek;
      working_ranges: Array<{ start_time: string; end_time: string }>;
    }> = [];

    for (const [day, workingRanges] of workingHoursByDay.entries()) {
      const breaks = breaksByDay.get(day) || [];
      const availableRanges: Array<{
        start_time: string;
        end_time: string;
      }> = [];

      for (const workingRange of workingRanges) {
        let currentStart = this.timeToMinutes(workingRange.start_time);
        const workingEnd = this.timeToMinutes(workingRange.end_time);

        // Sort breaks within this working range
        const relevantBreaks = breaks
          .filter((b) => {
            const breakStart = this.timeToMinutes(b.start_time);
            const breakEnd = this.timeToMinutes(b.end_time);
            return (
              (breakStart >= currentStart && breakStart < workingEnd) ||
              (breakEnd > currentStart && breakEnd <= workingEnd) ||
              (breakStart <= currentStart && breakEnd >= workingEnd)
            );
          })
          .sort((a, b) => {
            return (
              this.timeToMinutes(a.start_time) -
              this.timeToMinutes(b.start_time)
            );
          });

        // Create available ranges by subtracting breaks
        for (const breakRange of relevantBreaks) {
          const breakStart = this.timeToMinutes(breakRange.start_time);
          const breakEnd = this.timeToMinutes(breakRange.end_time);

          if (currentStart < breakStart) {
            // Add range before break
            availableRanges.push({
              start_time: this.minutesToTime(currentStart),
              end_time: this.minutesToTime(breakStart),
            });
          }
          currentStart = Math.max(currentStart, breakEnd);
        }

        // Add remaining range after last break
        if (currentStart < workingEnd) {
          availableRanges.push({
            start_time: this.minutesToTime(currentStart),
            end_time: this.minutesToTime(workingEnd),
          });
        }
      }

      if (availableRanges.length > 0) {
        schedule.push({
          day,
          working_ranges: availableRanges,
        });
      }
    }

    return schedule;
  }

  /**
   * Sync working hours from clinic database to main database
   */
  private async syncWorkingHoursToMain(
    clinicId: number,
    createWorkingHoursDto: CreateWorkingHoursDto,
  ): Promise<void> {
    // Convert clinic DTO to main database DTO format
    const clinicWorkingHoursDto: CreateClinicWorkingHoursDto = {
      days: createWorkingHoursDto.days.map((dayData) => ({
        day: dayData.day,
        working_ranges: dayData.working_ranges.map((range) => ({
          start_time: range.start_time,
          end_time: range.end_time,
        })),
      })),
    };

    // Sync to main database (skip clinic sync to prevent circular sync)
    await this.clinicWorkingHoursService.setWorkingHours(
      clinicId,
      clinicWorkingHoursDto,
      true, // skipClinicSync = true to prevent circular sync
    );
  }

  /**
   * Sync break hours from clinic database to main database
   */
  private async syncBreakHoursToMain(
    clinicId: number,
    createBreakHoursDto: CreateBreakHoursDto,
  ): Promise<void> {
    // Convert clinic DTO to main database DTO format
    const clinicBreakHoursDto: CreateClinicBreakHoursDto = {
      days: createBreakHoursDto.days.map((dayData) => ({
        day: dayData.day,
        break_ranges: dayData.break_ranges.map((range) => ({
          start_time: range.start_time,
          end_time: range.end_time,
        })),
      })),
    };

    // Sync to main database (skip clinic sync to prevent circular sync)
    await this.clinicWorkingHoursService.setBreakHours(
      clinicId,
      clinicBreakHoursDto,
      true, // skipClinicSync = true to prevent circular sync
    );
  }

  /**
   * Convert minutes to time string (HH:MM:SS)
   */
  private minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:00`;
  }
}

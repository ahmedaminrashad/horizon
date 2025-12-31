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
import { DoctorWorkingHour } from './entities/doctor-working-hour.entity';
import { Doctor } from '../doctors/entities/doctor.entity';
import { CreateWorkingHoursDto } from './dto/create-working-hours.dto';
import { CreateBreakHoursDto } from './dto/create-break-hours.dto';
import {
  CreateDoctorWorkingHoursDto,
  CreateBulkDoctorWorkingHoursDto,
} from './dto/create-doctor-working-hours.dto';
import { ClinicWorkingHoursService } from '../../clinics/clinic-working-hours.service';
import { DoctorWorkingHoursService } from '../../clinics/doctor-working-hours.service';
import type { CreateClinicWorkingHoursDto } from '../../clinics/dto/create-clinic-working-hours.dto';
import type { CreateClinicBreakHoursDto } from '../../clinics/dto/create-clinic-break-hours.dto';
import { ClinicWorkingHour } from '../../clinics/entities/clinic-working-hour.entity';
import { Doctor as MainDoctor } from '../../doctors/entities/doctor.entity';

@Injectable()
export class WorkingHoursService {
  constructor(
    private tenantRepositoryService: TenantRepositoryService,
    private tenantDataSourceService: TenantDataSourceService,
    @Inject(forwardRef(() => ClinicWorkingHoursService))
    private clinicWorkingHoursService: ClinicWorkingHoursService,
    @Inject(forwardRef(() => DoctorWorkingHoursService))
    private doctorWorkingHoursService: DoctorWorkingHoursService,
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

  private async getDoctorWorkingHoursRepository(): Promise<
    Repository<DoctorWorkingHour>
  > {
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

    // Get tenant DataSource
    const tenantDataSource =
      await this.tenantDataSourceService.getTenantDataSource(tenantDatabase);
    if (!tenantDataSource || !tenantDataSource.isInitialized) {
      throw new BadRequestException(
        `Clinic database "${tenantDatabase}" is not accessible. Please ensure the database exists and migrations have been run.`,
      );
    }

    // Get repository from tenant DataSource directly to ensure we're using the correct database
    return tenantDataSource.getRepository<DoctorWorkingHour>(DoctorWorkingHour);
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
   * Check if a time range exactly matches an existing working hour
   */
  private rangesExactMatch(
    start1: string,
    end1: string,
    start2: string,
    end2: string,
  ): boolean {
    return start1 === start2 && end1 === end2;
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
    const branchId = createWorkingHoursDto.branch_id ?? null;

    // Check for existing/conflicting working hours before deletion
    for (const dayData of createWorkingHoursDto.days) {
      const whereCondition: any = {
        day: dayData.day,
        is_active: true,
      };
      if (branchId !== null) {
        whereCondition.branch_id = branchId;
      } else {
        whereCondition.branch_id = null;
      }
      const existingHours = await repository.find({
        where: whereCondition,
      });

      // Check each new range against existing ones
      for (const newRange of dayData.working_ranges) {
        for (const existingHour of existingHours) {
          // Check for exact match (same duration)
          if (
            this.rangesExactMatch(
              existingHour.start_time,
              existingHour.end_time,
              newRange.start_time,
              newRange.end_time,
            )
          ) {
            throw new BadRequestException(
              `Working hours already exist for ${dayData.day} ` +
                `(${newRange.start_time} - ${newRange.end_time})` +
                (branchId ? ` at branch ${branchId}` : ' (clinic-wide)'),
            );
          }

          // Check for overlap/conflict
          if (
            this.rangesOverlap(
              existingHour.start_time,
              existingHour.end_time,
              newRange.start_time,
              newRange.end_time,
            )
          ) {
            throw new BadRequestException(
              `Working hours conflict detected for ${dayData.day}: ` +
                `New range (${newRange.start_time} - ${newRange.end_time}) ` +
                `overlaps with existing range (${existingHour.start_time} - ${existingHour.end_time})` +
                (branchId ? ` at branch ${branchId}` : ' (clinic-wide)'),
            );
          }
        }
      }
    }

    // Delete existing working hours for these days and branch
    const deleteCondition: any = {
      day: In(daysToUpdate),
    };
    if (branchId !== null) {
      deleteCondition.branch_id = branchId;
    } else {
      deleteCondition.branch_id = null;
    }
    await repository.delete(deleteCondition);

    // Create new working hours
    const workingHours: WorkingHour[] = [];
    for (const dayData of createWorkingHoursDto.days) {
      for (let i = 0; i < dayData.working_ranges.length; i++) {
        const range = dayData.working_ranges[i];
        const workingHourData: Partial<WorkingHour> = {
          day: dayData.day,
          start_time: range.start_time,
          end_time: range.end_time,
          range_order: i,
          is_active: true,
        };
        // Only include branch_id if it's not null (convert null to undefined)
        if (branchId !== null) {
          workingHourData.branch_id = branchId;
        }
        const workingHour = repository.create(workingHourData);
        workingHours.push(workingHour as WorkingHour);
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

  // ==================== Doctor Working Hours Methods ====================

  /**
   * Get all working hours for a doctor
   */
  async getDoctorWorkingHours(doctorId: number): Promise<DoctorWorkingHour[]> {
    const repository = await this.getDoctorWorkingHoursRepository();
    return repository.find({
      where: { doctor_id: doctorId },
      relations: ['branch'],
      order: {
        day: 'ASC',
        start_time: 'ASC',
      },
    });
  }

  /**
   * Get doctor working hours by day
   */
  async getDoctorWorkingHoursByDay(
    doctorId: number,
    day: DayOfWeek,
  ): Promise<DoctorWorkingHour[]> {
    const repository = await this.getDoctorWorkingHoursRepository();
    return repository.find({
      where: { doctor_id: doctorId, day },
      relations: ['branch'],
      order: {
        start_time: 'ASC',
      },
    });
  }

  /**
   * Get doctor working hours by branch
   */
  async getDoctorWorkingHoursByBranch(
    doctorId: number,
    branchId: number,
  ): Promise<DoctorWorkingHour[]> {
    const repository = await this.getDoctorWorkingHoursRepository();
    return repository.find({
      where: { doctor_id: doctorId, branch_id: branchId },
      relations: ['branch'],
      order: {
        day: 'ASC',
        start_time: 'ASC',
      },
    });
  }

  /**
   * Create or update doctor working hours
   */
  async setDoctorWorkingHours(
    doctorId: number,
    createDto: CreateDoctorWorkingHoursDto,
  ): Promise<DoctorWorkingHour> {
    // Validate time range
    this.validateTimeRange(createDto.start_time, createDto.end_time);

    const repository = await this.getDoctorWorkingHoursRepository();

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
    const existing = await repository.find({
      where: whereCondition,
    });

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
      day: createDto.day,
      start_time: createDto.start_time,
      end_time: createDto.end_time,
      is_active: createDto.is_active ?? true,
      waterfall: createDto.waterfall ?? true,
    };
    if (createDto.branch_id !== undefined) {
      workingHourData.branch_id = createDto.branch_id;
    }
    const workingHour = repository.create(workingHourData);

    const saved = (await repository.save(workingHour)) as unknown as DoctorWorkingHour;

    // Sync to main database
    await this.syncDoctorWorkingHoursToMain(doctorId, [saved]);

    return saved;
  }

  /**
   * Bulk create doctor working hours
   */
  async setBulkDoctorWorkingHours(
    createDto: CreateBulkDoctorWorkingHoursDto,
  ): Promise<DoctorWorkingHour[]> {
    const repository = await this.getDoctorWorkingHoursRepository();
    const createdHours: DoctorWorkingHour[] = [];

    for (const workingHourDto of createDto.working_hours) {
      // Validate time range
      this.validateTimeRange(
        workingHourDto.start_time,
        workingHourDto.end_time,
      );

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
      const existing = await repository.find({
        where: whereCondition,
      });

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
          day: workingHourDto.day,
          start_time: workingHourDto.start_time,
          end_time: workingHourDto.end_time,
          is_active: workingHourDto.is_active ?? true,
          waterfall: workingHourDto.waterfall ?? true,
        };
        if (workingHourDto.branch_id !== undefined) {
          workingHourData.branch_id = workingHourDto.branch_id;
        }
        const workingHour = repository.create(workingHourData);

        const saved = (await repository.save(workingHour)) as unknown as DoctorWorkingHour;
        createdHours.push(saved);
      }
    }

    // Sync all created hours to main database
    if (createdHours.length > 0) {
      await this.syncDoctorWorkingHoursToMain(
        createDto.doctor_id,
        createdHours,
      );
    }

    return createdHours;
  }

  /**
   * Update doctor working hour
   */
  async updateDoctorWorkingHour(
    id: number,
    updateDto: Partial<CreateDoctorWorkingHoursDto>,
  ): Promise<DoctorWorkingHour> {
    const repository = await this.getDoctorWorkingHoursRepository();

    const workingHour = await repository.findOne({ where: { id } });
    if (!workingHour) {
      throw new BadRequestException(`Working hour with ID ${id} not found`);
    }

    // If updating time range, validate it
    const startTime = updateDto.start_time ?? workingHour.start_time;
    const endTime = updateDto.end_time ?? workingHour.end_time;

    if (updateDto.start_time || updateDto.end_time) {
      this.validateTimeRange(startTime, endTime);

      // Check for overlaps with other working hours (excluding current one)
      const existing = await repository.find({
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
    });

    const saved = await repository.save(workingHour);

    // Sync to main database
    await this.syncDoctorWorkingHoursToMain(
      workingHour.doctor_id,
      saved,
    );

    return saved;
  }

  /**
   * Delete doctor working hour
   */
  async deleteDoctorWorkingHour(id: number): Promise<void> {
    const repository = await this.getDoctorWorkingHoursRepository();
    const result = await repository.delete(id);

    if (result.affected === 0) {
      throw new BadRequestException(`Working hour with ID ${id} not found`);
    }
  }

  /**
   * Delete all working hours for a doctor
   */
  async deleteDoctorWorkingHours(doctorId: number): Promise<void> {
    const repository = await this.getDoctorWorkingHoursRepository();
    await repository.delete({ doctor_id: doctorId });
  }

  /**
   * Delete doctor working hours by day
   */
  async deleteDoctorWorkingHoursByDay(
    doctorId: number,
    day: DayOfWeek,
  ): Promise<void> {
    const repository = await this.getDoctorWorkingHoursRepository();
    await repository.delete({ doctor_id: doctorId, day });
  }

  /**
   * Sync doctor working hours from clinic database to main database
   */
  private async syncDoctorWorkingHoursToMain(
    clinicDoctorId: number,
    workingHours: DoctorWorkingHour | DoctorWorkingHour[],
  ): Promise<void> {
    const workingHoursArray = Array.isArray(workingHours)
      ? workingHours
      : [workingHours];
    try {
      // Get clinic doctor to find clinic_id
      const doctorRepository = await this.getDoctorRepository();
      const clinicDoctor = await doctorRepository.findOne({
        where: { id: clinicDoctorId },
      });

      if (!clinicDoctor) {
        return;
      }

      // Get main database DataSource to find main doctor
      const mainDataSource = this.clinicWorkingHourRepository.manager.connection;
      const mainDoctorRepository = mainDataSource.getRepository(MainDoctor);

      // Find main database doctor by clinic_id and clinic_doctor_id
      const mainDoctor = await mainDoctorRepository.findOne({
        where: {
          clinic_id: clinicDoctor.clinic_id,
          clinic_doctor_id: clinicDoctorId,
        },
      });

      if (!mainDoctor) {
        return;
      }

      // Sync each working hour to main database
      for (const workingHour of workingHoursArray) {
        // Convert clinic working hour to main database DTO format
        const createDto: CreateDoctorWorkingHoursDto = {
          day: workingHour.day,
          branch_id: workingHour.branch_id ?? undefined,
          start_time: workingHour.start_time,
          end_time: workingHour.end_time,
          is_active: workingHour.is_active,
          waterfall: workingHour.waterfall,
        };

        // Sync to main database (skip clinic sync to prevent circular sync)
        await this.doctorWorkingHoursService.setWorkingHours(
          mainDoctor.id,
          createDto,
          true, // skipClinicSync = true to prevent circular sync
        );
      }
    } catch (error) {
      // Log error but don't fail the operation if sync fails
      console.warn(
        `Failed to auto-sync doctor working hours to main database for clinic doctor ${clinicDoctorId}:`,
        error,
      );
    }
  }

  /**
   * Get doctor repository from tenant DataSource
   */
  private async getDoctorRepository(): Promise<Repository<Doctor>> {
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

    const dataSource =
      await this.tenantDataSourceService.getTenantDataSource(tenantDatabase);
    if (!dataSource) {
      throw new BadRequestException('Tenant DataSource not available');
    }

    return dataSource.getRepository(Doctor);
  }
}

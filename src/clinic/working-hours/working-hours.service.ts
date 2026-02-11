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
import { DoctorService } from '../doctor-services/entities/doctor-service.entity';
import { CreateWorkingHoursDto } from './dto/create-working-hours.dto';
import { CreateBreakHoursDto } from './dto/create-break-hours.dto';
import {
  ClinicCreateDoctorWorkingHoursDto,
  CreateBulkDoctorWorkingHoursDto,
} from './dto/create-doctor-working-hours.dto';
import { ClinicWorkingHoursService } from '../../clinics/clinic-working-hours.service';
import { DoctorWorkingHoursService } from '../../clinics/doctor-working-hours.service';
import type { CreateClinicWorkingHoursDto } from '../../clinics/dto/create-clinic-working-hours.dto';
import type { CreateClinicBreakHoursDto } from '../../clinics/dto/create-clinic-break-hours.dto';
import type { CreateDoctorWorkingHoursDto } from '../../clinics/dto/create-doctor-working-hours.dto';
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

  private async getDoctorServiceRepository(): Promise<
    Repository<DoctorService>
  > {
    if (!this.tenantRepositoryService.isTenantContext()) {
      throw new BadRequestException(
        'Clinic context not found. Please ensure you are accessing this endpoint as a clinic user.',
      );
    }
    const tenantDatabase =
      this.tenantRepositoryService.getCurrentTenantDatabase();
    if (!tenantDatabase) {
      throw new BadRequestException(
        'Tenant database context is not set. Please ensure you are accessing this endpoint as a clinic user.',
      );
    }
    const tenantDataSource =
      await this.tenantDataSourceService.getTenantDataSource(tenantDatabase);
    if (!tenantDataSource || !tenantDataSource.isInitialized) {
      throw new BadRequestException(
        `Clinic database "${tenantDatabase}" is not accessible. Please ensure the database exists and migrations have been run.`,
      );
    }
    return tenantDataSource.getRepository<DoctorService>(DoctorService);
  }

  /**
   * Ensure each doctor_service id belongs to the given doctor; returns loaded DoctorService[].
   */
  private async getDoctorServicesByIdsAndDoctor(
    ids: number[],
    doctorId: number,
  ): Promise<DoctorService[]> {
    if (!ids?.length) return [];
    const repo = await this.getDoctorServiceRepository();
    const services = await repo.find({
      where: { id: In(ids), doctor_id: doctorId },
    });
    if (services.length !== ids.length) {
      const foundIds = new Set(services.map((s) => s.id));
      const missing = ids.filter((id) => !foundIds.has(id));
      throw new BadRequestException(
        `Doctor service(s) with ID(s) ${missing.join(', ')} not found or do not belong to this doctor`,
      );
    }
    return services;
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

    // Join with branch to include branch data
    queryBuilder.leftJoinAndSelect('wh.branch', 'branch');

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
    // Note: branch is excluded because ClinicWorkingHour uses main Branch entity
    // while WorkingHour expects clinic Branch entity (different schemas)
    return clinicWorkingHours.map((wh) => {
      const workingHour = {
        id: wh.id,
        day: wh.day,
        start_time: wh.start_time,
        end_time: wh.end_time,
        range_order: wh.range_order,
        is_active: wh.is_active,
        branch_id: wh.branch_id,
        branch: undefined, // Excluded due to type mismatch between main and clinic Branch entities
        createdAt: wh.createdAt,
        updatedAt: wh.updatedAt,
      } as unknown as WorkingHour;

      return workingHour;
    });
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
    // Get working hours for validation (matching the same branch)
    const branchId = createBreakHoursDto.branch_id ?? null;
    const repository = await this.getWorkingHoursRepository();
    const whereCondition: any = {};
    if (branchId !== null) {
      whereCondition.branch_id = branchId;
    } else {
      whereCondition.branch_id = null;
    }
    const allWorkingHours = await repository.find({
      where: whereCondition,
      order: {
        day: 'ASC',
        range_order: 'ASC',
      },
    });

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

    // Delete existing break hours for these days and branch
    const breakHoursRepository = await this.getBreakHoursRepository();
    const deleteCondition: any = {
      day: In(daysToUpdate),
    };
    if (branchId !== null) {
      deleteCondition.branch_id = branchId;
    } else {
      deleteCondition.branch_id = null;
    }
    await breakHoursRepository.delete(deleteCondition);

    // Create new break hours
    const breakHours: BreakHour[] = [];
    for (const dayData of createBreakHoursDto.days) {
      for (let i = 0; i < dayData.break_ranges.length; i++) {
        const range = dayData.break_ranges[i];
        const breakHourData: Partial<BreakHour> = {
          day: dayData.day,
          start_time: range.start_time,
          end_time: range.end_time,
          break_order: i,
          is_active: true,
        };
        // Only include branch_id if it's not null (convert null to undefined)
        if (branchId !== null) {
          breakHourData.branch_id = branchId;
        }
        const breakHour = breakHoursRepository.create(breakHourData);
        breakHours.push(breakHour as BreakHour);
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
   * Merges working hours instead of replacing - keeps existing records without conflicts
   */
  private async syncWorkingHoursToMain(
    clinicId: number,
    createWorkingHoursDto: CreateWorkingHoursDto,
  ): Promise<void> {
    const branchId = createWorkingHoursDto.branch_id ?? null;

    // Get existing working hours in main database for this clinic and branch
    const existingMainHours =
      await this.clinicWorkingHoursService.getWorkingHours(clinicId);

    // Filter by branch_id
    const existingForBranch = existingMainHours.filter((wh) => {
      if (branchId === null) {
        return wh.branch_id === null;
      }
      return wh.branch_id === branchId;
    });

    // Group existing hours by day for conflict checking
    const existingByDay = new Map<DayOfWeek, ClinicWorkingHour[]>();
    for (const wh of existingForBranch) {
      if (!existingByDay.has(wh.day)) {
        existingByDay.set(wh.day, []);
      }
      existingByDay.get(wh.day)!.push(wh);
    }

    // Prepare new working hours to add (only non-conflicting ones)
    const newWorkingHoursRanges: Array<{
      day: DayOfWeek;
      start_time: string;
      end_time: string;
      range_order: number;
    }> = [];

    for (const dayData of createWorkingHoursDto.days) {
      const existingForDay = existingByDay.get(dayData.day) || [];
      let rangeOrder = existingForDay.length;

      for (const range of dayData.working_ranges) {
        // Check if this working hour already exists (exact match)
        const exactMatch = existingForDay.some(
          (existing) =>
            existing.start_time === range.start_time &&
            existing.end_time === range.end_time,
        );

        if (exactMatch) {
          // Already exists, skip
          continue;
        }

        // Check for overlaps
        const hasOverlap = existingForDay.some((existing) =>
          this.rangesOverlap(
            existing.start_time,
            existing.end_time,
            range.start_time,
            range.end_time,
          ),
        );

        if (!hasOverlap) {
          // No conflict, add it
          newWorkingHoursRanges.push({
            day: dayData.day,
            start_time: range.start_time,
            end_time: range.end_time,
            range_order: rangeOrder++,
          });
        }
      }
    }

    // Save only new non-conflicting working hours using a merge method
    if (newWorkingHoursRanges.length > 0) {
      // Group by day for DTO format
      const daysMap = new Map<
        DayOfWeek,
        Array<{ start_time: string; end_time: string }>
      >();
      for (const range of newWorkingHoursRanges) {
        if (!daysMap.has(range.day)) {
          daysMap.set(range.day, []);
        }
        daysMap.get(range.day)!.push({
          start_time: range.start_time,
          end_time: range.end_time,
        });
      }

      const mergeDto: CreateClinicWorkingHoursDto = {
        branch_id: branchId ?? undefined,
        days: Array.from(daysMap.entries()).map(([day, working_ranges]) => ({
          day,
          working_ranges,
        })),
      };

      // Use merge method instead of setWorkingHours
      await this.mergeWorkingHoursToMain(clinicId, mergeDto);
    }

    // After syncing working hours, also sync break hours from clinic to main
    try {
      await this.syncBreakHoursFromClinicToMain(
        clinicId,
        createWorkingHoursDto.branch_id,
      );
    } catch (error) {
      // Log error but don't fail the operation if sync fails
      console.warn(
        `Failed to auto-sync break hours to main database after working hours update for clinic ${clinicId}:`,
        error,
      );
    }
  }

  /**
   * Merge working hours to main database without deleting existing ones
   */
  private async mergeWorkingHoursToMain(
    clinicId: number,
    createWorkingHoursDto: CreateClinicWorkingHoursDto,
  ): Promise<void> {
    // Use the merge method from ClinicWorkingHoursService
    await this.clinicWorkingHoursService.mergeWorkingHours(
      clinicId,
      createWorkingHoursDto,
    );
  }

  /**
   * Sync break hours from clinic database to main database
   * This is called after working hours are updated to keep break hours in sync
   */
  private async syncBreakHoursFromClinicToMain(
    clinicId: number,
    branchId?: number,
  ): Promise<void> {
    // Get break hours from clinic database
    const breakHoursRepository = await this.getBreakHoursRepository();
    const whereCondition: any = {};
    if (branchId !== undefined && branchId !== null) {
      whereCondition.branch_id = branchId;
    } else {
      whereCondition.branch_id = null;
    }

    const clinicBreakHours = await breakHoursRepository.find({
      where: whereCondition,
      order: {
        day: 'ASC',
        break_order: 'ASC',
      },
    });

    if (clinicBreakHours.length === 0) {
      // No break hours to sync
      return;
    }

    // Group break hours by day
    const breakHoursByDay = new Map<
      DayOfWeek,
      Array<{ start_time: string; end_time: string }>
    >();

    for (const bh of clinicBreakHours) {
      if (!breakHoursByDay.has(bh.day)) {
        breakHoursByDay.set(bh.day, []);
      }
      breakHoursByDay.get(bh.day)!.push({
        start_time: bh.start_time,
        end_time: bh.end_time,
      });
    }

    // Convert to main database DTO format
    const clinicBreakHoursDto: CreateClinicBreakHoursDto = {
      branch_id: branchId,
      days: Array.from(breakHoursByDay.entries()).map(
        ([day, break_ranges]) => ({
          day,
          break_ranges,
        }),
      ),
    };

    // Sync to main database (skip clinic sync to prevent circular sync)
    await this.clinicWorkingHoursService.setBreakHours(
      clinicId,
      clinicBreakHoursDto,
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
      branch_id: createBreakHoursDto.branch_id,
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

  // ==================== Doctor Working Hours Methods ====================

  /**
   * Get all working hours for a doctor, with optional filters by date, doctor_id, service_id, and clinic_id.
   * - date: ISO date (YYYY-MM-DD); filters to working hours for that day of the week.
   * - doctor_id: if provided, overrides path doctor id.
   * - service_id: only working hours that include this clinic service (via doctor_services).
   * - clinic_id: only working hours for this clinic.
   */
  async getDoctorWorkingHours(
    doctorId: number,
    filters?: {
      date?: string;
      doctor_id?: number;
      service_id?: number;
      clinic_id?: number;
    },
  ): Promise<DoctorWorkingHour[]> {
    const repository = await this.getDoctorWorkingHoursRepository();

    let day: DayOfWeek | undefined;
    if (filters?.date) {
      const d = new Date(filters.date);
      if (!isNaN(d.getTime())) {
        const dayNames: DayOfWeek[] = [
          DayOfWeek.SUNDAY,
          DayOfWeek.MONDAY,
          DayOfWeek.TUESDAY,
          DayOfWeek.WEDNESDAY,
          DayOfWeek.THURSDAY,
          DayOfWeek.FRIDAY,
          DayOfWeek.SATURDAY,
        ];
        day = dayNames[d.getDay()];
      }
    }

    const effectiveDoctorId = filters?.doctor_id ?? doctorId;
    const where: {
      doctor_id: number;
      day?: DayOfWeek;
      clinic_id?: number;
    } = {
      doctor_id: effectiveDoctorId,
    };
    if (day) where.day = day;
    if (filters?.clinic_id != null) where.clinic_id = filters.clinic_id;

    if (filters?.service_id != null) {
      const qb = repository
        .createQueryBuilder('dwh')
        .leftJoinAndSelect('dwh.branch', 'branch')
        .leftJoinAndSelect('dwh.doctor_services', 'ds')
        .leftJoinAndSelect('ds.service', 'svc')
        .where('dwh.doctor_id = :doctorId', { doctorId: effectiveDoctorId });
      if (day) qb.andWhere('dwh.day = :day', { day });
      if (filters.clinic_id != null)
        qb.andWhere('dwh.clinic_id = :clinicId', {
          clinicId: filters.clinic_id,
        });
      qb.andWhere(
        'EXISTS (SELECT 1 FROM doctor_working_hour_doctor_services_doctor_service j JOIN doctor_services ds2 ON j.doctor_service_id = ds2.id WHERE j.doctor_working_hour_id = dwh.id AND ds2.service_id = :serviceId)',
        { serviceId: filters.service_id },
      )
        .orderBy('dwh.day', 'ASC')
        .addOrderBy('dwh.start_time', 'ASC');
      return qb.getMany();
    }

    return repository.find({
      where,
      relations: ['branch', 'doctor_services'],
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
      relations: ['branch', 'doctor_services'],
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
      relations: ['branch', 'doctor_services'],
      order: {
        day: 'ASC',
        start_time: 'ASC',
      },
    });
  }

  /**
   * Get doctor working hours by branch and day
   */
  async getDoctorWorkingHoursByBranchAndDay(
    doctorId: number,
    branchId: number,
    day: DayOfWeek,
  ): Promise<DoctorWorkingHour[]> {
    const repository = await this.getDoctorWorkingHoursRepository();
    return repository.find({
      where: { doctor_id: doctorId, branch_id: branchId, day },
      relations: ['branch', 'doctor_services'],
      order: {
        start_time: 'ASC',
      },
    });
  }

  /**
   * Create doctor working hours for multiple days (same settings per day).
   */
  async setDoctorWorkingHours(
    doctorId: number,
    createDto: ClinicCreateDoctorWorkingHoursDto,
  ): Promise<DoctorWorkingHour[]> {
    const doctorRepository = await this.getDoctorRepository();
    const doctor = await doctorRepository.findOne({
      where: { id: doctorId },
      select: ['id', 'clinic_id'],
    });
    if (!doctor) {
      throw new BadRequestException(`Doctor with ID ${doctorId} not found`);
    }
    const clinicId = doctor.clinic_id;

    const doctorServiceIds = createDto.doctor_service_ids ?? [];
    const doctorServices =
      doctorServiceIds.length > 0
        ? await this.getDoctorServicesByIdsAndDoctor(doctorServiceIds, doctorId)
        : [];

    // Validate time range
    this.validateTimeRange(createDto.start_time, createDto.end_time);

    // Validate break hours if provided
    if (createDto.break_hours_from != null || createDto.break_hours_to != null) {
      if (
        createDto.break_hours_from == null ||
        createDto.break_hours_to == null
      ) {
        throw new BadRequestException(
          'Both break_hours_from and break_hours_to must be provided together',
        );
      }
      this.validateTimeRange(
        createDto.break_hours_from,
        createDto.break_hours_to,
      );
      const workStart = this.timeToMinutes(createDto.start_time);
      const workEnd = this.timeToMinutes(createDto.end_time);
      const breakStart = this.timeToMinutes(createDto.break_hours_from);
      const breakEnd = this.timeToMinutes(createDto.break_hours_to);
      if (breakStart < workStart || breakEnd > workEnd) {
        throw new BadRequestException(
          `Break time ${createDto.break_hours_from}-${createDto.break_hours_to} must be within working hours ${createDto.start_time}-${createDto.end_time}`,
        );
      }
    }

    const repository = await this.getDoctorWorkingHoursRepository();
    const waterfall = createDto.waterfall ?? true;
    const sessionTime = createDto.session_time;
    const allCreated: DoctorWorkingHour[] = [];

    for (const day of createDto.days) {
      const whereCondition: any = {
        doctor_id: doctorId,
        day,
        is_active: true,
      };
      if (createDto.branch_id !== undefined) {
        whereCondition.branch_id = createDto.branch_id;
      } else {
        whereCondition.branch_id = null;
      }
      const existing = await repository.find({ where: whereCondition });

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
                `Working hours overlap with existing schedule on ${day} ` +
                  `(${existingHour.start_time} - ${existingHour.end_time})`,
              );
            }
          }
        }
        for (const slot of timeSlots) {
          const workingHourData: any = {
            doctor_id: doctorId,
            clinic_id: clinicId,
            day,
            start_time: slot.start_time,
            end_time: slot.end_time,
            is_active: createDto.is_active ?? true,
            waterfall: false,
            session_time: sessionTime,
            busy: createDto.busy ?? false,
            patients_limit: createDto.patients_limit ?? 1,
          };
          if (createDto.branch_id !== undefined) {
            workingHourData.branch_id = createDto.branch_id;
          }
          const workingHour = repository.create(workingHourData);
          const saved = (await repository.save(
            workingHour,
          )) as unknown as DoctorWorkingHour;
          if (doctorServices.length > 0) {
            (saved as any).doctor_services = doctorServices;
            await repository.save(saved);
          }
          allCreated.push(saved);
        }
      } else {
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
              `Working hours overlap with existing schedule on ${day} ` +
                `(${existingHour.start_time} - ${existingHour.end_time})`,
            );
          }
        }
        const workingHourData: any = {
          doctor_id: doctorId,
          clinic_id: clinicId,
          day,
          start_time: createDto.start_time,
          end_time: createDto.end_time,
          is_active: createDto.is_active ?? true,
          waterfall,
          session_time: sessionTime,
          busy: createDto.busy ?? false,
          patients_limit: waterfall ? (createDto.patients_limit ?? null) : 1,
        };
        if (createDto.branch_id !== undefined) {
          workingHourData.branch_id = createDto.branch_id;
        }
        workingHourData.break_hours_from = createDto.break_hours_from ?? null;
        workingHourData.break_hours_to = createDto.break_hours_to ?? null;
        const workingHour = repository.create(workingHourData);
        const saved = (await repository.save(
          workingHour,
        )) as unknown as DoctorWorkingHour;
        if (doctorServices.length > 0) {
          (saved as any).doctor_services = doctorServices;
          await repository.save(saved);
        }
        allCreated.push(saved);
      }
    }

    if (allCreated.length > 0) {
      await this.syncDoctorWorkingHoursToMain(doctorId, allCreated);
    }
    return allCreated;
  }

  /**
   * Bulk create doctor working hours
   */
  async setBulkDoctorWorkingHours(
    createDto: CreateBulkDoctorWorkingHoursDto,
  ): Promise<DoctorWorkingHour[]> {
    const doctorRepository = await this.getDoctorRepository();
    const doctor = await doctorRepository.findOne({
      where: { id: createDto.doctor_id },
      select: ['id', 'clinic_id'],
    });
    if (!doctor) {
      throw new BadRequestException(
        `Doctor with ID ${createDto.doctor_id} not found`,
      );
    }
    const clinicId = doctor.clinic_id;

    const repository = await this.getDoctorWorkingHoursRepository();
    const createdHours: DoctorWorkingHour[] = [];

    for (const workingHourDto of createDto.working_hours) {
      const idsForItem = workingHourDto.doctor_service_ids ?? [];
      const doctorServicesForItem =
        idsForItem.length > 0
          ? await this.getDoctorServicesByIdsAndDoctor(
              idsForItem,
              createDto.doctor_id,
            )
          : [];
      this.validateTimeRange(
        workingHourDto.start_time,
        workingHourDto.end_time,
      );
      const waterfall = workingHourDto.waterfall ?? true;
      const sessionTime = workingHourDto.session_time;
      const days = workingHourDto.days ?? [];

      for (const day of days) {
        const whereCondition: any = {
          doctor_id: createDto.doctor_id,
          day,
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

        if (!waterfall && sessionTime) {
          const timeSlots = this.generateTimeSlots(
            workingHourDto.start_time,
            workingHourDto.end_time,
            sessionTime,
          );
          if (timeSlots.length === 0) continue;

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
            for (const slot of timeSlots) {
              const workingHourData: any = {
                doctor_id: createDto.doctor_id,
                clinic_id: clinicId,
                day,
                start_time: slot.start_time,
                end_time: slot.end_time,
                is_active: workingHourDto.is_active ?? true,
                waterfall: false,
                session_time: sessionTime,
                busy: workingHourDto.busy ?? false,
                patients_limit: workingHourDto.patients_limit ?? 1,
              };
              if (workingHourDto.branch_id !== undefined) {
                workingHourData.branch_id = workingHourDto.branch_id;
              }
              const workingHour = repository.create(workingHourData);
              const saved = (await repository.save(
                workingHour,
              )) as unknown as DoctorWorkingHour;
              if (doctorServicesForItem.length > 0) {
                (saved as any).doctor_services = doctorServicesForItem;
                await repository.save(saved);
              }
              createdHours.push(saved);
            }
          }
        } else {
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
              clinic_id: clinicId,
              day,
              start_time: workingHourDto.start_time,
              end_time: workingHourDto.end_time,
              is_active: workingHourDto.is_active ?? true,
              waterfall,
              session_time: sessionTime,
              busy: workingHourDto.busy ?? false,
              patients_limit: waterfall ? (workingHourDto.patients_limit ?? null) : 1,
            };
            if (workingHourDto.branch_id !== undefined) {
              workingHourData.branch_id = workingHourDto.branch_id;
            }
            const workingHour = repository.create(workingHourData);
            const saved = (await repository.save(
              workingHour,
            )) as unknown as DoctorWorkingHour;
            if (doctorServicesForItem.length > 0) {
              (saved as any).doctor_services = doctorServicesForItem;
              await repository.save(saved);
            }
            createdHours.push(saved);
          }
        }
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
    updateDto: Partial<ClinicCreateDoctorWorkingHoursDto>,
  ): Promise<DoctorWorkingHour> {
    const repository = await this.getDoctorWorkingHoursRepository();

    const workingHour = await repository.findOne({ where: { id } });
    if (!workingHour) {
      throw new BadRequestException(`Working hour with ID ${id} not found`);
    }

    let updateDoctorServices: DoctorService[] | undefined;
    const updateIds = updateDto.doctor_service_ids;
    if (updateIds !== undefined) {
      updateDoctorServices =
        updateIds.length > 0
          ? await this.getDoctorServicesByIdsAndDoctor(
              updateIds,
              workingHour.doctor_id,
            )
          : [];
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
          day: workingHour.day,
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
              `Working hours overlap with existing schedule on ${workingHour.day} ` +
                `(${existingHour.start_time} - ${existingHour.end_time})`,
            );
          }
        }
      }
    }

    // Determine waterfall value
    const waterfall = updateDto.waterfall !== undefined
      ? updateDto.waterfall
      : workingHour.waterfall;

    // Determine patients_limit: if waterfall is false, set to 1; otherwise use provided value or keep existing
    let patientsLimit: number | null;
    if (!waterfall) {
      patientsLimit = 1;
    } else {
      patientsLimit = updateDto.patients_limit !== undefined
        ? updateDto.patients_limit
        : workingHour.patients_limit;
    }

    // Update fields
    Object.assign(workingHour, {
      day: workingHour.day,
      branch_id: updateDto.branch_id ?? workingHour.branch_id,
      start_time: startTime,
      end_time: endTime,
      is_active:
        updateDto.is_active !== undefined
          ? updateDto.is_active
          : workingHour.is_active,
      waterfall: waterfall,
      session_time:
        updateDto.session_time !== undefined
          ? updateDto.session_time
          : workingHour.session_time,
      busy:
        updateDto.busy !== undefined
          ? updateDto.busy
          : workingHour.busy,
      patients_limit: patientsLimit,
    });

    if (updateDoctorServices !== undefined) {
      (workingHour as any).doctor_services = updateDoctorServices;
    }

    const saved = await repository.save(workingHour);

    // Sync to main database
    await this.syncDoctorWorkingHoursToMain(workingHour.doctor_id, saved);

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
      const mainDataSource =
        this.clinicWorkingHourRepository.manager.connection;
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

      // Sync each working hour to main database (main DB uses single day per record)
      for (const workingHour of workingHoursArray) {
        const createDto: CreateDoctorWorkingHoursDto = {
          day: workingHour.day,
          branch_id: workingHour.branch_id ?? undefined,
          start_time: workingHour.start_time,
          end_time: workingHour.end_time,
          is_active: workingHour.is_active,
          waterfall: workingHour.waterfall,
          session_time: workingHour.session_time,
          busy: workingHour.busy ?? false,
          patients_limit: workingHour.patients_limit ?? null,
        };

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

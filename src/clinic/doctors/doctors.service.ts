import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { TenantRepositoryService } from '../../database/tenant-repository.service';
import { TenantDataSourceService } from '../../database/tenant-data-source.service';
import { UsersService } from '../../users/users.service';
import { ClinicsService } from '../../clinics/clinics.service';
import { RolesService } from '../../roles/roles.service';
import { Doctor } from './entities/doctor.entity';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
import { RegisterDoctorDto } from './dto/register-doctor.dto';
import { SlotTemplate } from '../slot-template/entities/slot-template.entity';
import { Role as ClinicRole } from '../permissions/entities/role.entity';
import { User as ClinicUser } from '../permissions/entities/user.entity';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { DoctorsService as MainDoctorsService } from '../../doctors/doctors.service';
import { WorkingHoursService } from '../working-hours/working-hours.service';
import { WorkingHour } from '../working-hours/entities/working-hour.entity';
import { BreakHour } from '../working-hours/entities/break-hour.entity';

@Injectable()
export class DoctorsService {
  constructor(
    @InjectDataSource()
    private defaultDataSource: DataSource,
    private tenantRepositoryService: TenantRepositoryService,
    private tenantDataSourceService: TenantDataSourceService,
    private usersService: UsersService,
    private clinicsService: ClinicsService,
    private rolesService: RolesService,
    private jwtService: JwtService,
    private mainDoctorsService: MainDoctorsService,
    private workingHoursService: WorkingHoursService,
  ) {}

  private async getRepository(): Promise<Repository<Doctor>> {
    const repository =
      await this.tenantRepositoryService.getRepository<Doctor>(Doctor);

    if (!repository) {
      throw new BadRequestException(
        'Clinic context not found. Please ensure you are accessing this endpoint as a clinic user.',
      );
    }

    return repository;
  }

  async create(
    clinicId: number,
    createDoctorDto: CreateDoctorDto,
  ): Promise<Doctor> {
    const repository = await this.getRepository();
    createDoctorDto.clinic_id = clinicId;
    const doctor = repository.create(createDoctorDto);
    const savedDoctor = await repository.save(doctor);

    // Create slot templates if provided, otherwise use default working hours
    const slotTemplateRepository =
      await this.tenantRepositoryService.getRepository<SlotTemplate>(
        SlotTemplate,
      );

    if (slotTemplateRepository) {
      if (
        createDoctorDto.slotTemplates &&
        createDoctorDto.slotTemplates.length > 0
      ) {
        // Use provided slot templates
        const slotTemplates = createDoctorDto.slotTemplates.map((template) =>
          slotTemplateRepository.create({
            duration: template.duration,
            cost: template.cost,
            days: template.days,
            doctor_id: savedDoctor.id,
          }),
        );
        await slotTemplateRepository.save(slotTemplates);
      } else {
        // Use default working hours as baseline
        const tenantDataSource =
          await this.tenantDataSourceService.getTenantDataSource(
            await this.getClinicDatabaseName(clinicId),
          );

        if (tenantDataSource) {
          await this.createSlotTemplatesFromDefaultHours(
            tenantDataSource,
            slotTemplateRepository,
            savedDoctor.id,
          );
        }
      }
    }

    // Reload with user relation for syncing
    const doctorWithUser = await repository.findOne({
      where: { id: savedDoctor.id },
      relations: ['user', 'slotTemplates'],
    });

    if (doctorWithUser) {
      // Sync to main doctors table
      await this.syncToMainDoctors(clinicId, doctorWithUser);
    }

    return doctorWithUser || savedDoctor;
  }

  async findAll(clinicId: number, page: number = 1, limit: number = 10) {
    const repository = await this.getRepository();
    const skip = (page - 1) * limit;

    const [data, total] = await repository.findAndCount({
      relations: ['user', 'slotTemplates'],
      skip,
      take: limit,
      order: {
        createdAt: 'DESC',
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

  async findOne(clinicId: number, id: number): Promise<Doctor> {
    const repository = await this.getRepository();
    const doctor = await repository.findOne({
      where: { id },
      relations: ['user', 'slotTemplates'],
    });

    if (!doctor) {
      throw new NotFoundException(`Doctor with ID ${id} not found`);
    }

    return doctor;
  }

  async update(
    clinicId: number,
    id: number,
    updateDoctorDto: UpdateDoctorDto,
  ): Promise<Doctor> {
    const repository = await this.getRepository();
    const doctor = await this.findOne(clinicId, id);

    // Extract slotTemplates if provided (handle separately to avoid cascade issues)
    const { slotTemplates, ...doctorUpdateData } = updateDoctorDto;

    // Update doctor fields (excluding slotTemplates)
    Object.assign(doctor, doctorUpdateData);
    const savedDoctor = await repository.save(doctor);

    // Handle slot templates separately if provided
    if (slotTemplates !== undefined) {
      const slotTemplateRepository =
        await this.tenantRepositoryService.getRepository<SlotTemplate>(
          SlotTemplate,
        );

      if (slotTemplateRepository) {
        // Remove existing slot templates
        await slotTemplateRepository.delete({ doctor_id: savedDoctor.id });

        // Create new slot templates if provided
        if (slotTemplates.length > 0) {
          const newSlotTemplates = slotTemplates.map((template) =>
            slotTemplateRepository.create({
              duration: template.duration,
              cost: template.cost,
              days: template.days,
              doctor_id: savedDoctor.id,
            }),
          );
          await slotTemplateRepository.save(newSlotTemplates);
        }
      }
    }

    // Reload with user relation for syncing
    const doctorWithUser = await repository.findOne({
      where: { id: savedDoctor.id },
      relations: ['user'],
    });

    if (doctorWithUser) {
      // Sync to main doctors table
      await this.syncToMainDoctors(clinicId, doctorWithUser);
    }

    return savedDoctor;
  }

  async remove(clinicId: number, id: number): Promise<void> {
    const repository = await this.getRepository();
    const doctor = await this.findOne(clinicId, id);
    await repository.remove(doctor);
  }

  async registerDoctor(clinicId: number, registerDoctorDto: RegisterDoctorDto) {
    // Get clinic to find clinic database
    const clinic = await this.clinicsService.findOne(clinicId);
    if (!clinic || !clinic.database_name) {
      throw new NotFoundException(
        'Clinic not found or clinic database not configured',
      );
    }

    // Get clinic database DataSource
    const clinicDataSource =
      await this.tenantDataSourceService.getTenantDataSource(
        clinic.database_name,
      );

    if (!clinicDataSource) {
      throw new NotFoundException('Clinic database not accessible');
    }

    // Get or create doctor role in clinic database
    const clinicRoleRepository = clinicDataSource.getRepository(ClinicRole);
    let clinicDoctorRole = await clinicRoleRepository.findOne({
      where: { slug: 'doctor' },
    });

    if (!clinicDoctorRole) {
      // Create doctor role in clinic database if it doesn't exist
      clinicDoctorRole = clinicRoleRepository.create({
        name: 'Doctor',
        slug: 'doctor',
        description: 'Doctor role for healthcare professionals',
      });
      clinicDoctorRole = await clinicRoleRepository.save(clinicDoctorRole);
    }

    // Extract user data and doctor-specific data
    const {
      age,
      department,
      password,
      license_number,
      degree,
      languages,
      bio,
      appoint_type,
      is_active,
      slotTemplates,
      branch_id,
      experience_years,
      number_of_patients,
      ...userData
    } = registerDoctorDto;

    // Check if phone already exists in clinic database
    const clinicUserRepository = clinicDataSource.getRepository(ClinicUser);
    const existingUserByPhone = await clinicUserRepository.findOne({
      where: { phone: registerDoctorDto.phone },
    });

    if (existingUserByPhone) {
      throw new ConflictException('Phone number already exists');
    }

    // Check if email already exists in clinic database (if provided)
    if (registerDoctorDto.email) {
      const existingUserByEmail = await clinicUserRepository.findOne({
        where: { email: registerDoctorDto.email },
      });

      if (existingUserByEmail) {
        throw new ConflictException('Email already exists');
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user in clinic database
    const clinicUser = clinicUserRepository.create({
      ...userData,
      password: hashedPassword,
      role_id: clinicDoctorRole.id,
      package_id: 0, // Default package for doctors
    });

    const savedClinicUser = await clinicUserRepository.save(clinicUser);

    // Create doctor record in clinic database
    const doctorRepository = clinicDataSource.getRepository(Doctor);
    const doctor = doctorRepository.create({
      age,
      department,
      user_id: savedClinicUser.id,
      clinic_id: clinicId,
      branch_id,
      experience_years,
      number_of_patients,
      license_number,
      degree,
      languages,
      bio,
      appoint_type,
      is_active: is_active !== undefined ? is_active : true,
    });

    const savedDoctor = await doctorRepository.save(doctor);

    // Create slot templates if provided, otherwise use default working hours
    const slotTemplateRepository =
      clinicDataSource.getRepository(SlotTemplate);

    if (slotTemplates && slotTemplates.length > 0) {
      // Use provided slot templates
      const slotTemplateEntities = slotTemplates.map((template) =>
        slotTemplateRepository.create({
          duration: template.duration,
          cost: template.cost,
          days: template.days,
          doctor_id: savedDoctor.id,
        }),
      );
      await slotTemplateRepository.save(slotTemplateEntities);
    } else {
      // Use default working hours as baseline
      await this.createSlotTemplatesFromDefaultHours(
        clinicDataSource,
        slotTemplateRepository,
        savedDoctor.id,
      );
    }

    // Reload with user and slotTemplates relations for syncing
    const doctorWithUser = await doctorRepository.findOne({
      where: { id: savedDoctor.id },
      relations: ['user', 'user.role', 'slotTemplates'],
    });

    if (!doctorWithUser || !doctorWithUser.user) {
      throw new NotFoundException('Doctor or user not found after creation');
    }

    // Reload clinic user with role info
    const clinicUserWithRole = await clinicUserRepository.findOne({
      where: { id: savedClinicUser.id },
      relations: ['role', 'role.permissions'],
    });

    if (!clinicUserWithRole) {
      throw new NotFoundException('Clinic user not found');
    }

    // Sync to main doctors table (use clinic user data)
    console.log('Syncing doctor to main doctors table', {
      name: clinicUserWithRole.name || '',
      age: savedDoctor.age,
      avatar: savedDoctor.avatar,
      email: clinicUserWithRole.email ?? undefined,
      phone: clinicUserWithRole.phone || undefined,
      department: savedDoctor.department,
      license_number: savedDoctor.license_number,
      degree: savedDoctor.degree,
      languages: savedDoctor.languages,
      bio: savedDoctor.bio,
      appoint_type: savedDoctor.appoint_type,
      is_active: savedDoctor.is_active,
    });
    await this.mainDoctorsService.syncDoctor(clinicId, savedDoctor.id, {
      name: clinicUserWithRole.name || '',
      age: savedDoctor.age,
      avatar: savedDoctor.avatar,
      email: clinicUserWithRole.email ?? undefined,
      phone: clinicUserWithRole.phone || undefined,
      department: savedDoctor.department,
      license_number: savedDoctor.license_number,
      degree: savedDoctor.degree,
      languages: savedDoctor.languages,
      bio: savedDoctor.bio,
      appoint_type: savedDoctor.appoint_type,
      is_active: savedDoctor.is_active,
      branch_id: savedDoctor.branch_id,
      experience_years: savedDoctor.experience_years,
      number_of_patients: savedDoctor.number_of_patients,
    });

    // Generate token with clinic user info
    const access_token = this.jwtService.sign({
      sub: clinicUserWithRole.id,
      role_id: clinicUserWithRole.role_id,
      database_name: clinic.database_name,
      role_slug: clinicUserWithRole.role?.slug,
      clinic_id: clinicId,
    });

    // Remove password from user object before returning
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = clinicUserWithRole;

    // Return doctor with slotTemplates already loaded from doctorWithUser
    return {
      fullUser: userWithoutPassword,
      doctor: doctorWithUser || savedDoctor,
      access_token,
    };
  }

  /**
   * Sync clinic doctor to main doctors table
   */
  private async syncToMainDoctors(
    clinicId: number,
    clinicDoctor: Doctor,
  ): Promise<void> {
    try {
      // Use the user relation if already loaded, otherwise load it
      let doctorUser: ClinicUser | undefined = clinicDoctor.user;
      if (!doctorUser) {
        const repository = await this.getRepository();
        const doctorWithUser = await repository.findOne({
          where: { id: clinicDoctor.id },
          relations: ['user'],
        });
        if (doctorWithUser?.user) {
          doctorUser = doctorWithUser.user;
        }
      }

      if (!doctorUser) {
        return;
      }

      const doctorName = doctorUser.name || '';
      const doctorEmail = doctorUser.email ?? undefined;
      const doctorPhone = doctorUser.phone || undefined;

      // Sync to main doctors table
      await this.mainDoctorsService.syncDoctor(clinicId, clinicDoctor.id, {
        name: doctorName,
        age: clinicDoctor.age,
        avatar: clinicDoctor.avatar,
        email: doctorEmail,
        phone: doctorPhone,
        department: clinicDoctor.department,
        license_number: clinicDoctor.license_number,
        degree: clinicDoctor.degree,
        languages: clinicDoctor.languages,
        bio: clinicDoctor.bio,
        appoint_type: clinicDoctor.appoint_type,
        is_active: clinicDoctor.is_active,
        branch_id: clinicDoctor.branch_id,
        experience_years: clinicDoctor.experience_years,
        number_of_patients: clinicDoctor.number_of_patients,
      });
    } catch (error) {
      // Log error but don't fail the operation
      console.error(
        `Failed to sync doctor ${clinicDoctor.id} to main doctors table:`,
        error,
      );
    }
  }

  /**
   * Get clinic database name
   */
  private async getClinicDatabaseName(clinicId: number): Promise<string> {
    const clinic = await this.clinicsService.findOne(clinicId);
    if (!clinic || !clinic.database_name) {
      throw new NotFoundException(
        'Clinic not found or clinic database not configured',
      );
    }
    return clinic.database_name;
  }

  /**
   * Convert time string (HH:MM:SS) to minutes
   */
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
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
   * Create slot templates from default working hours
   * Helper method that works with a DataSource directly
   */
  private async createSlotTemplatesFromDefaultHours(
    dataSource: DataSource,
    slotTemplateRepository: Repository<SlotTemplate>,
    doctorId: number,
  ): Promise<void> {
    try {
      const workingHourRepository = dataSource.getRepository(WorkingHour);
      const breakHourRepository = dataSource.getRepository(BreakHour);

      // Get all working hours and breaks
      const allWorkingHours = await workingHourRepository.find({
        order: { day: 'ASC', range_order: 'ASC' },
      });
      const allBreakHours = await breakHourRepository.find({
        order: { day: 'ASC', break_order: 'ASC' },
      });

      // Group working hours by day
      const workingHoursByDay = new Map();
      for (const wh of allWorkingHours) {
        if (!workingHoursByDay.has(wh.day)) {
          workingHoursByDay.set(wh.day, []);
        }
        workingHoursByDay.get(wh.day).push({
          start_time: wh.start_time,
          end_time: wh.end_time,
        });
      }

      // Group breaks by day
      const breaksByDay = new Map();
      for (const bh of allBreakHours) {
        if (!breaksByDay.has(bh.day)) {
          breaksByDay.set(bh.day, []);
        }
        breaksByDay.get(bh.day).push({
          start_time: bh.start_time,
          end_time: bh.end_time,
        });
      }

      // Create slot templates from working hours (excluding breaks)
      const slotTemplateEntities: SlotTemplate[] = [];

      for (const [day, workingRanges] of workingHoursByDay.entries()) {
        const breaks = breaksByDay.get(day) || [];

        for (const workingRange of workingRanges) {
          let currentStart = this.timeToMinutes(workingRange.start_time);
          const workingEnd = this.timeToMinutes(workingRange.end_time);

          // Get relevant breaks within this working range
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
            .sort(
              (a, b) =>
                this.timeToMinutes(a.start_time) -
                this.timeToMinutes(b.start_time),
            );

          // Create available time ranges by subtracting breaks
          for (const breakRange of relevantBreaks) {
            const breakStart = this.timeToMinutes(breakRange.start_time);
            const breakEnd = this.timeToMinutes(breakRange.end_time);

            if (currentStart < breakStart) {
              // Add range before break
              const rangeDuration = breakStart - currentStart;
              const slotDuration = Math.min(rangeDuration, 30); // Default 30 minutes

              slotTemplateEntities.push(
                slotTemplateRepository.create({
                  duration: this.minutesToTime(slotDuration),
                  cost: 0, // Default cost
                  days: day,
                  doctor_id: doctorId,
                }),
              );
            }
            currentStart = Math.max(currentStart, breakEnd);
          }

          // Add remaining range after last break
          if (currentStart < workingEnd) {
            const rangeDuration = workingEnd - currentStart;
            const slotDuration = Math.min(rangeDuration, 30); // Default 30 minutes

            slotTemplateEntities.push(
              slotTemplateRepository.create({
                duration: this.minutesToTime(slotDuration),
                cost: 0, // Default cost
                days: day,
                doctor_id: doctorId,
              }),
            );
          }
        }
      }

      if (slotTemplateEntities.length > 0) {
        await slotTemplateRepository.save(slotTemplateEntities);
      }
    } catch (error) {
      // Log error but don't fail doctor creation if working hours are not set
      console.warn(
        'Could not create slot templates from default working hours:',
        error,
      );
    }
  }
}

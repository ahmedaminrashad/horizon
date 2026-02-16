import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Clinic } from './entities/clinic.entity';
import { ClinicUser } from './entities/clinic-user.entity';
import { CreateClinicDto } from './dto/create-clinic.dto';
import { UpdateClinicDto } from './dto/update-clinic.dto';
import { RegisterClinicDto } from './dto/register-clinic.dto';
import { DatabaseService } from '../database/database.service';
import { ClinicMigrationService } from '../database/clinic-migration.service';
import * as bcrypt from 'bcrypt';
import { TenantDataSourceService } from '../database/tenant-data-source.service';
import { Country } from '../countries/entities/country.entity';
import { City } from '../cities/entities/city.entity';
import { Package } from '../packages/entities/package.entity';
import { Doctor } from '../doctors/entities/doctor.entity';
import { DoctorsService } from '../doctors/doctors.service';
import { Inject, forwardRef } from '@nestjs/common';
import { WorkingHour } from '../clinic/working-hours/entities/working-hour.entity';
import { IvrApiService } from '../voip/services/ivr-api.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class ClinicsService {
  constructor(
    @InjectRepository(Clinic)
    private clinicsRepository: Repository<Clinic>,
    @InjectRepository(Country)
    private countriesRepository: Repository<Country>,
    @InjectRepository(City)
    private citiesRepository: Repository<City>,
    @InjectRepository(Package)
    private packagesRepository: Repository<Package>,
    @InjectRepository(Doctor)
    private doctorsRepository: Repository<Doctor>,
    @InjectRepository(ClinicUser)
    private clinicUserRepository: Repository<ClinicUser>,
    private databaseService: DatabaseService,
    private clinicMigrationService: ClinicMigrationService,
    private tenantDataSourceService: TenantDataSourceService,
    @Inject(forwardRef(() => DoctorsService))
    private doctorsService: DoctorsService,
    private ivrApiService: IvrApiService,
    private usersService: UsersService,
  ) {}

  async create(createClinicDto: CreateClinicDto): Promise<Clinic> {
    // Check if email already exists
    const existingClinicByEmail = await this.clinicsRepository.findOne({
      where: { email: createClinicDto.email },
    });

    if (existingClinicByEmail) {
      throw new ConflictException('Email already exists');
    }

    // Check if phone already exists
    const existingClinicByPhone = await this.clinicsRepository.findOne({
      where: { phone: createClinicDto.phone },
    });

    if (existingClinicByPhone) {
      throw new ConflictException('Phone number already exists');
    }

    // Validate country if provided
    if (createClinicDto.country_id) {
      const country = await this.countriesRepository.findOne({
        where: { id: createClinicDto.country_id },
      });
      if (!country) {
        throw new NotFoundException(
          `Country with ID ${createClinicDto.country_id} not found`,
        );
      }
    }

    // Validate city if provided
    if (createClinicDto.city_id) {
      const city = await this.citiesRepository.findOne({
        where: { id: createClinicDto.city_id },
      });
      if (!city) {
        throw new NotFoundException(
          `City with ID ${createClinicDto.city_id} not found`,
        );
      }
    }

    // Validate package if provided
    if (createClinicDto.package_id) {
      const packageEntity = await this.packagesRepository.findOne({
        where: { id: createClinicDto.package_id },
      });
      if (!packageEntity) {
        throw new NotFoundException(
          `Package with ID ${createClinicDto.package_id} not found`,
        );
      }
    }

    // Generate extension number
    const extensionNumber = await this.generateExtensionNumber();

    const clinic = this.clinicsRepository.create({
      ...createClinicDto,
      extension_number: extensionNumber,
    });
    const savedClinic = await this.clinicsRepository.save(clinic);

    // Call IVR API to create queue
    try {
      await this.ivrApiService.addIVRQueue(savedClinic.id, extensionNumber);
    } catch (error) {
      // Log error but don't fail clinic creation if IVR fails
      console.error(`Failed to create IVR queue for clinic ${savedClinic.id}:`, error);
    }

    return savedClinic;
  }

  async findAll(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [data, total, totalActive, totalInactive, totalUsers] =
      await Promise.all([
        this.clinicsRepository.find({
          skip,
          take: limit,
          relations: ['country', 'city', 'branches', 'package'],
          order: { createdAt: 'DESC' },
        }),
        this.clinicsRepository.count(),
        this.clinicsRepository.count({ where: { is_active: true } }),
        this.clinicsRepository.count({ where: { is_active: false } }),
        this.usersService.count(),
      ]);

    // Fetch doctors for each clinic
    const clinicsWithDoctors = await Promise.all(
      data.map(async (clinic) => {
        const doctors = await this.doctorsRepository.find({
          where: { clinic_id: clinic.id },
          order: { createdAt: 'DESC' },
        });

        return {
          ...clinic,
          doctors,
        };
      }),
    );

    const totalPages = Math.ceil(total / limit);

    return {
      data: clinicsWithDoctors,
      meta: {
        total,
        total_active: totalActive,
        total_inactive: totalInactive,
        total_users: totalUsers,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async findOne(id: number): Promise<Clinic & { doctors?: any[] }> {
    const clinic = await this.clinicsRepository.findOne({
      where: { id },
      relations: ['country', 'city', 'branches', 'package'],
    });

    if (!clinic) {
      throw new NotFoundException(`Clinic with ID ${id} not found`);
    }

    // Fetch doctors for the clinic
    const doctors = await this.doctorsRepository.find({
      where: { clinic_id: clinic.id },
      order: { createdAt: 'DESC' },
    });

    // Fetch working hours for branches from clinic database
    let branchesWithWorkingHours = clinic.branches || [];
    if (clinic.database_name && clinic.branches && clinic.branches.length > 0) {
      const clinicDataSource =
        await this.tenantDataSourceService.getTenantDataSource(
          clinic.database_name,
        );

      if (clinicDataSource) {
        const workingHoursRepository =
          clinicDataSource.getRepository(WorkingHour);

        branchesWithWorkingHours = await Promise.all(
          clinic.branches.map(async (branch) => {
            // Use clinic_branch_id to match with branch_id in clinic database
            // Main database branches have clinic_branch_id that references clinic database branch id
            const branchId =
              'clinic_branch_id' in branch && branch.clinic_branch_id
                ? branch.clinic_branch_id
                : branch.id;
            const workingHours = await workingHoursRepository.find({
              where: { branch_id: branchId, is_active: true },
              order: { day: 'ASC', range_order: 'ASC' },
            });

            return {
              ...branch,
              working_hours: workingHours,
            };
          }),
        );
      }
    }

    return {
      ...clinic,
      doctors,
      branches: branchesWithWorkingHours,
    };
  }

  /**
   * Get main users (patients) linked to clinic via clinic_user table.
   * @param clinicId Clinic ID (or use options.clinic_id to filter by another clinic).
   * @param options Optional: phone (legacy), search (name, phone, email, patient id), is_active, clinic_id.
   */
  async getClinicPatients(
    clinicId: number,
    options?: {
      phone?: string;
      search?: string;
      is_active?: boolean;
      clinic_id?: number;
    },
  ) {
    const effectiveClinicId = options?.clinic_id ?? clinicId;
    const clinic = await this.clinicsRepository.findOne({
      where: { id: effectiveClinicId },
    });
    if (!clinic) {
      throw new NotFoundException(
        `Clinic with ID ${effectiveClinicId} not found`,
      );
    }

    const qb = this.clinicUserRepository
      .createQueryBuilder('cu')
      .leftJoinAndSelect('cu.user', 'user')
      .where('cu.clinic_id = :clinicId', { clinicId: effectiveClinicId })
      .orderBy('cu.createdAt', 'DESC');

    const phone = options?.phone?.trim();
    if (phone) {
      qb.andWhere('user.phone LIKE :phone', {
        phone: `%${phone}%`,
      });
    }

    if (options?.is_active !== undefined) {
      qb.andWhere('cu.is_active = :isActive', {
        isActive: options.is_active,
      });
    }

    const search = options?.search?.trim();
    if (search) {
      const searchId = parseInt(search, 10);
      const isNumericId =
        !Number.isNaN(searchId) && String(searchId) === search;
      const likeArg = `%${search.replace(/%/g, '\\%')}%`;
      const orParts: string[] = [
        'user.name LIKE :searchLike',
        'user.phone LIKE :searchLike',
        'user.email LIKE :searchLike',
      ];
      if (isNumericId) {
        orParts.push('(cu.id = :searchId OR user.id = :searchId)');
      }
      qb.andWhere(`(${orParts.join(' OR ')})`);
      qb.setParameters({
        ...qb.getParameters(),
        searchLike: likeArg,
        ...(isNumericId && { searchId }),
      });
    }

    const clinicUsers = await qb.getMany();
    return clinicUsers.map((cu) => {
      const { user, ...rest } = cu;
      const userSafe =
        user != null
          ? Object.fromEntries(
              Object.entries(user).filter(([key]) => key !== 'password'),
            )
          : undefined;
      return { ...rest, user: userSafe };
    });
  }

  /**
   * Get a single patient (main user) linked to the clinic by clinic id and patient (user) id.
   */
  async getClinicPatientById(clinicId: number, patientId: number) {
    const clinic = await this.clinicsRepository.findOne({
      where: { id: clinicId },
    });
    if (!clinic) {
      throw new NotFoundException(`Clinic with ID ${clinicId} not found`);
    }
    const clinicUser = await this.clinicUserRepository.findOne({
      where: { clinic_id: clinicId, user_id: patientId },
      relations: ['user'],
    });
    if (!clinicUser) {
      throw new NotFoundException(
        `Patient with ID ${patientId} not found in clinic ${clinicId}`,
      );
    }
    const { user, ...rest } = clinicUser;
    const userSafe =
      user != null
        ? Object.fromEntries(
            Object.entries(user).filter(([key]) => key !== 'password'),
          )
        : undefined;
    return { ...rest, user: userSafe };
  }

  /**
   * Get clinic_user_id for a main user linked to a clinic (from main DB clinic_user table).
   * Returns the user id in the clinic's tenant DB, or null if not linked or not yet set.
   */
  async getClinicUserIdForMainUser(
    mainUserId: number,
    clinicId: number,
  ): Promise<number | null> {
    const link = await this.clinicUserRepository.findOne({
      where: { user_id: mainUserId, clinic_id: clinicId },
    });
    return link?.clinic_user_id ?? null;
  }

  /**
   * Create or update clinic_user link with clinic_user_id (user id in clinic tenant DB).
   */
  async setClinicUserIdForMainUser(
    mainUserId: number,
    clinicId: number,
    clinicUserId: number,
  ): Promise<void> {
    let link = await this.clinicUserRepository.findOne({
      where: { user_id: mainUserId, clinic_id: clinicId },
    });
    if (link) {
      link.clinic_user_id = clinicUserId;
      await this.clinicUserRepository.save(link);
    } else {
      link = this.clinicUserRepository.create({
        user_id: mainUserId,
        clinic_id: clinicId,
        clinic_user_id: clinicUserId,
      });
      await this.clinicUserRepository.save(link);
    }
  }

  /**
   * Create a main user (patient) and link to a clinic.
   */
  async addClinicPatient(
    clinicId: number,
    dto: {
      name?: string;
      phone: string;
      email?: string;
      password: string;
      package_id?: number;
      role_id?: number;
    },
  ) {
    const clinic = await this.clinicsRepository.findOne({
      where: { id: clinicId },
    });
    if (!clinic) {
      throw new NotFoundException(`Clinic with ID ${clinicId} not found`);
    }
    const user = await this.usersService.create({
      ...dto,
      package_id: dto.package_id ?? 0,
    });
    const existing = await this.clinicUserRepository.findOne({
      where: { clinic_id: clinicId, user_id: user.id },
    });
    if (existing) {
      throw new ConflictException(
        `User ${user.id} is already linked to clinic ${clinicId}`,
      );
    }
    const clinicUser = this.clinicUserRepository.create({
      clinic_id: clinicId,
      user_id: user.id,
    });
    await this.clinicUserRepository.save(clinicUser);
    return this.getClinicPatientById(clinicId, user.id);
  }

  /**
   * Update a clinic patient: user data (name, phone, email) and/or link status (is_active).
   */
  async updateClinicPatient(
    clinicId: number,
    patientId: number,
    dto: {
      is_active?: boolean;
      name?: string;
      phone?: string;
      email?: string;
    },
  ) {
    const clinicUser = await this.clinicUserRepository.findOne({
      where: { clinic_id: clinicId, user_id: patientId },
      relations: ['user'],
    });
    if (!clinicUser) {
      throw new NotFoundException(
        `Patient with ID ${patientId} not found in clinic ${clinicId}`,
      );
    }

    if (dto.is_active !== undefined) {
      clinicUser.is_active = dto.is_active;
      await this.clinicUserRepository.save(clinicUser);
    }

    const userUpdates: { name?: string; phone?: string; email?: string } = {};
    if (dto.name !== undefined) userUpdates.name = dto.name;
    if (dto.phone !== undefined) userUpdates.phone = dto.phone;
    if (dto.email !== undefined) userUpdates.email = dto.email;
    if (Object.keys(userUpdates).length > 0) {
      await this.usersService.update(clinicUser.user_id, userUpdates);
    }

    return this.getClinicPatientById(clinicId, patientId);
  }

  async updateLastActive(id: number): Promise<void> {
    await this.clinicsRepository.update(id, { last_active: new Date() });
  }

  async update(id: number, updateClinicDto: UpdateClinicDto): Promise<Clinic> {
    const clinic = await this.findOne(id);

    // Check if email is being updated and if it conflicts
    if (updateClinicDto.email && updateClinicDto.email !== clinic.email) {
      const existingClinic = await this.clinicsRepository.findOne({
        where: { email: updateClinicDto.email },
      });

      if (existingClinic) {
        throw new ConflictException('Email already exists');
      }
    }

    // Check if phone is being updated and if it conflicts
    if (updateClinicDto.phone && updateClinicDto.phone !== clinic.phone) {
      const existingClinic = await this.clinicsRepository.findOne({
        where: { phone: updateClinicDto.phone },
      });

      if (existingClinic) {
        throw new ConflictException('Phone number already exists');
      }
    }

    // Validate country if being updated
    if (updateClinicDto.country_id) {
      const country = await this.countriesRepository.findOne({
        where: { id: updateClinicDto.country_id },
      });
      if (!country) {
        throw new NotFoundException(
          `Country with ID ${updateClinicDto.country_id} not found`,
        );
      }
    }

    // Validate city if being updated
    if (updateClinicDto.city_id) {
      const city = await this.citiesRepository.findOne({
        where: { id: updateClinicDto.city_id },
      });
      if (!city) {
        throw new NotFoundException(
          `City with ID ${updateClinicDto.city_id} not found`,
        );
      }
    }

    // Validate package if being updated
    if (updateClinicDto.package_id) {
      const packageEntity = await this.packagesRepository.findOne({
        where: { id: updateClinicDto.package_id },
      });
      if (!packageEntity) {
        throw new NotFoundException(
          `Package with ID ${updateClinicDto.package_id} not found`,
        );
      }
    }

    // Clear deactivate_reason when reactivating clinic
    if (updateClinicDto.is_active === true) {
      updateClinicDto.deactivate_reason = null;
    }

    Object.assign(clinic, updateClinicDto);
    return this.clinicsRepository.save(clinic);
  }

  /**
   * Update clinic IVR settings
   * Uploads audio files to IVR system
   */
  async updateIvr(
    id: number,
    audioFiles: Record<string, Express.Multer.File>,
  ): Promise<{ message: string; uploadedFiles: string[] }> {
    const clinic = await this.findOne(id);

    if (!clinic.extension_number) {
      throw new NotFoundException(
        'Clinic does not have an extension number. Please ensure the clinic has been properly registered with IVR.',
      );
    }

    const uploadedFiles: string[] = [];
    const errors: string[] = [];

    // Upload each provided audio file
    for (const [fileType, file] of Object.entries(audioFiles)) {
      if (file) {
        try {
          await this.ivrApiService.uploadIVRAudio(
            clinic.extension_number,
            fileType,
            file,
          );
          uploadedFiles.push(fileType);
        } catch (error) {
          const errorMessage = `Failed to upload ${fileType}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMessage);
          console.error(errorMessage, error);
        }
      }
    }

    if (uploadedFiles.length === 0 && errors.length > 0) {
      throw new Error(`Failed to upload IVR files: ${errors.join(', ')}`);
    }

    return {
      message: `Successfully uploaded ${uploadedFiles.length} audio file(s)${errors.length > 0 ? `. ${errors.length} file(s) failed to upload.` : ''}`,
      uploadedFiles,
    };
  }

  async remove(id: number): Promise<void> {
    const clinic = await this.findOne(id);
    await this.clinicsRepository.remove(clinic);
  }

  async registerClinic(registerClinicDto: RegisterClinicDto) {
    // Check if clinic with same email or phone already exists
    const existingClinicByEmail = await this.clinicsRepository.findOne({
      where: { email: registerClinicDto.email },
    });

    if (existingClinicByEmail) {
      throw new ConflictException('Email already exists');
    }

    const existingClinicByPhone = await this.clinicsRepository.findOne({
      where: { phone: registerClinicDto.phone },
    });

    if (existingClinicByPhone) {
      throw new ConflictException('Phone number already exists');
    }

    // Validate country if provided
    if (registerClinicDto.country_id) {
      const country = await this.countriesRepository.findOne({
        where: { id: registerClinicDto.country_id },
      });
      if (!country) {
        throw new NotFoundException(
          `Country with ID ${registerClinicDto.country_id} not found`,
        );
      }
    }

    // Validate city if provided
    if (registerClinicDto.city_id) {
      const city = await this.citiesRepository.findOne({
        where: { id: registerClinicDto.city_id },
      });
      if (!city) {
        throw new NotFoundException(
          `City with ID ${registerClinicDto.city_id} not found`,
        );
      }
    }

    // Validate package if provided
    if (registerClinicDto.package_id) {
      const packageEntity = await this.packagesRepository.findOne({
        where: { id: registerClinicDto.package_id },
      });
      if (!packageEntity) {
        throw new NotFoundException(
          `Package with ID ${registerClinicDto.package_id} not found`,
        );
      }
    }

    // Generate extension number
    const extensionNumber = await this.generateExtensionNumber();

    // Create clinic record
    const clinic = this.clinicsRepository.create({
      name_ar: registerClinicDto.name_ar,
      name_en: registerClinicDto.name_en,
      email: registerClinicDto.email,
      phone: registerClinicDto.phone,
      image: registerClinicDto.image,
      lat: registerClinicDto.lat,
      longit: registerClinicDto.longit,
      departments: registerClinicDto.departments,
      is_active: true,
      country_id: registerClinicDto.country_id,
      city_id: registerClinicDto.city_id,
      owner: registerClinicDto.owner,
      address: registerClinicDto.address,
      wa_number: registerClinicDto.wa_number,
      bio: registerClinicDto.bio,
      package_id: registerClinicDto.package_id ?? undefined,
      slot_type: registerClinicDto.slot_type,
      extension_number: extensionNumber,
    });

    const savedClinic = await this.clinicsRepository.save(clinic);

    // Generate database name using clinic ID and sanitize it
    const databaseName = `clinic_${savedClinic.id}`;
    const sanitizedDatabaseName =
      this.databaseService.sanitizeDatabaseName(databaseName);

    try {
      // Create tenant database (this also sanitizes internally, but we use sanitized name for consistency)
      await this.databaseService.createTenantDatabase(sanitizedDatabaseName);

      // Small delay to ensure database is fully created
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Update clinic with database name
      savedClinic.database_name = sanitizedDatabaseName;
      await this.clinicsRepository.save(savedClinic);

      // Run clinic migrations on the new database
      await this.clinicMigrationService.runMigrations(sanitizedDatabaseName);

      // Create clinic user
      await this.createClinicUser(
        savedClinic,
        sanitizedDatabaseName,
        2,
        registerClinicDto.password,
      );

      // Call IVR API to create queue
      try {
        await this.ivrApiService.addIVRQueue(savedClinic.id, extensionNumber);
      } catch (error) {
        // Log error but don't fail clinic creation if IVR fails
        console.error(`Failed to create IVR queue for clinic ${savedClinic.id}:`, error);
      }
    } catch (error) {
      throw new ConflictException(
        `Failed to create tenant database: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }

    return {
      clinic: savedClinic,
    };
  }

  /**
   * Generate a unique extension number
   * Format: 1000 + clinic ID (will be updated after save)
   * Or use a sequential number starting from 1000
   */
  private async generateExtensionNumber(): Promise<string> {
    // Get the highest existing extension number
    const lastClinic = await this.clinicsRepository.findOne({
      where: {},
      order: { id: 'DESC' },
    });

    if (!lastClinic || !lastClinic.extension_number) {
      // Start from 1000 if no extensions exist
      return '1000';
    }

    // Get the next available extension (increment by 1)
    const lastExtension = parseInt(lastClinic.extension_number, 10);
    const nextExtension = (lastExtension + 1).toString();

    // Ensure uniqueness by checking if it exists
    const existing = await this.clinicsRepository.findOne({
      where: { extension_number: nextExtension },
    });

    if (existing) {
      // If exists, find the next available
      let candidate = lastExtension + 1;
      while (true) {
        const candidateStr = candidate.toString();
        const exists = await this.clinicsRepository.findOne({
          where: { extension_number: candidateStr },
        });
        if (!exists) {
          return candidateStr;
        }
        candidate++;
      }
    }

    return nextExtension;
  }

  private async createClinicUser(
    clinic: Clinic,
    databaseName: string,
    roleId: number,
    password: string,
  ): Promise<void> {
    const hashedPassword = await bcrypt.hash(password, 10);
    try {
      // Ensure database name is sanitized
      const sanitizedDbName =
        this.databaseService.sanitizeDatabaseName(databaseName);

      // Get clinic database DataSource with retry logic
      let clinicDataSource =
        await this.tenantDataSourceService.getTenantDataSource(sanitizedDbName);

      // Retry once if DataSource is null (database might need a moment to be fully available)
      if (!clinicDataSource) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        clinicDataSource =
          await this.tenantDataSourceService.getTenantDataSource(
            sanitizedDbName,
          );
      }

      if (!clinicDataSource) {
        throw new Error(
          `Failed to get DataSource for database: ${sanitizedDbName}. ` +
            `Please ensure the database exists and migrations have been run.`,
        );
      }

      // Use raw SQL to insert user (ID will be auto-generated)
      const queryRunner = clinicDataSource.createQueryRunner();
      await queryRunner.connect();

      const result = (await queryRunner.query(
        `INSERT INTO users (name, phone, email, password, role_id, createdAt, updatedAt) 
         VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          clinic.name_ar || clinic.name_en || null,
          clinic.phone,
          clinic.email || null,
          hashedPassword,
          roleId,
        ],
      )) as { insertId: number } | { insertId: number }[];

      const clinicUserId =
        Array.isArray(result) && result[0]
          ? result[0].insertId
          : (result as { insertId: number }).insertId;
      console.log(
        `User created in clinic database: clinic ID ${clinic.id}, clinic user ID ${clinicUserId}`,
      );

      await queryRunner.release();
    } catch (error) {
      console.error(
        `Failed to create user in clinic database ${databaseName}:`,
        error,
      );
      throw error;
    }
  }
}

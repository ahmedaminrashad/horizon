import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Clinic } from './entities/clinic.entity';
import { CreateClinicDto } from './dto/create-clinic.dto';
import { UpdateClinicDto } from './dto/update-clinic.dto';
import { RegisterClinicDto } from './dto/register-clinic.dto';
import { DatabaseService } from '../database/database.service';
import { ClinicMigrationService } from '../database/clinic-migration.service';
import * as bcrypt from 'bcrypt';
import { TenantDataSourceService } from '../database/tenant-data-source.service';

@Injectable()
export class ClinicsService {
  constructor(
    @InjectRepository(Clinic)
    private clinicsRepository: Repository<Clinic>,
    private databaseService: DatabaseService,
    private clinicMigrationService: ClinicMigrationService,
    private tenantDataSourceService: TenantDataSourceService,
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

    const clinic = this.clinicsRepository.create(createClinicDto);
    return this.clinicsRepository.save(clinic);
  }

  async findAll(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [data, total] = await this.clinicsRepository.findAndCount({
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

  async findOne(id: number): Promise<Clinic> {
    const clinic = await this.clinicsRepository.findOne({
      where: { id },
    });

    if (!clinic) {
      throw new NotFoundException(`Clinic with ID ${id} not found`);
    }

    return clinic;
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

    Object.assign(clinic, updateClinicDto);
    return this.clinicsRepository.save(clinic);
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

    // Create clinic record
    const clinic = this.clinicsRepository.create({
      name: registerClinicDto.name,
      email: registerClinicDto.email,
      phone: registerClinicDto.phone,
      image: registerClinicDto.image,
      lat: registerClinicDto.lat,
      longit: registerClinicDto.longit,
      departments: registerClinicDto.departments,
      is_active: true,
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
    } catch (error) {
      throw new ConflictException(
        `Failed to create tenant database: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }

    return {
      clinic: savedClinic,
    };
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
          clinic.name || null,
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

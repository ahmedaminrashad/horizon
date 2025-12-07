import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { TenantRepositoryService } from '../../database/tenant-repository.service';
import { TenantDataSourceService } from '../../database/tenant-data-source.service';
import { UsersService } from '../../users/users.service';
import { RolesService } from '../../roles/roles.service';
import { Doctor } from './entities/doctor.entity';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
import { RegisterDoctorDto } from './dto/register-doctor.dto';
import { User as ClinicUser } from '../permissions/entities/user.entity';
import { Role as ClinicRole } from '../permissions/entities/role.entity';
import { Role } from '../../roles/entities/role.entity';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class DoctorsService {
  constructor(
    @InjectDataSource()
    private defaultDataSource: DataSource,
    private tenantRepositoryService: TenantRepositoryService,
    private tenantDataSourceService: TenantDataSourceService,
    private usersService: UsersService,
    private rolesService: RolesService,
    private jwtService: JwtService,
  ) {}

  private async getRepository(): Promise<Repository<Doctor>> {
    const repository = await this.tenantRepositoryService.getRepository<Doctor>(
      Doctor,
    );

    if (!repository) {
      throw new BadRequestException(
        'Clinic context not found. Please ensure you are accessing this endpoint as a clinic user.',
      );
    }

    return repository;
  }

  async create(clinicId: number, createDoctorDto: CreateDoctorDto): Promise<Doctor> {
    const repository = await this.getRepository();
    createDoctorDto.clinic_id = clinicId;
    const doctor = repository.create(createDoctorDto);
    return repository.save(doctor);
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

  async update(clinicId: number, id: number, updateDoctorDto: UpdateDoctorDto): Promise<Doctor> {
    const repository = await this.getRepository();
    const doctor = await this.findOne(clinicId, id);

    Object.assign(doctor, updateDoctorDto);
    return repository.save(doctor);
  }

  async remove(clinicId: number, id: number): Promise<void> {
    const repository = await this.getRepository();
    const doctor = await this.findOne(clinicId, id);
    await repository.remove(doctor);
  }

  async registerDoctor(
    clinicId: number,
    registerDoctorDto: RegisterDoctorDto,
  ) {
    // Find or create doctor role in main database
    let doctorRole = await this.rolesService.findBySlug('doctor');
    if (!doctorRole) {
      // Create doctor role in main database if it doesn't exist
      // This role is used for the main user record
      const roleRepository = this.defaultDataSource.getRepository(Role);
      doctorRole = roleRepository.create({
        name: 'Doctor',
        slug: 'doctor',
        description: 'Doctor role for healthcare professionals',
      });
      doctorRole = await roleRepository.save(doctorRole);
    }

    // Get clinic user to find clinic database
    const clinicUser = await this.usersService.findOne(clinicId);
    if (!clinicUser || !clinicUser.database_name) {
      throw new NotFoundException(
        'Clinic not found or clinic database not configured',
      );
    }

    // Create user with doctor role and default package_id
    const { age, department, ...userData } = registerDoctorDto;
    const createUserDto = {
      ...userData,
      role_id: doctorRole.id,
      package_id: 0, // Default package for doctors
    };

    const user = await this.usersService.create(createUserDto);

    // Get clinic database DataSource
    const clinicDataSource = await this.tenantDataSourceService.getTenantDataSource(
      clinicUser.database_name,
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

    // Create user in clinic database with clinic doctor role
    // Use raw query to insert with specific ID (same as main DB user)
    const hashedPassword = await bcrypt.hash(registerDoctorDto.password, 10);
    const queryRunner = clinicDataSource.createQueryRunner();
    
    await queryRunner.query(
      `INSERT INTO users (id, name, phone, email, password, package_id, role_id, createdAt, updatedAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        user.id,
        userData.name || null,
        userData.phone,
        userData.email || null,
        hashedPassword,
        0,
        clinicDoctorRole.id,
      ],
    );
    
    await queryRunner.release();

    // Create doctor record in clinic database
    const doctorRepository = clinicDataSource.getRepository(Doctor);
    const doctor = doctorRepository.create({
      age,
      department,
      user_id: user.id,
      clinic_id: clinicId,
    });

    await doctorRepository.save(doctor);

    // Get full user with role info
    const fullUser = await this.usersService.findOne(user.id);

    // Generate token
    const access_token = this.jwtService.sign({
      sub: fullUser.id,
      role_id: fullUser.role_id,
      database_name: fullUser.database_name,
      role_slug: fullUser.role?.slug,
    });

    return {
      fullUser,
      doctor,
      access_token,
    };
  }
}

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
import { Role as ClinicRole } from '../permissions/entities/role.entity';
import { User as ClinicUser } from '../permissions/entities/user.entity';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { DoctorsService as MainDoctorsService } from '../../doctors/doctors.service';
import { BranchesService as MainBranchesService } from '../../branches/branches.service';
import { DoctorServicesService } from '../doctor-services/doctor-services.service';
import { DoctorBranchesService } from '../doctor-branches/doctor-branches.service';

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
    private mainBranchesService: MainBranchesService,
    private doctorServicesService: DoctorServicesService,
    private doctorBranchesService: DoctorBranchesService,
  ) {}

  /**
   * Calculate age in years from date of birth (YYYY-MM-DD string or Date).
   */
  private ageFromDateOfBirth(dob: string | Date | null | undefined): number | null {
    if (dob == null) return null;
    const birth = typeof dob === 'string' ? new Date(dob) : dob;
    if (isNaN(birth.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age >= 0 ? age : null;
  }

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
    const { doctor_branches: doctorBranches, ...doctorData } = createDoctorDto;
    (doctorData as CreateDoctorDto).clinic_id = clinicId;
    const dto = doctorData as CreateDoctorDto;
    if (dto.date_of_birth != null) {
      const computed = this.ageFromDateOfBirth(dto.date_of_birth);
      if (computed != null) (dto as { age?: number }).age = computed;
    }
    if (dto.age == null && (dto as { date_of_birth?: string }).date_of_birth == null) {
      throw new BadRequestException(
        'Either age or date_of_birth is required for the doctor.',
      );
    }
    const doctor = repository.create(dto);
    const savedDoctor = await repository.save(doctor);

    if (doctorBranches?.length) {
      await this.doctorBranchesService.createMany(savedDoctor.id, doctorBranches);
    }

    // Create doctor services if provided
    if (
      createDoctorDto.doctor_services &&
      createDoctorDto.doctor_services.length > 0
    ) {
      await this.doctorServicesService.createMany(
        savedDoctor.id,
        createDoctorDto.doctor_services,
      );
    }

    // Reload with user relation for syncing
    const doctorWithUser = await repository.findOne({
      where: { id: savedDoctor.id },
      relations: ['user', 'slotTemplates', 'doctorBranches', 'doctorServices', 'doctorServices.service', 'doctorFiles'],
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
      relations: ['user', 'slotTemplates', 'doctorBranches', 'doctorServices', 'doctorServices.service'],
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
      relations: ['user', 'slotTemplates', 'doctorBranches', 'doctorServices', 'doctorServices.service', 'doctorFiles'],
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

    const { doctor_branches: doctorBranches, ...rest } = updateDoctorDto;
    Object.assign(doctor, rest);
    if (rest.date_of_birth != null) {
      const computed = this.ageFromDateOfBirth(rest.date_of_birth);
      if (computed != null) (doctor as { age?: number }).age = computed;
    }
    const savedDoctor = await repository.save(doctor);

    if (doctorBranches !== undefined) {
      await this.doctorBranchesService.setBranchesForDoctor(
        savedDoctor.id,
        doctorBranches ?? [],
      );
    }

    const doctorWithUser = await repository.findOne({
      where: { id: savedDoctor.id },
      relations: ['user', 'doctorBranches', 'doctorServices', 'doctorServices.service', 'doctorFiles'],
    });

    if (doctorWithUser) {
      await this.syncToMainDoctors(clinicId, doctorWithUser);
    }

    return doctorWithUser ?? savedDoctor;
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
      date_of_birth,
      gender,
      second_phone,
      department,
      password,
      avatar,
      license_number,
      degree,
      languages,
      bio,
      is_active,
      appointment_types,
      doctor_services: doctorServices,
      doctor_branches: doctorBranches,
      experience_years,
      number_of_patients,
      ...userData
    } = registerDoctorDto;

    const resolvedAge =
      date_of_birth != null
        ? this.ageFromDateOfBirth(date_of_birth)
        : age;
    const finalAge = resolvedAge ?? age ?? null;
    if (finalAge == null) {
      throw new BadRequestException(
        'Either age or date_of_birth is required for the doctor.',
      );
    }

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
      age: finalAge,
      date_of_birth: date_of_birth ?? null,
      gender: gender ?? null,
      second_phone: second_phone ?? null,
      department,
      user_id: savedClinicUser.id,
      clinic_id: clinicId,
      avatar,
      experience_years,
      number_of_patients: number_of_patients || 0,
      license_number,
      degree,
      languages,
      bio,
      appointment_types: appointment_types ?? undefined,
      is_active: is_active !== undefined ? is_active : true,
    });

    const savedDoctor = await doctorRepository.save(doctor);

    if (doctorBranches?.length) {
      await this.doctorBranchesService.createMany(savedDoctor.id, doctorBranches);
    }

    // Create doctor services if provided
    if (doctorServices && doctorServices.length > 0) {
      await this.doctorServicesService.createMany(
        savedDoctor.id,
        doctorServices,
      );
    }

    // Reload with user and slotTemplates relations for syncing
    const doctorWithUser = await doctorRepository.findOne({
      where: { id: savedDoctor.id },
      relations: ['user', 'user.role', 'slotTemplates', 'doctorBranches', 'doctorServices', 'doctorServices.service', 'doctorFiles'],
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

    // Resolve first clinic branch to main branch id for sync
    let mainBranchId: number | undefined;
    if (doctorBranches?.[0]) {
      const mainBranch = await this.mainBranchesService.findByClinicBranchId(
        clinicId,
        doctorBranches[0],
      );
      mainBranchId = mainBranch?.id ?? undefined;
    }
    await this.mainDoctorsService.syncDoctor(clinicId, savedDoctor.id, {
      name: clinicUserWithRole.name || '',
      age: savedDoctor.age ?? undefined,
      avatar: savedDoctor.avatar,
      email: clinicUserWithRole.email ?? undefined,
      phone: clinicUserWithRole.phone || undefined,
      department: savedDoctor.department,
      license_number: savedDoctor.license_number,
      degree: savedDoctor.degree,
      languages: savedDoctor.languages,
      bio: savedDoctor.bio,
      appoint_type:
        Array.isArray(savedDoctor.appointment_types) &&
        savedDoctor.appointment_types.length > 0
          ? savedDoctor.appointment_types[0]
          : undefined,
      is_active: savedDoctor.is_active,
      branch_id: mainBranchId,
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

      // Resolve first doctor branch to main branch id (main doctors.branch_id references main branches.id)
      let mainBranchId: number | undefined;
      const repo = await this.getRepository();
      const doctorWithBranches = await repo.findOne({
        where: { id: clinicDoctor.id },
        relations: ['doctorBranches'],
      });
      const firstBranchId = doctorWithBranches?.doctorBranches?.[0]?.branch_id;
      if (firstBranchId) {
        const mainBranch = await this.mainBranchesService.findByClinicBranchId(
          clinicId,
          firstBranchId,
        );
        mainBranchId = mainBranch?.id ?? undefined;
      }

      // Sync to main doctors table
      await this.mainDoctorsService.syncDoctor(clinicId, clinicDoctor.id, {
        name: doctorName,
        age: clinicDoctor.age ?? undefined,
        avatar: clinicDoctor.avatar,
        email: doctorEmail,
        phone: doctorPhone,
        department: clinicDoctor.department,
        license_number: clinicDoctor.license_number,
        degree: clinicDoctor.degree,
        languages: clinicDoctor.languages,
        bio: clinicDoctor.bio,
        appoint_type:
          Array.isArray(clinicDoctor.appointment_types) &&
          clinicDoctor.appointment_types.length > 0
            ? clinicDoctor.appointment_types[0]
            : undefined,
        is_active: clinicDoctor.is_active,
        branch_id: mainBranchId,
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
}

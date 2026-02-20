import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { QueryFailedError } from 'typeorm';
import { TenantRepositoryService } from '../../database/tenant-repository.service';
import { User } from '../permissions/entities/user.entity';
import { Role } from '../permissions/entities/role.entity';
import { CreateClinicUserDto } from './dto/create-clinic-user.dto';
import { UpdateClinicUserDto } from './dto/update-clinic-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class ClinicUsersService {
  constructor(
    private tenantRepositoryService: TenantRepositoryService,
  ) {}

  /**
   * Get repository for the current tenant context
   */
  private async getRepository(): Promise<Repository<User>> {
    const repository = await this.tenantRepositoryService.getRepository<User>(
      User,
    );

    if (!repository) {
      throw new BadRequestException(
        'Clinic context not found. Please ensure you are accessing this endpoint as a clinic user.',
      );
    }

    return repository;
  }

  async create(clinicId: number, createClinicUserDto: CreateClinicUserDto): Promise<Omit<User, 'password'>> {
    const repository = await this.getRepository();

    // Normalize: trim leading/trailing spaces so validation and persistence use consistent values
    if (typeof createClinicUserDto.name === 'string') {
      createClinicUserDto.name = createClinicUserDto.name.trim();
    }
    if (typeof createClinicUserDto.phone === 'string') {
      createClinicUserDto.phone = createClinicUserDto.phone.trim();
    }
    if (typeof createClinicUserDto.email === 'string') {
      createClinicUserDto.email = createClinicUserDto.email.trim();
    }

    if (!createClinicUserDto.name) {
      throw new BadRequestException('name is required');
    }
    if (createClinicUserDto.name.length < 3) {
      throw new BadRequestException('name must be at least 3 characters');
    }
    if (createClinicUserDto.name.length > 255) {
      throw new BadRequestException('name must be at most 255 characters');
    }
    if (!createClinicUserDto.phone) {
      throw new BadRequestException('phone is required');
    }
    if (!createClinicUserDto.phone.startsWith('+')) {
      throw new BadRequestException(
        'phone must start with + (country code, e.g. +1234567890)',
      );
    }
    if (createClinicUserDto.phone.length < 10) {
      throw new BadRequestException(
        'phone must be at least 10 characters (include country code)',
      );
    }
    if (createClinicUserDto.phone.length > 30) {
      throw new BadRequestException('phone must be at most 30 characters');
    }
    if (!createClinicUserDto.email) {
      throw new BadRequestException('email is required');
    }
    if (createClinicUserDto.role_id == null) {
      throw new BadRequestException('role_id is required');
    }
    if (
      createClinicUserDto.password.length < 8 ||
      createClinicUserDto.password.length > 128
    ) {
      throw new BadRequestException(
        'password must be 8–128 characters and include uppercase, lowercase, number, and special character',
      );
    }

    const roleRepository =
      await this.tenantRepositoryService.getRepository<Role>(Role);
    if (!roleRepository) {
      throw new BadRequestException(
        'Invalid role_id: the specified role does not exist or is not supported',
      );
    }
    const roleExists = await roleRepository.findOne({
      where: { id: createClinicUserDto.role_id },
    });
    if (!roleExists) {
      throw new BadRequestException(
        `Invalid role_id: role with id ${createClinicUserDto.role_id} does not exist`,
      );
    }

    // Check if phone already exists
    const existingUserByPhone = await repository.findOne({
      where: { phone: createClinicUserDto.phone },
    });

    if (existingUserByPhone) {
      throw new ConflictException('User with this phone number already exists');
    }

    // Check if email already exists (if provided)
    if (createClinicUserDto.email) {
      const existingUserByEmail = await repository.findOne({
        where: { email: createClinicUserDto.email },
      });

      if (existingUserByEmail) {
        throw new ConflictException('User with this email already exists');
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(createClinicUserDto.password, 10);

    // Create user
    const user = repository.create({
      ...createClinicUserDto,
      password: hashedPassword,
      package_id: 0, // Clinic users don't have packages
    });

    const savedUser = await repository.save(user);
    
    // Remove password from response
    const { password, ...userWithoutPassword } = savedUser;
    return userWithoutPassword;
  }

  async findAll(
    clinicId: number,
    page: number = 1,
    limit: number = 10,
    options?: { search?: string; role_id?: number },
  ) {
    const repository = await this.getRepository();
    const skip = (page - 1) * limit;

    const qb = repository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .orderBy('user.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (options?.search?.trim()) {
      const term = `%${options.search.trim()}%`;
      qb.andWhere(
        '(user.name ILIKE :term OR user.phone ILIKE :term OR user.email ILIKE :term)',
        { term },
      );
    }
    if (options?.role_id != null) {
      qb.andWhere('user.role_id = :roleId', { roleId: options.role_id });
    }

    const [data, total] = await qb.getManyAndCount();

    // Remove password from response
    const usersWithoutPassword = data.map((user) => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });

    const totalPages = Math.ceil(total / limit);

    return {
      data: usersWithoutPassword,
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

  async findOne(clinicId: number, id: number): Promise<Omit<User, 'password'>> {
    const repository = await this.getRepository();
    const user = await repository.findOne({
      where: { id },
      relations: ['role'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Remove password from response
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async update(clinicId: number, id: number, updateClinicUserDto: UpdateClinicUserDto): Promise<Omit<User, 'password'>> {
    const repository = await this.getRepository();
    const existingUser = await repository.findOne({
      where: { id },
      relations: ['role'],
    });

    if (!existingUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    if (updateClinicUserDto.name !== undefined) {
      const name = typeof updateClinicUserDto.name === 'string' ? updateClinicUserDto.name.trim() : '';
      if (name.length < 3) {
        throw new BadRequestException('name must be at least 3 characters');
      }
      if (name.length > 255) {
        throw new BadRequestException('name must be at most 255 characters');
      }
      if (!/^[a-zA-Z\s'-]+$/.test(name)) {
        throw new BadRequestException(
          'name must contain only letters, spaces, hyphen and apostrophe',
        );
      }
      updateClinicUserDto.name = name;
    }
    if (updateClinicUserDto.phone !== undefined) {
      const phone = typeof updateClinicUserDto.phone === 'string' ? updateClinicUserDto.phone.trim() : '';
      if (phone.length < 10 || phone.length > 30) {
        throw new BadRequestException(
          'phone must be 10–30 characters and start with + (country code)',
        );
      }
      if (!phone.startsWith('+') || !/^\+[\d\s\-()]+$/.test(phone)) {
        throw new BadRequestException(
          'phone must start with + and contain only digits, spaces, hyphens, parentheses',
        );
      }
      updateClinicUserDto.phone = phone;
    }
    if (typeof updateClinicUserDto.email === 'string') {
      updateClinicUserDto.email = updateClinicUserDto.email.trim();
    }

    // Check if phone is being updated and already exists
    if (updateClinicUserDto.phone && updateClinicUserDto.phone !== existingUser.phone) {
      const existingUserByPhone = await repository.findOne({
        where: { phone: updateClinicUserDto.phone },
      });

      if (existingUserByPhone) {
        throw new ConflictException('User with this phone number already exists');
      }
    }

    // Check if email is being updated and already exists
    if (updateClinicUserDto.email && updateClinicUserDto.email !== existingUser.email) {
      const existingUserByEmail = await repository.findOne({
        where: { email: updateClinicUserDto.email },
      });

      if (existingUserByEmail) {
        throw new ConflictException('User with this email already exists');
      }
    }

    // Hash password if being updated
    if (updateClinicUserDto.password) {
      updateClinicUserDto.password = await bcrypt.hash(updateClinicUserDto.password, 10) as any;
    }

    Object.assign(existingUser, updateClinicUserDto);
    try {
      const updatedUser = await repository.save(existingUser);
      const { password, ...userWithoutPassword } = updatedUser;
      return userWithoutPassword;
    } catch (err) {
      if (err instanceof QueryFailedError) {
        const msg = err.message ?? '';
        if (
          /data too long|value too long|ER_DATA_TOO_LONG|column.*too long/i.test(
            msg,
          )
        ) {
          throw new BadRequestException(
            'One or more fields exceed the maximum allowed length',
          );
        }
        if (
          /foreign key|ER_NO_REFERENCED_ROW|referential integrity/i.test(msg)
        ) {
          throw new BadRequestException(
            'Invalid role_id: the specified role does not exist',
          );
        }
      }
      throw err;
    }
  }

  async remove(clinicId: number, id: number): Promise<void> {
    const repository = await this.getRepository();
    const user = await repository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    await repository.remove(user);
  }
}

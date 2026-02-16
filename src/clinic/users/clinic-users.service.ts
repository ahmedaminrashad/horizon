import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { TenantRepositoryService } from '../../database/tenant-repository.service';
import { User } from '../permissions/entities/user.entity';
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
    const updatedUser = await repository.save(existingUser);

    // Remove password from response
    const { password, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
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

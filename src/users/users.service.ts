import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { DatabaseService } from '../database/database.service';
import { RolesService } from '../roles/roles.service';
import { ClinicMigrationService } from '../database/clinic-migration.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private databaseService: DatabaseService,
    private rolesService: RolesService,
    private clinicMigrationService: ClinicMigrationService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    // Check if phone already exists
    const existingUserByPhone = await this.usersRepository.findOne({
      where: { phone: createUserDto.phone },
    });

    if (existingUserByPhone) {
      throw new ConflictException('Phone number already exists');
    }

    // Check if email already exists (if provided)
    if (createUserDto.email) {
      const existingUserByEmail = await this.usersRepository.findOne({
        where: { email: createUserDto.email },
      });

      if (existingUserByEmail) {
        throw new ConflictException('Email already exists');
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    // Create user first to get the ID
    const user = this.usersRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });

    const savedUser = await this.usersRepository.save(user);

    // If user has clinic role, create a database for them and run migrations
    if (savedUser.role_id) {
      const role = await this.rolesService.findOne(savedUser.role_id);
      if (role && role.slug === 'clinic') {
        // Generate database name using name, email, or phone (in that order)
        const databaseName = this.databaseService.generateDatabaseName(
          savedUser.id,
          savedUser.name,
          savedUser.email,
          savedUser.phone,
        );

        try {
          // Create tenant database
          await this.databaseService.createTenantDatabase(databaseName);

          // Run clinic migrations on the new database
          await this.clinicMigrationService.runMigrations(databaseName);

          // Update user with database name
          savedUser.database_name = databaseName;
          await this.usersRepository.save(savedUser);
        } catch (error) {
          // If database creation or migration fails, log error but don't fail user creation
          console.error(
            'Failed to create tenant database or run migrations:',
            error,
          );
          throw error; // Re-throw to prevent incomplete setup
        }
      }
    }

    return savedUser;
  }

  async findAll(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [data, total] = await this.usersRepository.findAndCount({
      select: [
        'id',
        'name',
        'phone',
        'email',
        'package_id',
        'role_id',
        'database_name',
        'createdAt',
        'updatedAt',
      ],
      relations: ['role', 'role.permissions'],
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

  async findOne(id: number): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['role', 'role.permissions'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Remove password from response
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword as User;
  }

  async findByPhone(phone: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { phone } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    // If password is being updated, hash it
    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    // Check for phone conflicts
    if (updateUserDto.phone && updateUserDto.phone !== user.phone) {
      const existingUser = await this.findByPhone(updateUserDto.phone);
      if (existingUser) {
        throw new ConflictException('Phone number already exists');
      }
    }

    // Check for email conflicts
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.findByEmail(updateUserDto.email);
      if (existingUser) {
        throw new ConflictException('Email already exists');
      }
    }

    Object.assign(user, updateUserDto);
    return this.usersRepository.save(user);
  }

  async remove(id: number): Promise<void> {
    const user = await this.findOne(id);
    await this.usersRepository.remove(user);
  }

  async verifyPhone(phone: string): Promise<{ exists: boolean }> {
    const user = await this.findByPhone(phone);
    return {
      exists: !!user,
    };
  }
}

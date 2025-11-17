import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RolesService } from '../roles/roles.service';
import { RegisterDto } from './dto/register.dto';
import { RegisterPatientDto } from './dto/register-patient.dto';
import { LoginDto } from './dto/login.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private rolesService: RolesService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto) {
    const user = await this.usersService.create(registerDto);

    // Get full user with role info
    const fullUser = await this.usersService.findOne(user.id);

    // Remove password from response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = fullUser;

    return {
      ...result,
      access_token: this.generateToken(fullUser),
    };
  }

  async registerPatient(registerPatientDto: RegisterPatientDto) {
    // Find patient role
    const patientRole = await this.rolesService.findBySlug('patient');
    if (!patientRole) {
      throw new NotFoundException(
        'Patient role not found. Please run migrations first.',
      );
    }

    // Create user with patient role and default package_id
    const createUserDto = {
      ...registerPatientDto,
      role_id: patientRole.id,
      package_id: 0, // Default package for patients
    };

    const user = await this.usersService.create(createUserDto);

    // Get full user with role info
    const fullUser = await this.usersService.findOne(user.id);

    return {
      fullUser,
      access_token: this.generateToken(fullUser),
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByPhone(loginDto.phone);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Get full user with role info
    const fullUser = await this.usersService.findOne(user.id);

    // Remove password from response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _password, ...result } = fullUser;

    return {
      ...result,
      access_token: this.generateToken(fullUser),
    };
  }

  private generateToken(user: User): string {
    const payload = {
      sub: user.id,
      role_id: user.role_id,
      database_name: user.database_name,
      role_slug: user.role?.slug,
    };
    return this.jwtService.sign(payload);
  }
}

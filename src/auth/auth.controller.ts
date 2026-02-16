import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { ClinicAuthService } from '../clinic/auth/clinic-auth.service';
import { RegisterDto } from './dto/register.dto';
import { RegisterPatientDto } from './dto/register-patient.dto';
import { LoginDto } from './dto/login.dto';
import { DoctorLoginDto } from '../clinic/auth/dto/doctor-login.dto';
import { ClinicLoginDto } from '../clinic/auth/dto/clinic-login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly clinicAuthService: ClinicAuthService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        name: { type: 'string', nullable: true },
        phone: { type: 'string' },
        email: { type: 'string', nullable: true },
        package_id: { type: 'number' },
        role_id: { type: 'number', nullable: true },
        database_name: { type: 'string', nullable: true },
        access_token: { type: 'string' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 409, description: 'Phone or email already exists' })
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('register/patient')
  @ApiOperation({ summary: 'Register a new patient' })
  @ApiResponse({
    status: 201,
    description: 'Patient registered successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        name: { type: 'string', nullable: true },
        phone: { type: 'string' },
        email: { type: 'string', nullable: true },
        package_id: { type: 'number' },
        role_id: { type: 'number', nullable: true },
        database_name: { type: 'string', nullable: true },
        access_token: { type: 'string' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 409, description: 'Phone or email already exists' })
  @ApiResponse({ status: 404, description: 'Patient role not found' })
  registerPatient(@Body() registerPatientDto: RegisterPatientDto) {
    return this.authService.registerPatient(registerPatientDto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        name: { type: 'string', nullable: true },
        phone: { type: 'string' },
        email: { type: 'string', nullable: true },
        package_id: { type: 'number' },
        access_token: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('clinic-login')
  @ApiOperation({
    summary: 'Clinic login',
    description:
      'Login with phone + password. Clinic is resolved from clinics table by phone. No clinic_id in path.',
  })
  @ApiResponse({
    status: 200,
    description: 'Clinic login successful',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        name: { type: 'string', nullable: true },
        phone: { type: 'string' },
        email: { type: 'string', nullable: true },
        role_id: { type: 'number', nullable: true },
        role: { type: 'object', nullable: true },
        access_token: { type: 'string' },
        dashboard: {
          type: 'object',
          properties: {
            total_appointments_last_7_days: { type: 'number' },
            total_revenue_last_7_days: { type: 'number' },
            doctor_workload_today: { type: 'number' },
            cancellations_last_7_days: { type: 'number' },
          },
        },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 404, description: 'Clinic not found' })
  clinicLogin(@Body() dto: ClinicLoginDto) {
    return this.clinicAuthService.loginByPhone(dto);
  }

  @Post('doctor-login')
  @ApiOperation({
    summary: 'Doctor login',
    description:
      'Login with user_name (email or phone) + password. Resolves clinic from doctors table and returns clinic JWT + dashboard.',
  })
  @ApiResponse({
    status: 200,
    description: 'Doctor login successful (same shape as clinic login)',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        name: { type: 'string', nullable: true },
        phone: { type: 'string' },
        email: { type: 'string', nullable: true },
        role_id: { type: 'number', nullable: true },
        role: { type: 'object', nullable: true },
        access_token: { type: 'string' },
        dashboard: {
          type: 'object',
          properties: {
            total_appointments_last_7_days: { type: 'number' },
            total_revenue_last_7_days: { type: 'number' },
            doctor_workload_today: { type: 'number' },
            cancellations_last_7_days: { type: 'number' },
          },
        },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'user_name is required' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 404, description: 'Clinic not found' })
  doctorLogin(@Body() dto: DoctorLoginDto) {
    return this.clinicAuthService.doctorLogin(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current authenticated user' })
  @ApiResponse({
    status: 200,
    description: 'Current user information with role and permissions',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        name: { type: 'string', nullable: true },
        phone: { type: 'string' },
        email: { type: 'string', nullable: true },
        package_id: { type: 'number' },
        role_id: { type: 'number', nullable: true },
        database_name: { type: 'string', nullable: true },
        role: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            name: { type: 'string' },
            slug: { type: 'string' },
            description: { type: 'string', nullable: true },
            permissions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  name: { type: 'string' },
                  slug: { type: 'string' },
                  description: { type: 'string', nullable: true },
                },
              },
            },
          },
        },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMe(@Request() req) {
    const user = await this.authService.getCurrentUser(req.user.userId);
    return user;
  }
}

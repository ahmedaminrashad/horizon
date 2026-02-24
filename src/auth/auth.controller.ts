import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { ClinicAuthService } from '../clinic/auth/clinic-auth.service';
import { RegisterDto } from './dto/register.dto';
import { RegisterPatientDto } from './dto/register-patient.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AdminResetPasswordDto } from './dto/admin-reset-password.dto';
import { DoctorLoginDto } from '../clinic/auth/dto/doctor-login.dto';
import { ClinicLoginDto } from '../clinic/auth/dto/clinic-login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';

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

  @Post('forgot-password')
  @ApiOperation({
    summary: 'Forgot password (main users)',
    description:
      'Request a password reset by phone. Returns a reset token (for development); in production send it by SMS/email.',
  })
  @ApiResponse({
    status: 200,
    description: 'If account exists, reset instructions or token returned',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        reset_token: { type: 'string', description: 'Present in dev only' },
      },
    },
  })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @ApiOperation({
    summary: 'Reset password (main users)',
    description: 'Reset password using the token from forgot-password. No auth required.',
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully',
    schema: { type: 'object', properties: { message: { type: 'string' } } },
  })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  @ApiResponse({ status: 404, description: 'User not found' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('admin-reset-password')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Admin reset password (main users, no token)',
    description: 'Reset a main user password by user_id. No reset token required. Requires admin role.',
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully',
    schema: { type: 'object', properties: { message: { type: 'string' } } },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  adminResetPassword(@Body() dto: AdminResetPasswordDto) {
    return this.authService.adminResetPassword(dto.user_id, dto.new_password);
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

import {
  Controller,
  Post,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ClinicAuthService } from './clinic-auth.service';
import { ClinicLoginDto } from './dto/clinic-login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AdminResetPasswordDto } from './dto/admin-reset-password.dto';
import { ClinicTenantGuard } from '../guards/clinic-tenant.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ClinicPermissionsGuard } from '../guards/clinic-permissions.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { ClinicPermission } from '../permissions/enums/clinic-permission.enum';
import { ClinicId } from '../decorators/clinic-id.decorator';

@ApiTags('clinic/auth')
@Controller('clinic/:clinicId/auth')
@UseGuards(ClinicTenantGuard)
export class ClinicAuthController {
  constructor(private readonly clinicAuthService: ClinicAuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Login clinic user' })
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
        package_id: { type: 'number' },
        role_id: { type: 'number', nullable: true },
        role: {
          type: 'object',
          nullable: true,
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
        access_token: { type: 'string' },
        dashboard: {
          type: 'object',
          description: 'Stats after login',
          properties: {
            total_appointments_last_7_days: {
              type: 'number',
              description: 'Total appointments (non-cancelled) in last 7 days',
            },
            total_revenue_last_7_days: {
              type: 'number',
              description: 'Total revenue (sum of fees) in last 7 days',
            },
            doctor_workload_today: {
              type: 'number',
              description: 'Appointments (non-cancelled) today',
            },
            cancellations_last_7_days: {
              type: 'number',
              description: 'Cancelled appointments in last 7 days',
            },
          },
        },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 404, description: 'Clinic not found' })
  login(
    @Param('clinicId') clinicId: string,
    @Body() clinicLoginDto: ClinicLoginDto,
  ) {
    return this.clinicAuthService.login(+clinicId, clinicLoginDto);
  }

  @Post('forgot-password')
  @ApiOperation({
    summary: 'Forgot password',
    description:
      'Request a password reset for a clinic user by email. Returns a reset token (for development); in production send it by email.',
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
  @ApiResponse({ status: 404, description: 'Clinic not found' })
  forgotPassword(
    @Param('clinicId', ParseIntPipe) clinicId: number,
    @Body() dto: ForgotPasswordDto,
  ) {
    return this.clinicAuthService.forgotPassword(clinicId, dto);
  }

  @Post('reset-password')
  @UseGuards(JwtAuthGuard, ClinicPermissionsGuard)
  @Permissions(ClinicPermission.CAN_RESET_PASSWORD as string)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Reset password',
    description:
      'Reset user password using the token from forgot-password. Requires permission can-reset-password.',
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully',
    schema: {
      type: 'object',
      properties: { message: { type: 'string' } },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  @ApiResponse({ status: 403, description: 'Forbidden - missing can-reset-password' })
  @ApiResponse({ status: 404, description: 'Clinic or user not found' })
  resetPassword(
    @ClinicId() clinicId: number,
    @Body() dto: ResetPasswordDto,
  ) {
    if (!clinicId) {
      throw new Error('Clinic ID is required');
    }
    return this.clinicAuthService.resetPassword(clinicId, dto);
  }

  @Post('admin-reset-password')
  @UseGuards(JwtAuthGuard, ClinicPermissionsGuard)
  @Permissions(ClinicPermission.CAN_RESET_PASSWORD as string)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Admin reset password (no token)',
    description:
      'Reset a clinic user password by user_id. No reset token required. Requires permission can-reset-password.',
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully',
    schema: { type: 'object', properties: { message: { type: 'string' } } },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - missing can-reset-password' })
  @ApiResponse({ status: 404, description: 'Clinic or user not found' })
  adminResetPassword(
    @ClinicId() clinicId: number,
    @Body() dto: AdminResetPasswordDto,
  ) {
    if (!clinicId) {
      throw new Error('Clinic ID is required');
    }
    return this.clinicAuthService.adminResetPassword(
      clinicId,
      dto.user_id,
      dto.new_password,
    );
  }
}

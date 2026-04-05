import { Controller, Post, Body } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { ClinicAuthService } from './clinic-auth.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

/**
 * Doctor password reset without `clinicId` in the path.
 * Resolves clinic + tenant doctor from main DB `doctors` (email → clinic_id, clinic_doctor_id).
 */
@ApiTags('clinic/doctor-auth')
@Controller('clinic/doctor')
export class ClinicDoctorAuthController {
  constructor(private readonly clinicAuthService: ClinicAuthService) {}

  @Post('forgot-password')
  @ApiOperation({
    summary: 'Doctor forgot password (no clinic id in URL)',
    description:
      'Looks up the main `doctors` row by email to obtain `clinic_id` and `clinic_doctor_id`, then the clinic tenant `doctors.user_id` → `users` for the reset email. Sends via Mailgun when configured. Response is only a generic message.',
  })
  @ApiResponse({
    status: 200,
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    },
  })
  doctorForgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.clinicAuthService.doctorForgotPassword(dto);
  }

  @Post('reset-password')
  @ApiOperation({
    summary: 'Doctor reset password (token only)',
    description:
      'Completes reset using the JWT from forgot-password. Clinic id comes from the token payload, not the URL.',
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully',
    schema: { type: 'object', properties: { message: { type: 'string' } } },
  })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  @ApiResponse({ status: 404, description: 'Clinic or user not found' })
  doctorResetPassword(@Body() dto: ResetPasswordDto) {
    return this.clinicAuthService.resetPassword(dto);
  }
}

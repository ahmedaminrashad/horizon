import { Controller, Post, Body, Param, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { ClinicAuthService } from './clinic-auth.service';
import { ClinicLoginDto } from './dto/clinic-login.dto';
import { ClinicTenantGuard } from '../guards/clinic-tenant.guard';

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
}

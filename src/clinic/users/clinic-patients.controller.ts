import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ClinicsService } from '../../clinics/clinics.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ClinicTenantGuard } from '../guards/clinic-tenant.guard';
import { ClinicPermissionsGuard } from '../guards/clinic-permissions.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { ClinicPermission } from '../permissions/enums/clinic-permission.enum';
import { ClinicId } from '../decorators/clinic-id.decorator';

@ApiTags('clinic/patients')
@Controller('clinic/:clinicId/patients')
@UseGuards(ClinicTenantGuard, JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ClinicPatientsController {
  constructor(private readonly clinicsService: ClinicsService) {}

  @Get()
  @UseGuards(ClinicPermissionsGuard)
  @Permissions(ClinicPermission.READ_USER as string)
  @ApiOperation({
    summary: 'Get main users (patients) linked to clinic via clinic_user',
  })
  @ApiParam({ name: 'clinicId', type: Number, example: 1 })
  @ApiResponse({
    status: 200,
    description: 'List of main users linked to this clinic',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'number' },
          user_id: { type: 'number' },
          clinic_id: { type: 'number' },
          createdAt: { type: 'string', format: 'date-time' },
          user: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              name: { type: 'string', nullable: true },
              phone: { type: 'string' },
              email: { type: 'string', nullable: true },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Clinic not found' })
  getPatients(@ClinicId() clinicId: number) {
    if (!clinicId) {
      throw new Error('Clinic ID is required');
    }
    return this.clinicsService.getClinicPatients(clinicId);
  }
}

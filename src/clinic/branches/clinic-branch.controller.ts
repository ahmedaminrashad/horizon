import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { BranchesService } from './branches.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ClinicTenantGuard } from '../guards/clinic-tenant.guard';
import { ClinicPermissionsGuard } from '../guards/clinic-permissions.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { ClinicPermission } from '../permissions/enums/clinic-permission.enum';
import { ClinicId } from '../decorators/clinic-id.decorator';

/**
 * Controller for /clinic/branch/:id - clinic is taken from auth token (no clinicId in path).
 */
@ApiTags('clinic/branch')
@Controller('clinic')
@UseGuards(ClinicTenantGuard, JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ClinicBranchController {
  constructor(private readonly branchesService: BranchesService) {}

  @Get('branch/:id')
  @UseGuards(ClinicPermissionsGuard)
  @Permissions(ClinicPermission.READ_BRANCH as string)
  @ApiOperation({
    summary: 'Get branch by ID with dashboard stats (clinic from auth token)',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Branch ID' })
  @ApiResponse({
    status: 200,
    description: 'Branch with dashboard stats for this branch',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        name: { type: 'string' },
        clinic_id: { type: 'number' },
        lat: { type: 'number', nullable: true },
        longit: { type: 'number', nullable: true },
        address: { type: 'string', nullable: true },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
        dashboard: {
          type: 'object',
          properties: {
            total_appointments_last_7_days: { type: 'number' },
            total_revenue_last_7_days: { type: 'number' },
            doctor_workload_today: { type: 'number' },
            cancellations_last_7_days: { type: 'number' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Branch not found' })
  getBranchWithDashboard(
    @ClinicId() clinicId: number,
    @Param('id') id: string,
  ) {
    if (!clinicId) {
      throw new Error('Clinic context required (auth token)');
    }
    return this.branchesService.getOneWithDashboard(clinicId, +id);
  }
}

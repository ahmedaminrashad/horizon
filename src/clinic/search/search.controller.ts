import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { SearchService, GlobalSearchResult } from './search.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ClinicTenantGuard } from '../guards/clinic-tenant.guard';
import { ClinicPermissionsGuard } from '../guards/clinic-permissions.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { ClinicPermission } from '../permissions/enums/clinic-permission.enum';
import { ClinicId } from '../decorators/clinic-id.decorator';

@ApiTags('clinic/search')
@Controller('clinic/:clinicId/search')
@UseGuards(ClinicTenantGuard, JwtAuthGuard, ClinicPermissionsGuard)
@ApiBearerAuth('JWT-auth')
@Permissions(ClinicPermission.READ_USER as string) // broad read for dashboard
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({
    summary: 'Global smart search',
    description:
      'Search across doctors, patients, reservations, and users in one request. Returns up to `limit` results per type.',
  })
  @ApiParam({ name: 'clinicId', type: Number, example: 1 })
  @ApiQuery({
    name: 'q',
    required: true,
    type: String,
    description: 'Search term (name, phone, email, etc.)',
    example: 'ahmed',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Max results per category (default 5, max 20)',
    example: 5,
  })
  @ApiResponse({
    status: 200,
    description: 'Aggregated search results',
    schema: {
      type: 'object',
      properties: {
        doctors: { type: 'array', items: { type: 'object' } },
        patients: { type: 'array', items: { type: 'object' } },
        reservations: { type: 'array', items: { type: 'object' } },
        users: { type: 'array', items: { type: 'object' } },
      },
    },
  })
  async search(
    @ClinicId() clinicId: number,
    @Query('q') q: string,
    @Query('limit') limit?: string,
  ): Promise<GlobalSearchResult> {
    if (!clinicId) {
      throw new Error('Clinic ID is required');
    }
    const limitNum = limit != null ? parseInt(limit, 10) : 5;
    return this.searchService.globalSearch(
      clinicId,
      q ?? '',
      Number.isFinite(limitNum) ? limitNum : 5,
    );
  }
}

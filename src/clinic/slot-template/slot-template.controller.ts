import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { SlotTemplateService } from './slot-template.service';
import { CreateSlotTemplateDto } from './dto/create-slot-template.dto';
import { UpdateSlotTemplateDto } from './dto/update-slot-template.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ClinicTenantGuard } from '../guards/clinic-tenant.guard';
import { ClinicPermissionsGuard } from '../guards/clinic-permissions.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { ClinicPermission } from '../permissions/enums/clinic-permission.enum';
import { ClinicId } from '../decorators/clinic-id.decorator';

@ApiTags('clinic/slot-template')
@Controller('clinic/:clinicId/slot-template')
@UseGuards(ClinicTenantGuard, JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class SlotTemplateController {
  constructor(private readonly slotTemplateService: SlotTemplateService) {}

  @Post()
  @UseGuards(ClinicPermissionsGuard)
  @Permissions(ClinicPermission.CREATE_DOCTOR as string)
  @ApiOperation({ summary: 'Create a new slot template' })
  @ApiResponse({ status: 201, description: 'Slot template created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input or clinic context not found' })
  create(
    @ClinicId() clinicId: number,
    @Body() createSlotTemplateDto: CreateSlotTemplateDto,
  ) {
    if (!clinicId) {
      throw new Error('Clinic ID is required');
    }
    return this.slotTemplateService.create(clinicId, createSlotTemplateDto);
  }

  @Get()
  @UseGuards(ClinicPermissionsGuard)
  @Permissions(ClinicPermission.READ_DOCTOR)
  @ApiOperation({ summary: 'Get all slot templates with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'doctor_id', required: false, type: Number, example: 1, description: 'Filter by doctor ID' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of slot templates',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              duration: { type: 'string', example: '00:30:00' },
              cost: { type: 'number', example: 100.5 },
              days: { type: 'string', example: 'MONDAY,TUESDAY,WEDNESDAY' },
              doctor_id: { type: 'number', example: 1 },
              doctor: {
                type: 'object',
                nullable: true,
                properties: {
                  id: { type: 'number' },
                  age: { type: 'number' },
                  department: { type: 'string' },
                },
              },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        meta: {
          type: 'object',
          properties: {
            total: { type: 'number', example: 100 },
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 10 },
            totalPages: { type: 'number', example: 10 },
            hasNextPage: { type: 'boolean', example: true },
            hasPreviousPage: { type: 'boolean', example: false },
          },
        },
      },
    },
  })
  findAll(
    @ClinicId() clinicId: number,
    @Query() paginationQuery: PaginationQueryDto,
  ) {
    if (!clinicId) {
      throw new Error('Clinic ID is required');
    }
    const page = paginationQuery.page || 1;
    const limit = paginationQuery.limit || 10;
    const doctorId = paginationQuery.doctor_id;
    return this.slotTemplateService.findAll(clinicId, page, limit, doctorId);
  }

  @Get(':id')
  @UseGuards(ClinicPermissionsGuard)
  @Permissions(ClinicPermission.READ_DOCTOR)
  @ApiOperation({ summary: 'Get a slot template by ID' })
  @ApiResponse({ status: 200, description: 'Slot template found' })
  @ApiResponse({ status: 404, description: 'Slot template not found' })
  findOne(
    @ClinicId() clinicId: number,
    @Param('id') id: string,
  ) {
    if (!clinicId) {
      throw new Error('Clinic ID is required');
    }
    return this.slotTemplateService.findOne(clinicId, +id);
  }

  @Patch(':id')
  @UseGuards(ClinicPermissionsGuard)
  @Permissions(ClinicPermission.UPDATE_DOCTOR)
  @ApiOperation({ summary: 'Update a slot template' })
  @ApiResponse({ status: 200, description: 'Slot template updated successfully' })
  @ApiResponse({ status: 404, description: 'Slot template not found' })
  update(
    @ClinicId() clinicId: number,
    @Param('id') id: string,
    @Body() updateSlotTemplateDto: UpdateSlotTemplateDto,
  ) {
    if (!clinicId) {
      throw new Error('Clinic ID is required');
    }
    return this.slotTemplateService.update(
      clinicId,
      +id,
      updateSlotTemplateDto,
    );
  }

  @Delete(':id')
  @UseGuards(ClinicPermissionsGuard)
  @Permissions(ClinicPermission.DELETE_DOCTOR)
  @ApiOperation({ summary: 'Delete a slot template' })
  @ApiResponse({ status: 200, description: 'Slot template deleted successfully' })
  @ApiResponse({ status: 404, description: 'Slot template not found' })
  remove(
    @ClinicId() clinicId: number,
    @Param('id') id: string,
  ) {
    if (!clinicId) {
      throw new Error('Clinic ID is required');
    }
    return this.slotTemplateService.remove(clinicId, +id);
  }
}

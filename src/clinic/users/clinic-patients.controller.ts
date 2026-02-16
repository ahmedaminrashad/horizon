import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { ClinicsService } from '../../clinics/clinics.service';
import { AddClinicPatientDto } from './dto/add-clinic-patient.dto';
import { UpdateClinicPatientDto } from './dto/update-clinic-patient.dto';
import { ClinicPatientsQueryDto } from './dto/clinic-patients-query.dto';
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
    description:
      'Supports search (name, phone, email, patient ID) and filter by is_active, clinic_id.',
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
          is_active: { type: 'boolean' },
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
  getPatients(
    @ClinicId() clinicId: number,
    @Query() query: ClinicPatientsQueryDto,
  ) {
    if (!clinicId) {
      throw new Error('Clinic ID is required');
    }
    return this.clinicsService.getClinicPatients(clinicId, {
      phone: query.phone,
      search: query.search,
      is_active: query.is_active,
      clinic_id: query.clinic_id,
    });
  }

  @Post()
  @UseGuards(ClinicPermissionsGuard)
  @Permissions(ClinicPermission.CREATE_USER as string)
  @ApiOperation({
    summary: 'Link a main user (patient) to the clinic',
  })
  @ApiParam({
    name: 'clinicId',
    schema: { type: 'integer', example: 1 },
    description: 'Clinic ID',
  })
  @ApiBody({
    type: AddClinicPatientDto,
    description: 'Main user (patient) ID to link to the clinic',
  })
  @ApiResponse({
    status: 201,
    description: 'Patient linked to the clinic',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        user_id: { type: 'number' },
        clinic_id: { type: 'number' },
        is_active: { type: 'boolean' },
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
  })
  @ApiResponse({ status: 404, description: 'Clinic or user not found' })
  @ApiResponse({ status: 409, description: 'User already linked to clinic' })
  addPatient(@ClinicId() clinicId: number, @Body() dto: AddClinicPatientDto) {
    if (!clinicId) {
      throw new Error('Clinic ID is required');
    }
    return this.clinicsService.addClinicPatient(clinicId, dto);
  }

  @Get(':patientId')
  @UseGuards(ClinicPermissionsGuard)
  @Permissions(ClinicPermission.READ_USER as string)
  @ApiOperation({
    summary: 'Get a single patient linked to the clinic by patient (user) id',
  })
  @ApiParam({ name: 'clinicId', type: Number, example: 1 })
  @ApiParam({ name: 'patientId', type: Number, example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Patient (main user) linked to this clinic',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        user_id: { type: 'number' },
        clinic_id: { type: 'number' },
        is_active: { type: 'boolean' },
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
  })
  @ApiResponse({ status: 404, description: 'Clinic or patient not found' })
  getPatientById(
    @ClinicId() clinicId: number,
    @Param('patientId', ParseIntPipe) patientId: number,
  ) {
    if (!clinicId) {
      throw new Error('Clinic ID is required');
    }
    return this.clinicsService.getClinicPatientById(clinicId, patientId);
  }

  @Patch(':patientId')
  @UseGuards(ClinicPermissionsGuard)
  @Permissions(ClinicPermission.UPDATE_USER as string)
  @ApiOperation({
    summary: 'Update patient data and/or status (is_active)',
  })
  @ApiParam({ name: 'clinicId', type: Number, example: 1 })
  @ApiParam({
    name: 'patientId',
    type: Number,
    description: 'User ID of the patient',
  })
  @ApiBody({ type: UpdateClinicPatientDto })
  @ApiResponse({
    status: 200,
    description: 'Patient updated',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        user_id: { type: 'number' },
        clinic_id: { type: 'number' },
        is_active: { type: 'boolean' },
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
  })
  @ApiResponse({ status: 404, description: 'Clinic or patient not found' })
  updatePatient(
    @ClinicId() clinicId: number,
    @Param('patientId', ParseIntPipe) patientId: number,
    @Body() dto: UpdateClinicPatientDto,
  ) {
    if (!clinicId) {
      throw new Error('Clinic ID is required');
    }
    return this.clinicsService.updateClinicPatient(clinicId, patientId, dto);
  }
}

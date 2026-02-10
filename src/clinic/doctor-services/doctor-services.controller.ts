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
  ApiParam,
} from '@nestjs/swagger';
import { DoctorServicesService } from './doctor-services.service';
import { CreateDoctorServiceDto } from './dto/create-doctor-service.dto';
import { UpdateDoctorServiceDto } from './dto/update-doctor-service.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ClinicTenantGuard } from '../guards/clinic-tenant.guard';
import { ClinicPermissionsGuard } from '../guards/clinic-permissions.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { ClinicPermission } from '../permissions/enums/clinic-permission.enum';
import { ClinicId } from '../decorators/clinic-id.decorator';

@ApiTags('clinic/doctor-services')
@Controller('clinic/:clinicId/doctor-services')
@UseGuards(ClinicTenantGuard, JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class DoctorServicesController {
  constructor(
    private readonly doctorServicesService: DoctorServicesService,
  ) {}

  @Post()
  @UseGuards(ClinicPermissionsGuard)
  @Permissions(ClinicPermission.CREATE_DOCTOR)
  @ApiOperation({ summary: 'Create a doctor service' })
  @ApiParam({ name: 'clinicId', description: 'Clinic ID' })
  @ApiResponse({ status: 201, description: 'Doctor service created' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  create(
    @ClinicId() clinicId: number,
    @Body() createDto: CreateDoctorServiceDto,
  ) {
    return this.doctorServicesService.create(clinicId, createDto);
  }

  @Get()
  @UseGuards(ClinicPermissionsGuard)
  @Permissions(ClinicPermission.READ_DOCTOR)
  @ApiOperation({ summary: 'List doctor services with optional doctor filter' })
  @ApiParam({ name: 'clinicId', description: 'Clinic ID' })
  @ApiQuery({ name: 'doctor_id', required: false, type: Number })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Paginated list' })
  findAll(
    @ClinicId() clinicId: number,
    @Query('doctor_id') doctorId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const docId = doctorId ? parseInt(doctorId, 10) : undefined;
    const p = page ? parseInt(page, 10) : 1;
    const l = limit ? parseInt(limit, 10) : 10;
    return this.doctorServicesService.findAll(clinicId, docId, p, l);
  }

  @Get(':id')
  @UseGuards(ClinicPermissionsGuard)
  @Permissions(ClinicPermission.READ_DOCTOR)
  @ApiOperation({ summary: 'Get one doctor service by ID' })
  @ApiParam({ name: 'clinicId', description: 'Clinic ID' })
  @ApiParam({ name: 'id', description: 'Doctor service ID' })
  @ApiResponse({ status: 200, description: 'Doctor service' })
  @ApiResponse({ status: 404, description: 'Not found' })
  findOne(@ClinicId() clinicId: number, @Param('id') id: string) {
    return this.doctorServicesService.findOne(clinicId, parseInt(id, 10));
  }

  @Patch(':id')
  @UseGuards(ClinicPermissionsGuard)
  @Permissions(ClinicPermission.UPDATE_DOCTOR)
  @ApiOperation({ summary: 'Update a doctor service' })
  @ApiParam({ name: 'clinicId', description: 'Clinic ID' })
  @ApiParam({ name: 'id', description: 'Doctor service ID' })
  @ApiResponse({ status: 200, description: 'Updated' })
  @ApiResponse({ status: 404, description: 'Not found' })
  update(
    @ClinicId() clinicId: number,
    @Param('id') id: string,
    @Body() updateDto: UpdateDoctorServiceDto,
  ) {
    return this.doctorServicesService.update(
      clinicId,
      parseInt(id, 10),
      updateDto,
    );
  }

  @Delete(':id')
  @UseGuards(ClinicPermissionsGuard)
  @Permissions(ClinicPermission.DELETE_DOCTOR)
  @ApiOperation({ summary: 'Delete a doctor service' })
  @ApiParam({ name: 'clinicId', description: 'Clinic ID' })
  @ApiParam({ name: 'id', description: 'Doctor service ID' })
  @ApiResponse({ status: 200, description: 'Deleted' })
  @ApiResponse({ status: 404, description: 'Not found' })
  remove(@ClinicId() clinicId: number, @Param('id') id: string) {
    return this.doctorServicesService.remove(clinicId, parseInt(id, 10));
  }
}

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
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { ReservationsService } from './reservations.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ClinicTenantGuard } from '../guards/clinic-tenant.guard';
import { ClinicPermissionsGuard } from '../guards/clinic-permissions.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { ClinicPermission } from '../permissions/enums/clinic-permission.enum';
import { ClinicId } from '../decorators/clinic-id.decorator';

@ApiTags('clinic/reservations')
@Controller('clinic/:clinicId/reservations')
@UseGuards(ClinicTenantGuard, JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new reservation' })
  @ApiParam({
    name: 'clinicId',
    type: Number,
    description: 'Clinic ID',
    example: 1,
  })
  @ApiResponse({ status: 201, description: 'Reservation created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 404, description: 'Clinic or working hour not found' })
  create(
    @ClinicId() clinicId: number,
    @Body() createReservationDto: CreateReservationDto,
    @Request() req: any,
  ) {
    if (!clinicId) {
      throw new Error('Clinic ID is required');
    }
    // Get patient_id from authenticated user
    const patientId = req.user?.userId || 0;
    return this.reservationsService.create(clinicId, createReservationDto, patientId);
  }

  @Get()
  @UseGuards(ClinicPermissionsGuard)
  @Permissions(ClinicPermission.READ_RESERVATION as string)
  @ApiOperation({ summary: 'Get all reservations with pagination' })
  @ApiParam({
    name: 'clinicId',
    type: Number,
    description: 'Clinic ID',
    example: 1,
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({ status: 200, description: 'List of reservations' })
  findAll(
    @ClinicId() clinicId: number,
    @Query() paginationQuery: PaginationQueryDto,
  ) {
    if (!clinicId) {
      throw new Error('Clinic ID is required');
    }
    const page = paginationQuery.page || 1;
    const limit = paginationQuery.limit || 10;
    return this.reservationsService.findAll(clinicId, page, limit);
  }

  @Get(':id')
  @UseGuards(ClinicPermissionsGuard)
  @Permissions(ClinicPermission.READ_RESERVATION as string)
  @ApiOperation({ summary: 'Get a reservation by ID' })
  @ApiParam({
    name: 'clinicId',
    type: Number,
    description: 'Clinic ID',
    example: 1,
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Reservation ID',
    example: 1,
  })
  @ApiResponse({ status: 200, description: 'Reservation found' })
  @ApiResponse({ status: 404, description: 'Reservation not found' })
  findOne(
    @ClinicId() clinicId: number,
    @Param('id') id: string,
  ) {
    if (!clinicId) {
      throw new Error('Clinic ID is required');
    }
    return this.reservationsService.findOne(clinicId, +id);
  }

  @Patch(':id')
  @UseGuards(ClinicPermissionsGuard)
  @Permissions(ClinicPermission.UPDATE_RESERVATION as string)
  @ApiOperation({ summary: 'Update a reservation' })
  @ApiParam({
    name: 'clinicId',
    type: Number,
    description: 'Clinic ID',
    example: 1,
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Reservation ID',
    example: 1,
  })
  @ApiResponse({ status: 200, description: 'Reservation updated successfully' })
  @ApiResponse({ status: 404, description: 'Reservation not found' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  update(
    @ClinicId() clinicId: number,
    @Param('id') id: string,
    @Body() updateReservationDto: UpdateReservationDto,
  ) {
    if (!clinicId) {
      throw new Error('Clinic ID is required');
    }
    return this.reservationsService.update(clinicId, +id, updateReservationDto);
  }

  @Delete(':id')
  @UseGuards(ClinicPermissionsGuard)
  @Permissions(ClinicPermission.DELETE_RESERVATION as string)
  @ApiOperation({ summary: 'Delete a reservation' })
  @ApiParam({
    name: 'clinicId',
    type: Number,
    description: 'Clinic ID',
    example: 1,
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Reservation ID',
    example: 1,
  })
  @ApiResponse({ status: 200, description: 'Reservation deleted successfully' })
  @ApiResponse({ status: 404, description: 'Reservation not found' })
  remove(
    @ClinicId() clinicId: number,
    @Param('id') id: string,
  ) {
    if (!clinicId) {
      throw new Error('Clinic ID is required');
    }
    return this.reservationsService.remove(clinicId, +id);
  }
}

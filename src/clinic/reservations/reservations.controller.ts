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
import { ReservationStatus } from './entities/reservation.entity';

@ApiTags('clinic/reservations')
@Controller('clinic/:clinicId/reservations')
@UseGuards(ClinicTenantGuard, JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post()
  @UseGuards(ClinicPermissionsGuard)
  @Permissions(ClinicPermission.CREATE_RESERVATION as string)
  @ApiOperation({ summary: 'Create a new reservation' })
  @ApiResponse({ status: 201, description: 'Reservation created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  create(
    @ClinicId() clinicId: number,
    @Body() createReservationDto: CreateReservationDto,
  ) {
    if (!clinicId) {
      throw new Error('Clinic ID is required');
    }
    return this.reservationsService.create(clinicId, createReservationDto);
  }

  @Get()
  @UseGuards(ClinicPermissionsGuard)
  @Permissions(ClinicPermission.READ_RESERVATION as string)
  @ApiOperation({ summary: 'Get all reservations with pagination' })
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
  @ApiResponse({ status: 200, description: 'Reservation updated successfully' })
  @ApiResponse({ status: 404, description: 'Reservation not found' })
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

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
  BadRequestException,
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
import { CreateMainUserReservationDto } from './dto/create-main-user-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ClinicTenantGuard } from '../guards/clinic-tenant.guard';
import { ClinicPermissionsGuard } from '../guards/clinic-permissions.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { ClinicPermission } from '../permissions/enums/clinic-permission.enum';
import { ClinicId } from '../decorators/clinic-id.decorator';

@ApiTags('clinic/reservations')
@Controller()
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Get('reservation')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all reservations for main user' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({ status: 200, description: 'List of reservations for main user' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAllForMainUser(
    @Query() paginationQuery: PaginationQueryDto,
    @Request() req: { user?: { userId: number; name?: string; phone: string; email?: string } },
  ) {
    if (!req.user?.userId) {
      throw new BadRequestException('User authentication required');
    }

    const page = paginationQuery.page || 1;
    const limit = paginationQuery.limit || 10;

    return this.reservationsService.findAllForMainUser(
      req.user.userId,
      page,
      limit,
    );
  }

  @Get('reservation/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get a reservation by ID for main user' })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Reservation ID',
    example: 1,
  })
  @ApiResponse({ status: 200, description: 'Reservation found' })
  @ApiResponse({ status: 404, description: 'Reservation not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findOneForMainUser(
    @Param('id') id: string,
    @Request() req: { user?: { userId: number; name?: string; phone: string; email?: string } },
  ) {
    if (!req.user?.userId) {
      throw new BadRequestException('User authentication required');
    }

    return this.reservationsService.findOneForMainUser(
      req.user.userId,
      +id,
    );
  }

  @Post('reservation')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a reservation for main user' })
  @ApiResponse({
    status: 201,
    description: 'Reservation created successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({
    status: 404,
    description: 'Clinic or working hour not found',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  createMainUserReservation(
    @Body() createMainUserReservationDto: CreateMainUserReservationDto,
    @Request() req: { user?: { userId: number; name?: string; phone: string; email?: string } },
  ) {
    // Get main user from authenticated user
    const mainUser = {
      id: req.user?.userId || 0,
      name: req.user?.name,
      phone: req.user?.phone || '',
      email: req.user?.email,
    };

    if (!req.user?.userId || !req.user?.phone) {
      throw new BadRequestException('User authentication required');
    }

    return this.reservationsService.createMainUserReservation(
      createMainUserReservationDto,
      mainUser,
    );
  }

  @Post('clinic/:clinicId/reservations')
  @UseGuards(ClinicTenantGuard, JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new reservation (for clinic users)' })
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

  @Get('clinic/:clinicId/reservations')
  @UseGuards(ClinicTenantGuard, JwtAuthGuard, ClinicPermissionsGuard)
  @ApiBearerAuth('JWT-auth')
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

  @Get('clinic/:clinicId/reservations/:id')
  @UseGuards(ClinicTenantGuard, JwtAuthGuard, ClinicPermissionsGuard)
  @ApiBearerAuth('JWT-auth')
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

  @Patch('clinic/:clinicId/reservations/:id')
  @UseGuards(ClinicTenantGuard, JwtAuthGuard, ClinicPermissionsGuard)
  @ApiBearerAuth('JWT-auth')
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

  @Delete('clinic/:clinicId/reservations/:id')
  @UseGuards(ClinicTenantGuard, JwtAuthGuard, ClinicPermissionsGuard)
  @ApiBearerAuth('JWT-auth')
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

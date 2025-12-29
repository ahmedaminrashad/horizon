import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { ClinicWorkingHoursService } from './clinic-working-hours.service';
import { CreateClinicWorkingHoursDto } from './dto/create-clinic-working-hours.dto';
import { CreateClinicBreakHoursDto } from './dto/create-clinic-break-hours.dto';
import { WorkingHoursQueryDto } from './dto/working-hours-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('clinics/working-hours')
@Controller('clinics/:clinicId/working-hours')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class ClinicWorkingHoursController {
  constructor(
    private readonly clinicWorkingHoursService: ClinicWorkingHoursService,
  ) {}

  @Get()
  @Roles('admin')
  @ApiOperation({ summary: 'Get default working hours for a clinic' })
  @ApiParam({
    name: 'clinicId',
    type: Number,
    description: 'Clinic ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Working hours retrieved successfully',
  })
  getWorkingHours(@Param('clinicId', ParseIntPipe) clinicId: number) {
    return this.clinicWorkingHoursService.getWorkingHours(clinicId);
  }

  @Post()
  @Roles('admin')
  @ApiOperation({
    summary: 'Set default working hours for a clinic',
    description:
      'Creates or updates default working hours for a clinic. These can be synced to the clinic database.',
  })
  @ApiParam({
    name: 'clinicId',
    type: Number,
    description: 'Clinic ID',
    example: 1,
  })
  @ApiBody({ type: CreateClinicWorkingHoursDto })
  @ApiResponse({
    status: 201,
    description: 'Working hours set successfully',
  })
  setWorkingHours(
    @Param('clinicId', ParseIntPipe) clinicId: number,
    @Body() createWorkingHoursDto: CreateClinicWorkingHoursDto,
  ) {
    return this.clinicWorkingHoursService.setWorkingHours(
      clinicId,
      createWorkingHoursDto,
    );
  }

  @Get('breaks')
  @Roles('admin')
  @ApiOperation({ summary: 'Get default break hours for a clinic' })
  @ApiParam({
    name: 'clinicId',
    type: Number,
    description: 'Clinic ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Break hours retrieved successfully',
  })
  getBreakHours(@Param('clinicId', ParseIntPipe) clinicId: number) {
    return this.clinicWorkingHoursService.getBreakHours(clinicId);
  }

  @Post('breaks')
  @Roles('admin')
  @ApiOperation({
    summary: 'Set default break hours for a clinic',
    description:
      'Creates or updates default break hours for a clinic. These can be synced to the clinic database.',
  })
  @ApiParam({
    name: 'clinicId',
    type: Number,
    description: 'Clinic ID',
    example: 1,
  })
  @ApiBody({ type: CreateClinicBreakHoursDto })
  @ApiResponse({
    status: 201,
    description: 'Break hours set successfully',
  })
  setBreakHours(
    @Param('clinicId', ParseIntPipe) clinicId: number,
    @Body() createBreakHoursDto: CreateClinicBreakHoursDto,
  ) {
    return this.clinicWorkingHoursService.setBreakHours(
      clinicId,
      createBreakHoursDto,
    );
  }

  @Post('sync')
  @Roles('admin')
  @ApiOperation({
    summary: 'Sync working hours and breaks from main database to clinic database',
    description:
      'Copies default working hours and breaks from the main database to the clinic tenant database.',
  })
  @ApiParam({
    name: 'clinicId',
    type: Number,
    description: 'Clinic ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Working hours and breaks synced successfully',
  })
  syncToClinic(@Param('clinicId', ParseIntPipe) clinicId: number) {
    return this.clinicWorkingHoursService.syncToClinic(clinicId);
  }
}

@ApiTags('working-hours')
@Controller('working-hours')
export class PublicWorkingHoursController {
  constructor(
    private readonly clinicWorkingHoursService: ClinicWorkingHoursService,
  ) {}

  @Get()
  @Public()
  @ApiOperation({
    summary: 'Get paginated clinic working hours (public)',
    description:
      'Returns paginated list of clinic working hours with optional filters by clinic_id, day, and time range',
  })
  @ApiQuery({
    name: 'clinic_id',
    required: false,
    type: Number,
    description: 'Filter by clinic ID',
    example: 1,
  })
  @ApiQuery({
    name: 'day',
    required: false,
    enum: [
      'MONDAY',
      'TUESDAY',
      'WEDNESDAY',
      'THURSDAY',
      'FRIDAY',
      'SATURDAY',
      'SUNDAY',
    ],
    description: 'Filter by day of the week',
    example: 'MONDAY',
  })
  @ApiQuery({
    name: 'start_time',
    required: false,
    type: String,
    description: 'Filter by minimum start time (HH:MM:SS format)',
    example: '09:00:00',
  })
  @ApiQuery({
    name: 'end_time',
    required: false,
    type: String,
    description: 'Filter by maximum end time (HH:MM:SS format)',
    example: '17:00:00',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Working hours retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
          },
        },
        total: { type: 'number', example: 100 },
        page: { type: 'number', example: 1 },
        limit: { type: 'number', example: 10 },
        totalPages: { type: 'number', example: 10 },
      },
    },
  })
  findAll(@Query() query: WorkingHoursQueryDto) {
    return this.clinicWorkingHoursService.findAllWorkingHours(
      query.clinic_id,
      query.day,
      query.start_time,
      query.end_time,
      query.page || 1,
      query.limit || 10,
    );
  }
}


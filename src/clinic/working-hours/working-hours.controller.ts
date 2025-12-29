import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  ParseEnumPipe,
  Query,
  ParseIntPipe,
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
import { WorkingHoursService } from './working-hours.service';
import { CreateWorkingHoursDto } from './dto/create-working-hours.dto';
import { CreateBreakHoursDto } from './dto/create-break-hours.dto';
import { DayOfWeek, WorkingHour } from './entities/working-hour.entity';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ClinicTenantGuard } from '../guards/clinic-tenant.guard';
import { ClinicPermissionsGuard } from '../guards/clinic-permissions.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { ClinicPermission } from '../permissions/enums/clinic-permission.enum';
import { ClinicId } from '../decorators/clinic-id.decorator';
import { Public } from '../../auth/decorators/public.decorator';

@ApiTags('clinic/working-hours')
@Controller('clinic/working-hours')
@UseGuards(ClinicTenantGuard, JwtAuthGuard, ClinicPermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class WorkingHoursController {
  constructor(private readonly workingHoursService: WorkingHoursService) {}

  @Get()
  @Public()
  @ApiOperation({
    summary: 'Get working hours (public)',
    description:
      'Get working hours with optional filters by day and time range',
  })
  @ApiQuery({
    name: 'clinicId',
    required: false,
    type: Number,
    description: 'Clinic ID',
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
  @ApiResponse({
    status: 200,
    description: 'Working hours retrieved successfully',
  })
  async getWorkingHours(
    @Query('clinicId', new ParseIntPipe({ optional: true })) clinicId?: number,
    @Query('day') day?: string,
    @Query('start_time') start_time?: string,
    @Query('end_time') end_time?: string,
  ): Promise<WorkingHour[]> {
   
    return await this.workingHoursService.getWorkingHoursWithFilters(
      clinicId,
      day ? (day as DayOfWeek) : undefined,
      start_time,
      end_time,
    );
  }

  @Post()
  @Permissions(ClinicPermission.UPDATE_SETTING as string)
  @ApiOperation({
    summary: 'Set working hours for the clinic',
    description:
      'Creates or updates working hours. Supports multiple ranges per day. Validates for overlaps and invalid ranges.',
  })
  @ApiQuery({
    name: 'clinicId',
    required: false,
    type: Number,
    description: 'Clinic ID (optional, defaults to clinic from JWT token)',
    example: 1,
  })
  @ApiBody({ type: CreateWorkingHoursDto })
  @ApiResponse({
    status: 201,
    description: 'Working hours set successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid time ranges or overlaps detected',
  })
  setWorkingHours(
    @Query('clinicId', new ParseIntPipe({ optional: true }))
    clinicIdFromQuery: number | undefined,
    @ClinicId() clinicIdFromToken: number | undefined,
    @Body() createWorkingHoursDto: CreateWorkingHoursDto,
  ) {
    // Use clinicId from query if provided, otherwise get from token/context
    const clinicId = clinicIdFromQuery ?? clinicIdFromToken;
    if (!clinicId) {
      throw new Error(
        'ClinicId must be provided via query parameter or JWT token',
      );
    }
    return this.workingHoursService.setWorkingHours(
      clinicId,
      createWorkingHoursDto,
    );
  }

  @Get('day/:day')
  @Permissions(ClinicPermission.READ_SETTING as string)
  @ApiOperation({ summary: 'Get working hours for a specific day' })
  @ApiQuery({
    name: 'clinicId',
    required: false,
    type: Number,
    description: 'Clinic ID (optional, defaults to clinic from JWT token)',
    example: 1,
  })
  @ApiParam({
    name: 'day',
    enum: DayOfWeek,
    description: 'Day of the week',
    example: DayOfWeek.MONDAY,
  })
  @ApiResponse({
    status: 200,
    description: 'Working hours for the day retrieved successfully',
  })
  getWorkingHoursByDay(
    @Query('clinicId', new ParseIntPipe({ optional: true }))
    _clinicIdFromQuery: number | undefined,
    @Param('day', new ParseEnumPipe(DayOfWeek)) day: DayOfWeek,
  ) {
    return this.workingHoursService.getWorkingHoursByDay(day);
  }

  @Delete('day/:day')
  @Permissions(ClinicPermission.UPDATE_SETTING as string)
  @ApiOperation({ summary: 'Delete working hours for a specific day' })
  @ApiQuery({
    name: 'clinicId',
    required: false,
    type: Number,
    description: 'Clinic ID (optional, defaults to clinic from JWT token)',
    example: 1,
  })
  @ApiParam({
    name: 'day',
    enum: DayOfWeek,
    description: 'Day of the week',
    example: DayOfWeek.MONDAY,
  })
  @ApiResponse({
    status: 200,
    description: 'Working hours deleted successfully',
  })
  deleteWorkingHoursByDay(
    @Query('clinicId', new ParseIntPipe({ optional: true }))
    _clinicIdFromQuery: number | undefined,
    @Param('day', new ParseEnumPipe(DayOfWeek)) day: DayOfWeek,
  ) {
    return this.workingHoursService.deleteWorkingHoursByDay(day);
  }

  @Get('breaks')
  @Permissions(ClinicPermission.READ_SETTING as string)
  @ApiOperation({ summary: 'Get all break hours' })
  @ApiQuery({
    name: 'clinicId',
    required: false,
    type: Number,
    description: 'Clinic ID (optional, defaults to clinic from JWT token)',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Break hours retrieved successfully',
  })
  getBreakHours(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    @Query('clinicId', new ParseIntPipe({ optional: true })) _clinicId?: number,
  ) {
    return this.workingHoursService.getBreakHours();
  }

  @Post('breaks')
  @Permissions(ClinicPermission.UPDATE_SETTING as string)
  @ApiOperation({
    summary: 'Set break hours for the clinic',
    description:
      'Creates or updates break hours. Supports multiple breaks per day. Validates that breaks are within working hours and do not overlap.',
  })
  @ApiQuery({
    name: 'clinicId',
    required: false,
    type: Number,
    description: 'Clinic ID (optional, defaults to clinic from JWT token)',
    example: 1,
  })
  @ApiBody({ type: CreateBreakHoursDto })
  @ApiResponse({
    status: 201,
    description: 'Break hours set successfully',
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid break ranges, overlaps, or breaks outside working hours',
  })
  setBreakHours(
    @Query('clinicId', new ParseIntPipe({ optional: true }))
    clinicIdFromQuery: number | undefined,
    @ClinicId() clinicIdFromToken: number | undefined,
    @Body() createBreakHoursDto: CreateBreakHoursDto,
  ) {
    // Use clinicId from query if provided, otherwise get from token/context
    const clinicId = clinicIdFromQuery ?? clinicIdFromToken;
    if (!clinicId) {
      throw new Error(
        'ClinicId must be provided via query parameter or JWT token',
      );
    }
    return this.workingHoursService.setBreakHours(
      clinicId,
      createBreakHoursDto,
    );
  }

  @Get('breaks/day/:day')
  @Permissions(ClinicPermission.READ_SETTING as string)
  @ApiOperation({ summary: 'Get break hours for a specific day' })
  @ApiQuery({
    name: 'clinicId',
    required: false,
    type: Number,
    description: 'Clinic ID (optional, defaults to clinic from JWT token)',
    example: 1,
  })
  @ApiParam({
    name: 'day',
    enum: DayOfWeek,
    description: 'Day of the week',
    example: DayOfWeek.MONDAY,
  })
  @ApiResponse({
    status: 200,
    description: 'Break hours for the day retrieved successfully',
  })
  getBreakHoursByDay(
    @Query('clinicId', new ParseIntPipe({ optional: true }))
    _clinicIdFromQuery: number | undefined,
    @Param('day', new ParseEnumPipe(DayOfWeek)) day: DayOfWeek,
  ) {
    return this.workingHoursService.getBreakHoursByDay(day);
  }

  @Delete('breaks/day/:day')
  @Permissions(ClinicPermission.UPDATE_SETTING as string)
  @ApiOperation({ summary: 'Delete break hours for a specific day' })
  @ApiQuery({
    name: 'clinicId',
    required: false,
    type: Number,
    description: 'Clinic ID (optional, defaults to clinic from JWT token)',
    example: 1,
  })
  @ApiParam({
    name: 'day',
    enum: DayOfWeek,
    description: 'Day of the week',
    example: DayOfWeek.MONDAY,
  })
  @ApiResponse({
    status: 200,
    description: 'Break hours deleted successfully',
  })
  deleteBreakHoursByDay(
    @Query('clinicId', new ParseIntPipe({ optional: true }))
    _clinicIdFromQuery: number | undefined,
    @Param('day', new ParseEnumPipe(DayOfWeek)) day: DayOfWeek,
  ) {
    return this.workingHoursService.deleteBreakHoursByDay(day);
  }

  @Get('schedule')
  @Public()
  @ApiOperation({
    summary: 'Get complete weekly schedule (working hours + breaks)',
  })
  @ApiQuery({
    name: 'clinicId',
    required: false,
    type: Number,
    description: 'Clinic ID (optional, defaults to clinic from JWT token)',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Weekly schedule retrieved successfully',
  })
  getWeeklySchedule(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    @Query('clinicId', new ParseIntPipe({ optional: true })) _clinicId?: number,
  ) {
    return this.workingHoursService.getWeeklySchedule();
  }

  @Get('schedule/day/:day')
  @Permissions(ClinicPermission.READ_SETTING as string)
  @ApiOperation({
    summary:
      'Get complete schedule for a specific day (working hours + breaks)',
  })
  @ApiQuery({
    name: 'clinicId',
    required: false,
    type: Number,
    description: 'Clinic ID (optional, defaults to clinic from JWT token)',
    example: 1,
  })
  @ApiParam({
    name: 'day',
    enum: DayOfWeek,
    description: 'Day of the week',
    example: DayOfWeek.MONDAY,
  })
  @ApiResponse({
    status: 200,
    description: 'Schedule for the day retrieved successfully',
  })
  getScheduleByDay(
    @Query('clinicId', new ParseIntPipe({ optional: true }))
    _clinicIdFromQuery: number | undefined,
    @Param('day', new ParseEnumPipe(DayOfWeek)) day: DayOfWeek,
  ) {
    return this.workingHoursService.getScheduleByDay(day);
  }
}

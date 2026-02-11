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
import {
  ClinicCreateDoctorWorkingHoursDto,
  CreateBulkDoctorWorkingHoursDto,
} from './dto/create-doctor-working-hours.dto';
import { DayOfWeek, WorkingHour } from './entities/working-hour.entity';
import { DoctorWorkingHour } from './entities/doctor-working-hour.entity';
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
      'Creates or updates working hours. Supports multiple ranges per day. Validates for overlaps and invalid ranges. ' +
      'Can set clinic-wide working hours (omit branch_id) or branch-specific working hours (provide branch_id).',
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
      'Creates or updates break hours. Supports multiple breaks per day. Validates that breaks are within working hours and do not overlap. ' +
      'Can set clinic-wide break hours (omit branch_id) or branch-specific break hours (provide branch_id).',
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

  // ==================== Doctor Working Hours Endpoints ====================

  @Get('doctors/:id')
  @Permissions(ClinicPermission.READ_SETTING as string)
  @ApiOperation({
    summary: 'Get all working hours for a doctor (clinic)',
    description:
      'Retrieve all working hours for a doctor in the current clinic tenant.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Doctor ID (clinic doctor id)',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'List of doctor working hours',
    type: [DoctorWorkingHour],
  })
  getDoctorWorkingHours(@Param('id', ParseIntPipe) id: number) {
    return this.workingHoursService.getDoctorWorkingHours(id);
  }

  @Get('doctors/:doctorId/day/:day')
  @Permissions(ClinicPermission.READ_SETTING as string)
  @ApiOperation({
    summary: 'Get doctor working hours by day (clinic)',
    description: 'Retrieve working hours for a doctor on a specific day.',
  })
  @ApiParam({
    name: 'doctorId',
    type: Number,
    description: 'Doctor ID (clinic doctor id)',
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
    description: 'Doctor working hours for the day retrieved successfully',
    type: [DoctorWorkingHour],
  })
  getDoctorWorkingHoursByDay(
    @Param('doctorId', ParseIntPipe) doctorId: number,
    @Param('day', new ParseEnumPipe(DayOfWeek)) day: DayOfWeek,
  ) {
    return this.workingHoursService.getDoctorWorkingHoursByDay(doctorId, day);
  }

  @Get('doctors/:doctorId/branch/:branchId')
  @Permissions(ClinicPermission.READ_SETTING as string)
  @ApiOperation({
    summary: 'Get doctor working hours by branch (clinic)',
    description: 'Retrieve working hours for a doctor at a specific branch.',
  })
  @ApiParam({
    name: 'doctorId',
    type: Number,
    description: 'Doctor ID (clinic doctor id)',
    example: 1,
  })
  @ApiParam({
    name: 'branchId',
    type: Number,
    description: 'Branch ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Doctor working hours for the branch retrieved successfully',
    type: [DoctorWorkingHour],
  })
  getDoctorWorkingHoursByBranch(
    @Param('doctorId', ParseIntPipe) doctorId: number,
    @Param('branchId', ParseIntPipe) branchId: number,
  ) {
    return this.workingHoursService.getDoctorWorkingHoursByBranch(
      doctorId,
      branchId,
    );
  }

  @Post('doctors/:doctorId')
  @Permissions(ClinicPermission.UPDATE_SETTING as string)
  @ApiOperation({
    summary: 'Create doctor working hours (clinic)',
    description:
      'Create working hour entries for a doctor. Send `days` (array of weekdays); one working hour is created per day with the same settings. Validates overlaps.',
  })
  @ApiParam({
    name: 'doctorId',
    type: Number,
    description: 'Doctor ID (clinic doctor id)',
    example: 1,
  })
  @ApiBody({ type: ClinicCreateDoctorWorkingHoursDto })
  @ApiResponse({
    status: 201,
    description:
      'Doctor working hours created (one per day in `days`). Returns the created working hours array.',
    type: [DoctorWorkingHour],
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid time ranges or overlaps detected',
  })
  setDoctorWorkingHours(
    @Param('doctorId', ParseIntPipe) doctorId: number,
    @Body() createDto: ClinicCreateDoctorWorkingHoursDto,
  ) {
    return this.workingHoursService.setDoctorWorkingHours(doctorId, createDto);
  }

  @Post('doctors/bulk')
  @Permissions(ClinicPermission.UPDATE_SETTING as string)
  @ApiOperation({
    summary: 'Bulk create doctor working hours (clinic)',
    description:
      'Create working hour entries for a doctor. Each item has `days` (array); one working hour is created per day per item. Validates overlaps.',
  })
  @ApiBody({ type: CreateBulkDoctorWorkingHoursDto })
  @ApiResponse({
    status: 201,
    description:
      'Doctor working hours created (one per day per item). Returns the created working hours array.',
    type: [DoctorWorkingHour],
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid time ranges or overlaps detected',
  })
  setBulkDoctorWorkingHours(
    @Body() createDto: CreateBulkDoctorWorkingHoursDto,
  ) {
    return this.workingHoursService.setBulkDoctorWorkingHours(createDto);
  }

  @Post('doctors/:doctorId/update/:id')
  @Permissions(ClinicPermission.UPDATE_SETTING as string)
  @ApiOperation({
    summary: 'Update doctor working hour (clinic)',
    description:
      'Update an existing working hour by ID. Send only fields to change (e.g. start_time, end_time, branch_id). The day of the record cannot be changed. Body is partial; `days` is ignored.',
  })
  @ApiParam({
    name: 'doctorId',
    type: Number,
    description: 'Doctor ID (clinic doctor id)',
    example: 1,
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Working hour ID',
    example: 1,
  })
  @ApiBody({
    type: ClinicCreateDoctorWorkingHoursDto,
    description: 'Partial: only include fields to update. `days` is ignored.',
  })
  @ApiResponse({
    status: 200,
    description: 'Doctor working hour updated successfully',
    type: DoctorWorkingHour,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid time ranges or overlaps detected',
  })
  updateDoctorWorkingHour(
    @Param('doctorId', ParseIntPipe) _doctorId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: Partial<ClinicCreateDoctorWorkingHoursDto>,
  ) {
    return this.workingHoursService.updateDoctorWorkingHour(id, updateDto);
  }

  @Delete('doctors/:doctorId/:id')
  @Permissions(ClinicPermission.UPDATE_SETTING as string)
  @ApiOperation({
    summary: 'Delete doctor working hour (clinic)',
    description: 'Delete a specific working hour entry for a doctor.',
  })
  @ApiParam({
    name: 'doctorId',
    type: Number,
    description: 'Doctor ID (clinic doctor id)',
    example: 1,
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Working hour ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Doctor working hour deleted successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Working hour not found',
  })
  deleteDoctorWorkingHour(
    @Param('doctorId', ParseIntPipe) _doctorId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.workingHoursService.deleteDoctorWorkingHour(id);
  }

  @Delete('doctors/:doctorId')
  @Permissions(ClinicPermission.UPDATE_SETTING as string)
  @ApiOperation({
    summary: 'Delete all working hours for a doctor',
    description: 'Delete all working hour entries for a doctor',
  })
  @ApiParam({
    name: 'doctorId',
    type: Number,
    description: 'Doctor ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'All doctor working hours deleted successfully',
  })
  deleteDoctorWorkingHours(@Param('doctorId', ParseIntPipe) doctorId: number) {
    return this.workingHoursService.deleteDoctorWorkingHours(doctorId);
  }

  @Delete('doctors/:doctorId/day/:day')
  @Permissions(ClinicPermission.UPDATE_SETTING as string)
  @ApiOperation({
    summary: 'Delete doctor working hours by day',
    description:
      'Delete all working hour entries for a doctor on a specific day',
  })
  @ApiParam({
    name: 'doctorId',
    type: Number,
    description: 'Doctor ID (clinic doctor id)',
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
    description: 'Doctor working hours for the day deleted successfully',
  })
  deleteDoctorWorkingHoursByDay(
    @Param('doctorId', ParseIntPipe) doctorId: number,
    @Param('day', new ParseEnumPipe(DayOfWeek)) day: DayOfWeek,
  ) {
    return this.workingHoursService.deleteDoctorWorkingHoursByDay(
      doctorId,
      day,
    );
  }
}

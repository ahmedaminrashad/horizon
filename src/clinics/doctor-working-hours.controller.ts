import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  ParseIntPipe,
  UseGuards,
  ParseEnumPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiExcludeController,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { DoctorWorkingHoursService } from './doctor-working-hours.service';
import {
  CreateDoctorWorkingHoursDto,
  CreateBulkDoctorWorkingHoursDto,
} from './dto/create-doctor-working-hours.dto';
import { UpdateDoctorWorkingHoursDto } from './dto/update-doctor-working-hours.dto';
import {
  DayOfWeek,
  DoctorWorkingHour,
} from './entities/doctor-working-hour.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiExcludeController()
@ApiTags('doctors/working-hours')
@Controller('doctors/:doctorId/working-hours')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class DoctorWorkingHoursController {
  constructor(
    private readonly doctorWorkingHoursService: DoctorWorkingHoursService,
  ) {}

  @Get()
  @Roles('admin')
  @ApiOperation({
    summary: 'List working hours for a doctor',
    description:
      'Returns all working hour records for the given doctor (main DB). ' +
      'Each record includes doctor_id, clinic_id, day, start_time, end_time, branch_id, and other slot settings.',
  })
  @ApiParam({
    name: 'doctorId',
    type: Number,
    description: 'Doctor ID (main database)',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'List of doctor working hours',
    type: [DoctorWorkingHour],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getWorkingHours(@Param('doctorId', ParseIntPipe) doctorId: number) {
    return this.doctorWorkingHoursService.getWorkingHours(doctorId);
  }

  @Get('day/:day')
  @Roles('admin')
  @ApiOperation({
    summary: 'Get working hours by day',
    description:
      'Returns working hours for the doctor on the given day of the week.',
  })
  @ApiParam({
    name: 'doctorId',
    type: Number,
    description: 'Doctor ID (main database)',
    example: 1,
  })
  @ApiParam({
    name: 'day',
    enum: DayOfWeek,
    description: 'Day of the week (e.g. MONDAY, TUESDAY)',
    example: DayOfWeek.MONDAY,
  })
  @ApiResponse({
    status: 200,
    description: 'List of working hours for that day',
    type: [DoctorWorkingHour],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getWorkingHoursByDay(
    @Param('doctorId', ParseIntPipe) doctorId: number,
    @Param('day', new ParseEnumPipe(DayOfWeek)) day: DayOfWeek,
  ) {
    return this.doctorWorkingHoursService.getWorkingHoursByDay(doctorId, day);
  }

  @Get('branch/:branchId')
  @Roles('admin')
  @ApiOperation({
    summary: 'Get working hours by branch',
    description:
      'Returns working hours for the doctor at the given branch ' +
      '(branch_id from main branches table).',
  })
  @ApiParam({
    name: 'doctorId',
    type: Number,
    description: 'Doctor ID (main database)',
    example: 1,
  })
  @ApiParam({
    name: 'branchId',
    type: Number,
    description: 'Branch ID (main database)',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'List of working hours for that branch',
    type: [DoctorWorkingHour],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getWorkingHoursByBranch(
    @Param('doctorId', ParseIntPipe) doctorId: number,
    @Param('branchId', ParseIntPipe) branchId: number,
  ) {
    return this.doctorWorkingHoursService.getWorkingHoursByBranch(
      doctorId,
      branchId,
    );
  }

  @Post()
  @Roles('admin')
  @ApiOperation({
    summary: 'Create a working hour',
    description:
      'Creates one working hour for the doctor (single day). Body: day, start_time, end_time. ' +
      'Optional: branch_id, session_time, waterfall, is_active, fees, busy, patients_limit. ' +
      'clinic_id is set from the doctor. Overlaps validated; syncs to clinic DB.',
  })
  @ApiParam({
    name: 'doctorId',
    type: Number,
    description: 'Doctor ID (main database)',
    example: 1,
  })
  @ApiBody({ type: CreateDoctorWorkingHoursDto })
  @ApiResponse({
    status: 201,
    description: 'Created working hour (single object)',
    type: DoctorWorkingHour,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error or time range overlap',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  setWorkingHours(
    @Param('doctorId', ParseIntPipe) doctorId: number,
    @Body() createDto: CreateDoctorWorkingHoursDto,
  ) {
    return this.doctorWorkingHoursService.setWorkingHours(doctorId, createDto);
  }

  @Post('bulk')
  @Roles('admin')
  @ApiOperation({
    summary: 'Bulk create working hours',
    description:
      'Creates multiple working hours for the doctor. Body: `doctor_id` and `working_hours` array. Each item has one `day` and time range; one main-DB record per item. clinic_id is set from the doctor. Overlaps are validated. Syncs to clinic database.',
  })
  @ApiParam({
    name: 'doctorId',
    type: Number,
    description: 'Doctor ID (main database)',
    example: 1,
  })
  @ApiBody({ type: CreateBulkDoctorWorkingHoursDto })
  @ApiResponse({
    status: 201,
    description: 'Array of created working hours',
    type: [DoctorWorkingHour],
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error or time range overlap',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  setBulkWorkingHours(@Body() createDto: CreateBulkDoctorWorkingHoursDto) {
    return this.doctorWorkingHoursService.setBulkWorkingHours(createDto);
  }

  @Post(':id')
  @Roles('admin')
  @ApiOperation({
    summary: 'Update a working hour',
    description:
      'Updates an existing working hour by id. Send only the fields to change (partial body). Overlaps are re-validated. Syncs to clinic database.',
  })
  @ApiParam({
    name: 'doctorId',
    type: Number,
    description: 'Doctor ID (main database)',
    example: 1,
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Working hour ID (main database)',
    example: 1,
  })
  @ApiBody({
    type: UpdateDoctorWorkingHoursDto,
    description: 'Partial body: only include fields to update',
  })
  @ApiResponse({
    status: 200,
    description: 'Updated working hour',
    type: DoctorWorkingHour,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error or time range overlap',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Working hour not found' })
  updateWorkingHour(
    @Param('doctorId', ParseIntPipe) _doctorId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: Partial<CreateDoctorWorkingHoursDto>,
  ) {
    return this.doctorWorkingHoursService.updateWorkingHour(id, updateDto);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({
    summary: 'Delete a working hour',
    description: 'Deletes the working hour by id (main database).',
  })
  @ApiParam({
    name: 'doctorId',
    type: Number,
    description: 'Doctor ID (main database)',
    example: 1,
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Working hour ID to delete',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Working hour deleted',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Working hour not found' })
  deleteWorkingHour(
    @Param('doctorId', ParseIntPipe) _doctorId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.doctorWorkingHoursService.deleteWorkingHour(id);
  }

  @Delete()
  @Roles('admin')
  @ApiOperation({
    summary: 'Delete all working hours for a doctor',
    description:
      'Deletes every working hour record for the given doctor (main database).',
  })
  @ApiParam({
    name: 'doctorId',
    type: Number,
    description: 'Doctor ID (main database)',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'All working hours for the doctor deleted',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  deleteWorkingHours(@Param('doctorId', ParseIntPipe) doctorId: number) {
    return this.doctorWorkingHoursService.deleteWorkingHours(doctorId);
  }

  @Delete('day/:day')
  @Roles('admin')
  @ApiOperation({
    summary: 'Delete working hours by day',
    description:
      'Deletes all working hour records for the doctor on the given day.',
  })
  @ApiParam({
    name: 'doctorId',
    type: Number,
    description: 'Doctor ID (main database)',
    example: 1,
  })
  @ApiParam({
    name: 'day',
    enum: DayOfWeek,
    description: 'Day of the week (e.g. MONDAY)',
    example: DayOfWeek.MONDAY,
  })
  @ApiResponse({
    status: 200,
    description: 'Working hours for that day deleted',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  deleteWorkingHoursByDay(
    @Param('doctorId', ParseIntPipe) doctorId: number,
    @Param('day', new ParseEnumPipe(DayOfWeek)) day: DayOfWeek,
  ) {
    return this.doctorWorkingHoursService.deleteWorkingHoursByDay(
      doctorId,
      day,
    );
  }
}

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
import { DayOfWeek, DoctorWorkingHour } from './entities/doctor-working-hour.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

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
    summary: 'Get all working hours for a doctor',
    description: 'Retrieve all working hours for a specific doctor',
  })
  @ApiParam({
    name: 'doctorId',
    type: Number,
    description: 'Doctor ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Doctor working hours retrieved successfully',
    type: [DoctorWorkingHour],
  })
  getWorkingHours(@Param('doctorId', ParseIntPipe) doctorId: number) {
    return this.doctorWorkingHoursService.getWorkingHours(doctorId);
  }

  @Get('day/:day')
  @Roles('admin')
  @ApiOperation({
    summary: 'Get doctor working hours by day',
    description: 'Retrieve working hours for a doctor on a specific day',
  })
  @ApiParam({
    name: 'doctorId',
    type: Number,
    description: 'Doctor ID',
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
  getWorkingHoursByDay(
    @Param('doctorId', ParseIntPipe) doctorId: number,
    @Param('day', new ParseEnumPipe(DayOfWeek)) day: DayOfWeek,
  ) {
    return this.doctorWorkingHoursService.getWorkingHoursByDay(doctorId, day);
  }

  @Get('branch/:branchId')
  @Roles('admin')
  @ApiOperation({
    summary: 'Get doctor working hours by branch',
    description: 'Retrieve working hours for a doctor at a specific branch',
  })
  @ApiParam({
    name: 'doctorId',
    type: Number,
    description: 'Doctor ID',
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
    summary: 'Create doctor working hours',
    description:
      'Create a new working hour entry for a doctor. Validates for overlaps and invalid ranges. Automatically syncs to clinic database.',
  })
  @ApiParam({
    name: 'doctorId',
    type: Number,
    description: 'Doctor ID',
    example: 1,
  })
  @ApiBody({ type: CreateDoctorWorkingHoursDto })
  @ApiResponse({
    status: 201,
    description: 'Doctor working hours created successfully',
    type: DoctorWorkingHour,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid time ranges or overlaps detected',
  })
  setWorkingHours(
    @Param('doctorId', ParseIntPipe) doctorId: number,
    @Body() createDto: CreateDoctorWorkingHoursDto,
  ) {
    return this.doctorWorkingHoursService.setWorkingHours(doctorId, createDto);
  }

  @Post('bulk')
  @Roles('admin')
  @ApiOperation({
    summary: 'Bulk create doctor working hours',
    description:
      'Create multiple working hour entries for a doctor at once. Validates for overlaps and invalid ranges. Automatically syncs to clinic database.',
  })
  @ApiParam({
    name: 'doctorId',
    type: Number,
    description: 'Doctor ID',
    example: 1,
  })
  @ApiBody({ type: CreateBulkDoctorWorkingHoursDto })
  @ApiResponse({
    status: 201,
    description: 'Doctor working hours created successfully',
    type: [DoctorWorkingHour],
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid time ranges or overlaps detected',
  })
  setBulkWorkingHours(@Body() createDto: CreateBulkDoctorWorkingHoursDto) {
    return this.doctorWorkingHoursService.setBulkWorkingHours(createDto);
  }

  @Post(':id')
  @Roles('admin')
  @ApiOperation({
    summary: 'Update doctor working hours',
    description:
      'Update an existing working hour entry for a doctor. Validates for overlaps and invalid ranges. Automatically syncs to clinic database.',
  })
  @ApiParam({
    name: 'doctorId',
    type: Number,
    description: 'Doctor ID',
    example: 1,
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Working hour ID',
    example: 1,
  })
  @ApiBody({ type: CreateDoctorWorkingHoursDto })
  @ApiResponse({
    status: 200,
    description: 'Doctor working hours updated successfully',
    type: DoctorWorkingHour,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid time ranges or overlaps detected',
  })
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
    summary: 'Delete doctor working hours',
    description: 'Delete a specific working hour entry for a doctor',
  })
  @ApiParam({
    name: 'doctorId',
    type: Number,
    description: 'Doctor ID',
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
    description: 'Doctor working hours deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Working hour not found',
  })
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
  deleteWorkingHours(@Param('doctorId', ParseIntPipe) doctorId: number) {
    return this.doctorWorkingHoursService.deleteWorkingHours(doctorId);
  }

  @Delete('day/:day')
  @Roles('admin')
  @ApiOperation({
    summary: 'Delete doctor working hours by day',
    description: 'Delete all working hour entries for a doctor on a specific day',
  })
  @ApiParam({
    name: 'doctorId',
    type: Number,
    description: 'Doctor ID',
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


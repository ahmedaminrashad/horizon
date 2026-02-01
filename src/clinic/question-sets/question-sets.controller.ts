import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { QuestionSetsService } from './question-sets.service';
import { CreateQuestionSetDto } from './dto/create-question-set.dto';
import { UpdateQuestionSetDto } from './dto/update-question-set.dto';
import { CreateQuestionSetAssignmentDto } from './dto/create-question-set-assignment.dto';
import { UpdateQuestionSetAssignmentDto } from './dto/update-question-set-assignment.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ClinicTenantGuard } from '../guards/clinic-tenant.guard';
import { ClinicPermissionsGuard } from '../guards/clinic-permissions.guard';
import { ClinicId } from '../decorators/clinic-id.decorator';
import { AppointType } from '../doctors/entities/doctor.entity';

@ApiTags('clinic/question-sets')
@Controller('clinic/:clinicId/question-sets')
@UseGuards(ClinicTenantGuard, JwtAuthGuard, ClinicPermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class QuestionSetsController {
  constructor(private readonly questionSetsService: QuestionSetsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new question set' })
  @ApiResponse({
    status: 201,
    description: 'Question set created successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  create(
    @ClinicId() clinicId: number,
    @Body() createQuestionSetDto: CreateQuestionSetDto,
  ) {
    return this.questionSetsService.create(clinicId, createQuestionSetDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all question sets with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({ status: 200, description: 'List of question sets' })
  findAll(
    @ClinicId() clinicId: number,
    @Query() paginationQuery: PaginationQueryDto,
  ) {
    const page = paginationQuery.page || 1;
    const limit = paginationQuery.limit || 10;
    return this.questionSetsService.findAll(clinicId, page, limit);
  }

  @Get('resolve')
  @ApiOperation({
    summary: 'Get question set for a booking based on priority rules',
  })
  @ApiQuery({
    name: 'doctor_id',
    required: false,
    type: Number,
    description: 'Doctor ID',
  })
  @ApiQuery({
    name: 'service_id',
    required: false,
    type: Number,
    description: 'Service ID',
  })
  @ApiQuery({
    name: 'specialty',
    required: false,
    type: String,
    description: 'Specialty name',
  })
  @ApiQuery({
    name: 'appoint_type',
    required: false,
    enum: AppointType,
    description: 'Visit type (in-clinic, online, home)',
  })
  @ApiQuery({
    name: 'branch_id',
    required: false,
    type: Number,
    description: 'Branch ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Question set found based on priority rules',
  })
  @ApiResponse({
    status: 404,
    description: 'No matching question set found',
  })
  async getQuestionSetForBooking(
    @ClinicId() clinicId: number,
    @Query('doctor_id') doctorId?: string,
    @Query('service_id') serviceId?: string,
    @Query('specialty') specialty?: string,
    @Query('appoint_type') appointType?: AppointType,
    @Query('branch_id') branchId?: string,
  ) {
    const questionSet = await this.questionSetsService.getQuestionSetForBooking(
      clinicId,
      {
        doctor_id: doctorId ? +doctorId : undefined,
        service_id: serviceId ? +serviceId : undefined,
        specialty,
        appoint_type: appointType,
        branch_id: branchId ? +branchId : undefined,
      },
    );

    if (!questionSet) {
      return { questionSet: null, message: 'No matching question set found' };
    }

    return { questionSet };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a question set by ID' })
  @ApiResponse({ status: 200, description: 'Question set found' })
  @ApiResponse({ status: 404, description: 'Question set not found' })
  findOne(@ClinicId() clinicId: number, @Param('id') id: string) {
    return this.questionSetsService.findOne(clinicId, +id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a question set' })
  @ApiResponse({ status: 200, description: 'Question set updated successfully' })
  @ApiResponse({ status: 404, description: 'Question set not found' })
  update(
    @ClinicId() clinicId: number,
    @Param('id') id: string,
    @Body() updateQuestionSetDto: UpdateQuestionSetDto,
  ) {
    return this.questionSetsService.update(clinicId, +id, updateQuestionSetDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a question set' })
  @ApiResponse({ status: 200, description: 'Question set deleted successfully' })
  @ApiResponse({ status: 404, description: 'Question set not found' })
  remove(@ClinicId() clinicId: number, @Param('id') id: string) {
    return this.questionSetsService.remove(clinicId, +id);
  }

  @Post(':id/assignments')
  @ApiOperation({ summary: 'Assign a question set to doctors/services/specialties/visit types/branches' })
  @ApiResponse({
    status: 201,
    description: 'Assignment created successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 404, description: 'Question set or referenced entity not found' })
  @ApiResponse({ status: 409, description: 'Assignment already exists' })
  createAssignment(
    @ClinicId() clinicId: number,
    @Param('id') questionSetId: string,
    @Body() createAssignmentDto: CreateQuestionSetAssignmentDto,
  ) {
    return this.questionSetsService.createAssignment(clinicId, {
      ...createAssignmentDto,
      question_set_id: +questionSetId,
    });
  }

  @Get(':id/assignments')
  @ApiOperation({ summary: 'Get all assignments for a question set' })
  @ApiResponse({ status: 200, description: 'List of assignments' })
  findAllAssignments(
    @ClinicId() clinicId: number,
    @Param('id') questionSetId: string,
  ) {
    return this.questionSetsService.findAllAssignments(
      clinicId,
      +questionSetId,
    );
  }

  @Get('assignments/all')
  @ApiOperation({ summary: 'Get all assignments for the clinic' })
  @ApiResponse({ status: 200, description: 'List of all assignments' })
  findAllClinicAssignments(@ClinicId() clinicId: number) {
    return this.questionSetsService.findAllAssignments(clinicId);
  }

  @Patch('assignments/:assignmentId')
  @ApiOperation({ summary: 'Update an assignment' })
  @ApiResponse({ status: 200, description: 'Assignment updated successfully' })
  @ApiResponse({ status: 404, description: 'Assignment not found' })
  updateAssignment(
    @ClinicId() clinicId: number,
    @Param('assignmentId') assignmentId: string,
    @Body() updateAssignmentDto: UpdateQuestionSetAssignmentDto,
  ) {
    return this.questionSetsService.updateAssignment(
      clinicId,
      +assignmentId,
      updateAssignmentDto,
    );
  }

  @Delete('assignments/:assignmentId')
  @ApiOperation({ summary: 'Delete an assignment' })
  @ApiResponse({ status: 200, description: 'Assignment deleted successfully' })
  @ApiResponse({ status: 404, description: 'Assignment not found' })
  removeAssignment(
    @ClinicId() clinicId: number,
    @Param('assignmentId') assignmentId: string,
  ) {
    return this.questionSetsService.removeAssignment(clinicId, +assignmentId);
  }
}

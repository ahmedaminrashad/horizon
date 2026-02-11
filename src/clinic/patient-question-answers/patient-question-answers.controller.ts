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
  Req,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { PatientQuestionAnswersService } from './patient-question-answers.service';
import { CreatePatientQuestionAnswerDto } from './dto/create-patient-question-answer.dto';
import { UpdatePatientQuestionAnswerDto } from './dto/update-patient-question-answer.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ClinicTenantGuard } from '../guards/clinic-tenant.guard';
import { ClinicId } from '../decorators/clinic-id.decorator';

@ApiTags('clinic/patient-question-answers')
@Controller('clinic/patient-question-answers')
@UseGuards(ClinicTenantGuard, JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class PatientQuestionAnswersController {
  constructor(
    private readonly patientQuestionAnswersService: PatientQuestionAnswersService,
  ) {}

  @Post()
  @ApiOperation({
    summary:
      'Create a patient question answer (main JWT required). clinic_id in body.',
  })
  @ApiBody({ type: CreatePatientQuestionAnswerDto })
  @ApiResponse({ status: 201, description: 'Answer created successfully' })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or related entity not found',
  })
  async create(
    @Body() createDto: CreatePatientQuestionAnswerDto,
    @Req() req: { user?: { userId: number; isMainUser?: boolean } },
  ) {
    if (!req.user) {
      throw new UnauthorizedException('Main JWT required');
    }
    const clinicId: number = Number(createDto.clinic_id);
    if (Number.isNaN(clinicId) || clinicId <= 0) {
      throw new BadRequestException('clinic_id is required in body.');
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- tenant service resolves main user to clinic patient id
    const patientId: number =
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call -- tenant service method
      await this.patientQuestionAnswersService.getOrCreateClinicUserIdFromMainUser(
        req.user.userId,
        clinicId,
      );
    return this.patientQuestionAnswersService.create(
      clinicId,
      createDto,
      patientId,
    );
  }

  @Get()
  @ApiOperation({
    summary:
      'Get all patient question answers with pagination (main JWT required). clinic_id in query.',
  })
  @ApiQuery({
    name: 'clinic_id',
    required: true,
    type: Number,
    description: 'Clinic ID (tenant)',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'patient_id', required: false, type: Number })
  @ApiQuery({ name: 'doctor_id', required: false, type: Number })
  @ApiQuery({ name: 'question_id', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Paginated list of answers' })
  findAll(
    @ClinicId() clinicId: number,
    @Query() paginationQuery: PaginationQueryDto,
  ) {
    const clinicIdNum = Number(clinicId);
    if (Number.isNaN(clinicIdNum) || clinicIdNum <= 0) {
      throw new BadRequestException('clinic_id query is required.');
    }
    const page = paginationQuery.page ?? 1;
    const limit = paginationQuery.limit ?? 10;
    const filters: {
      patient_id?: number;
      doctor_id?: number;
      question_id?: number;
      clinic_id?: number;
    } = {
      patient_id: paginationQuery.patient_id,
      doctor_id: paginationQuery.doctor_id,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- query param
      question_id: paginationQuery.question_id,
      clinic_id: paginationQuery.clinic_id,
    };
    return this.patientQuestionAnswersService.findAll(
      clinicIdNum,
      page,
      limit,
      filters,
    );
  }

  @Get(':id')
  @ApiOperation({
    summary:
      'Get a patient question answer by ID (main JWT required). clinic_id in query.',
  })
  @ApiQuery({
    name: 'clinic_id',
    required: true,
    type: Number,
    description: 'Clinic ID (tenant)',
  })
  @ApiParam({
    name: 'id',
    schema: { type: 'integer', example: 1 },
    description: 'Answer ID',
  })
  @ApiResponse({ status: 200, description: 'Answer found' })
  @ApiResponse({ status: 404, description: 'Answer not found' })
  findOne(@ClinicId() clinicId: number, @Param('id') id: string) {
    return this.patientQuestionAnswersService.findOne(clinicId, +id);
  }

  @Patch(':id')
  @ApiOperation({
    summary:
      'Update a patient question answer (main JWT required). clinic_id in query.',
  })
  @ApiQuery({
    name: 'clinic_id',
    required: true,
    type: Number,
    description: 'Clinic ID (tenant)',
  })
  @ApiParam({
    name: 'id',
    schema: { type: 'integer', example: 1 },
    description: 'Answer ID',
  })
  @ApiBody({ type: UpdatePatientQuestionAnswerDto })
  @ApiResponse({ status: 200, description: 'Answer updated successfully' })
  @ApiResponse({ status: 404, description: 'Answer not found' })
  update(
    @ClinicId() clinicId: number,
    @Param('id') id: string,
    @Body() updateDto: UpdatePatientQuestionAnswerDto,
  ) {
    return this.patientQuestionAnswersService.update(clinicId, +id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary:
      'Delete a patient question answer (main JWT required). clinic_id in query.',
  })
  @ApiQuery({
    name: 'clinic_id',
    required: true,
    type: Number,
    description: 'Clinic ID (tenant)',
  })
  @ApiParam({
    name: 'id',
    schema: { type: 'integer', example: 1 },
    description: 'Answer ID',
  })
  @ApiResponse({ status: 200, description: 'Answer deleted successfully' })
  @ApiResponse({ status: 404, description: 'Answer not found' })
  remove(@ClinicId() clinicId: number, @Param('id') id: string) {
    return this.patientQuestionAnswersService.remove(clinicId, +id);
  }
}

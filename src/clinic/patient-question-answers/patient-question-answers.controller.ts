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
import { ClinicPermissionsGuard } from '../guards/clinic-permissions.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { ClinicPermission } from '../permissions/enums/clinic-permission.enum';
import { Public } from '../../auth/decorators/public.decorator';
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
  @Public()
  @ApiOperation({ summary: 'Create a patient question answer (public). clinic_id in body.' })
  @ApiBody({ type: CreatePatientQuestionAnswerDto })
  @ApiResponse({ status: 201, description: 'Answer created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input or related entity not found' })
  async create(
    @Body() createDto: CreatePatientQuestionAnswerDto,
    @Req() req: { user?: { userId: number; isMainUser?: boolean } },
  ) {
    const clinicId = createDto.clinic_id;
    if (clinicId == null) {
      throw new BadRequestException('clinic_id is required in body.');
    }
    let patientId: number | undefined;
    if (req.user?.isMainUser) {
      patientId = await this.patientQuestionAnswersService.getOrCreateClinicUserIdFromMainUser(
        req.user.userId,
        clinicId,
      );
    } else if (req.user?.userId) {
      patientId = req.user.userId;
    } else {
      patientId = createDto.patient_id;
    }
    if (patientId == null) {
      throw new BadRequestException(
        'Patient ID is required: send in body (public) or use authenticated request (clinic or main user token).',
      );
    }
    return this.patientQuestionAnswersService.create(
      clinicId,
      createDto,
      patientId,
    );
  }

  @Get()
  @UseGuards(ClinicPermissionsGuard)
  @Permissions(ClinicPermission.READ_DOCTOR)
  @ApiOperation({ summary: 'Get all patient question answers with pagination. clinic_id in query.' })
  @ApiQuery({ name: 'clinic_id', required: true, type: Number, description: 'Clinic ID (tenant)' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'patient_id', required: false, type: Number })
  @ApiQuery({ name: 'doctor_id', required: false, type: Number })
  @ApiQuery({ name: 'question_id', required: false, type: Number })
  @ApiQuery({ name: 'reservation_id', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Paginated list of answers' })
  findAll(
    @ClinicId() clinicId: number,
    @Query() paginationQuery: PaginationQueryDto,
  ) {
    const page = paginationQuery.page ?? 1;
    const limit = paginationQuery.limit ?? 10;
    const filters = {
      patient_id: paginationQuery.patient_id,
      doctor_id: paginationQuery.doctor_id,
      question_id: paginationQuery.question_id,
      reservation_id: paginationQuery.reservation_id,
      clinic_id: paginationQuery.clinic_id,
    };
    return this.patientQuestionAnswersService.findAll(
      clinicId,
      page,
      limit,
      filters,
    );
  }

  @Get(':id')
  @UseGuards(ClinicPermissionsGuard)
  @Permissions(ClinicPermission.READ_DOCTOR)
  @ApiOperation({ summary: 'Get a patient question answer by ID. clinic_id in query.' })
  @ApiQuery({ name: 'clinic_id', required: true, type: Number, description: 'Clinic ID (tenant)' })
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
  @UseGuards(ClinicPermissionsGuard)
  @Permissions(ClinicPermission.UPDATE_DOCTOR)
  @ApiOperation({ summary: 'Update a patient question answer. clinic_id in query.' })
  @ApiQuery({ name: 'clinic_id', required: true, type: Number, description: 'Clinic ID (tenant)' })
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
  @UseGuards(ClinicPermissionsGuard)
  @Permissions(ClinicPermission.DELETE_DOCTOR)
  @ApiOperation({ summary: 'Delete a patient question answer' })
  @ApiParam({
    name: 'clinicId',
    schema: { type: 'integer', example: 1 },
    description: 'Clinic ID',
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

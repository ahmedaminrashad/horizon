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
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { QuestionsService } from './questions.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ClinicTenantGuard } from '../guards/clinic-tenant.guard';
import { ClinicPermissionsGuard } from '../guards/clinic-permissions.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { ClinicPermission } from '../permissions/enums/clinic-permission.enum';
import { Public } from '../../auth/decorators/public.decorator';
import { ClinicId } from '../decorators/clinic-id.decorator';

@ApiTags('clinic/questions')
@Controller('clinic/questions')
@UseGuards(ClinicTenantGuard, JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Post()
  @UseGuards(ClinicPermissionsGuard)
  @Permissions(ClinicPermission.CREATE_DOCTOR as string)
  @ApiOperation({ summary: 'Create a new question' })
  @ApiQuery({ name: 'clinic_id', required: false, type: Number, description: 'Clinic ID (or from JWT)' })
  @ApiBody({ type: CreateQuestionDto })
  @ApiResponse({ status: 201, description: 'Question created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input or doctor not found' })
  create(
    @ClinicId() clinicId: number,
    @Body() createQuestionDto: CreateQuestionDto,
  ) {
    return this.questionsService.create(clinicId, createQuestionDto);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all questions with pagination (public)' })
  @ApiQuery({ name: 'clinic_id', required: true, type: Number, description: 'Clinic ID' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'doctor_id', required: false, type: Number, description: 'Filter by doctor ID' })
  @ApiResponse({ status: 200, description: 'Paginated list of questions' })
  findAll(
    @ClinicId() clinicId: number,
    @Query() paginationQuery: PaginationQueryDto,
  ) {
    const page = paginationQuery.page ?? 1;
    const limit = paginationQuery.limit ?? 10;
    return this.questionsService.findAll(
      clinicId,
      page,
      limit,
      paginationQuery.doctor_id,
      paginationQuery.clinic_id,
    );
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get a question by ID (public)' })
  @ApiQuery({ name: 'clinic_id', required: false, type: Number, description: 'Clinic ID (required for public access)' })
  @ApiParam({
    name: 'id',
    schema: { type: 'integer', example: 1 },
    description: 'Question ID',
  })
  @ApiResponse({ status: 200, description: 'Question found' })
  @ApiResponse({ status: 404, description: 'Question not found' })
  findOne(@ClinicId() clinicId: number, @Param('id') id: string) {
    return this.questionsService.findOne(clinicId, +id);
  }

  @Patch(':id')
  @UseGuards(ClinicPermissionsGuard)
  @Permissions(ClinicPermission.UPDATE_DOCTOR)
  @ApiOperation({ summary: 'Update a question' })
  @ApiQuery({ name: 'clinic_id', required: false, type: Number, description: 'Clinic ID (or from JWT)' })
  @ApiParam({
    name: 'id',
    schema: { type: 'integer', example: 1 },
    description: 'Question ID',
  })
  @ApiBody({ type: UpdateQuestionDto })
  @ApiResponse({ status: 200, description: 'Question updated successfully' })
  @ApiResponse({ status: 404, description: 'Question not found' })
  update(
    @ClinicId() clinicId: number,
    @Param('id') id: string,
    @Body() updateQuestionDto: UpdateQuestionDto,
  ) {
    return this.questionsService.update(clinicId, +id, updateQuestionDto);
  }

  @Delete(':id')
  @UseGuards(ClinicPermissionsGuard)
  @Permissions(ClinicPermission.DELETE_DOCTOR)
  @ApiOperation({ summary: 'Delete a question' })
  @ApiQuery({ name: 'clinic_id', required: false, type: Number, description: 'Clinic ID (or from JWT)' })
  @ApiParam({
    name: 'id',
    schema: { type: 'integer', example: 1 },
    description: 'Question ID',
  })
  @ApiResponse({ status: 200, description: 'Question deleted successfully' })
  @ApiResponse({ status: 404, description: 'Question not found' })
  remove(@ClinicId() clinicId: number, @Param('id') id: string) {
    return this.questionsService.remove(clinicId, +id);
  }
}

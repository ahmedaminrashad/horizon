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
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiConsumes,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { DoctorsService } from './doctors.service';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ClinicTenantGuard } from '../guards/clinic-tenant.guard';
import { ClinicPermissionsGuard } from '../guards/clinic-permissions.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { Public } from '../../auth/decorators/public.decorator';
import { ClinicPermission } from '../permissions/enums/clinic-permission.enum';
import { Department } from './entities/doctor.entity';
import { ClinicId } from '../decorators/clinic-id.decorator';
import { RegisterDoctorDto } from './dto/register-doctor.dto';
import { WorkingHoursService } from '../working-hours/working-hours.service';
import { DoctorWorkingHour } from '../working-hours/entities/doctor-working-hour.entity';
import { DayOfWeek } from '../working-hours/entities/working-hour.entity';

@ApiTags('clinic/doctors')
@Controller('clinic/:clinicId/doctors')
@UseGuards(ClinicTenantGuard, JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class DoctorsController {
  constructor(
    private readonly doctorsService: DoctorsService,
    private readonly workingHoursService: WorkingHoursService,
  ) {}

  @Post()
  @UseGuards(ClinicPermissionsGuard)
  @Permissions(ClinicPermission.CREATE_DOCTOR as string)
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: diskStorage({
        destination: './uploads/avatars',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `doctor-avatar-${uniqueSuffix}${ext}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
      fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
          return cb(new BadRequestException('Only image files are allowed'), false);
        }
        cb(null, true);
      },
    }),
  )
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiOperation({ summary: 'Register a new doctor (creates user and doctor)' })
  @ApiParam({
    name: 'clinicId',
    type: Number,
    description: 'Clinic ID (can be from JWT token or route parameter)',
  })
  @ApiBody({
    type: RegisterDoctorDto,
    description:
      'Application/json: send the DTO as request body. Multipart/form-data: send field "data" (JSON string of this DTO) and optional "avatar" (image file: jpg/png/gif/webp, max 5MB).',
  })
  @ApiResponse({
    status: 201,
    description: 'Doctor registered successfully',
    schema: {
      type: 'object',
      properties: {
        fullUser: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            name: { type: 'string', nullable: true },
            phone: { type: 'string' },
            email: { type: 'string', nullable: true },
            package_id: { type: 'number' },
            role_id: { type: 'number', nullable: true },
            database_name: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        doctor: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            age: { type: 'number' },
            department: { type: 'string', enum: Object.values(Department) },
            user_id: { type: 'number' },
            clinic_id: { type: 'number' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        access_token: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Clinic context not found' })
  @ApiResponse({ status: 409, description: 'Phone or email already exists' })
  async createNewUser(
    @ClinicId() clinicId: number,
    @Body() body: RegisterDoctorDto & { data?: string },
    @UploadedFile() avatarFile?: Express.Multer.File,
  ) {
    if (!clinicId) {
      throw new Error('Clinic ID is required');
    }
    const registerDoctorDto =
      typeof body?.data === 'string'
        ? plainToInstance(RegisterDoctorDto, JSON.parse(body.data) as object)
        : plainToInstance(RegisterDoctorDto, body);
    if (avatarFile) {
      registerDoctorDto.avatar = `/uploads/avatars/${avatarFile.filename}`;
    }
    const errors = await validate(registerDoctorDto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    if (errors.length > 0) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: errors.map((e) => ({ property: e.property, constraints: e.constraints })),
      });
    }
    return this.doctorsService.registerDoctor(clinicId, registerDoctorDto);
  }

  @Post('/create')
  @UseGuards(ClinicPermissionsGuard)
  @Permissions(ClinicPermission.CREATE_DOCTOR as string)
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: diskStorage({
        destination: './uploads/avatars',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `doctor-avatar-${uniqueSuffix}${ext}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
      fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
          return cb(new BadRequestException('Only image files are allowed'), false);
        }
        cb(null, true);
      },
    }),
  )
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiOperation({ summary: 'Create a new doctor (existing user)' })
  @ApiParam({
    name: 'clinicId',
    type: Number,
    description: 'Clinic ID (can be from JWT token or route parameter)',
  })
  @ApiBody({
    type: CreateDoctorDto,
    description:
      'Application/json: send the DTO as request body. Multipart/form-data: send field "data" (JSON string of this DTO) and optional "avatar" (image file: jpg/png/gif/webp, max 5MB).',
  })
  @ApiResponse({ status: 201, description: 'Doctor created successfully' })
  @ApiResponse({ status: 400, description: 'Clinic context not found' })
  async createExistingUser(
    @ClinicId() clinicId: number,
    @Body() body: CreateDoctorDto & { data?: string },
    @UploadedFile() avatarFile?: Express.Multer.File,
  ) {
    if (!clinicId) {
      throw new Error('Clinic ID is required');
    }
    const createDoctorDto =
      typeof body?.data === 'string'
        ? plainToInstance(CreateDoctorDto, JSON.parse(body.data) as object)
        : plainToInstance(CreateDoctorDto, body);
    if (avatarFile) {
      createDoctorDto.avatar = `/uploads/avatars/${avatarFile.filename}`;
    }
    const errors = await validate(createDoctorDto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    if (errors.length > 0) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: errors.map((e) => ({ property: e.property, constraints: e.constraints })),
      });
    }
    return this.doctorsService.create(clinicId, createDoctorDto);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all doctors with pagination' })
  @ApiParam({
    name: 'clinicId',
    type: Number,
    description: 'Clinic ID (can be from JWT token or route parameter)',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of doctors',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              age: { type: 'number' },
              department: { type: 'string', enum: Object.values(Department) },
              user_id: { type: 'number' },
              clinic_id: { type: 'number' },
              user: {
                type: 'object',
                nullable: true,
                properties: {
                  id: { type: 'number' },
                  name: { type: 'string', nullable: true },
                  phone: { type: 'string' },
                  email: { type: 'string', nullable: true },
                },
              },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        meta: {
          type: 'object',
          properties: {
            total: { type: 'number', example: 100 },
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 10 },
            totalPages: { type: 'number', example: 10 },
            hasNextPage: { type: 'boolean', example: true },
            hasPreviousPage: { type: 'boolean', example: false },
          },
        },
      },
    },
  })
  findAll(
    @ClinicId() clinicId: number,
    @Query() paginationQuery: PaginationQueryDto,
  ) {
    if (!clinicId) {
      throw new Error('Clinic ID is required');
    }
    const page = paginationQuery.page || 1;
    const limit = paginationQuery.limit || 10;
    return this.doctorsService.findAll(clinicId, page, limit);
  }

  @Get(':doctorId')
  @Public()
  @ApiOperation({ summary: 'Get a doctor by ID' })
  @ApiParam({
    name: 'clinicId',
    type: Number,
    description: 'Clinic ID (can be from JWT token or route parameter)',
  })
  @ApiParam({ name: 'doctorId', type: Number, description: 'Doctor ID' })
  @ApiResponse({ status: 200, description: 'Doctor found' })
  @ApiResponse({ status: 404, description: 'Doctor not found' })
  findOne(@ClinicId() clinicId: number, @Param('doctorId') doctorId: string) {
    if (!clinicId) {
      throw new Error('Clinic ID is required');
    }
    return this.doctorsService.findOne(clinicId, +doctorId);
  }

  @Get(':doctorId/working-hours')
  @Public()
  @ApiOperation({ summary: 'Get working hours for a doctor (public)' })
  @ApiParam({
    name: 'clinicId',
    type: Number,
    description: 'Clinic ID',
  })
  @ApiParam({ name: 'doctorId', type: Number, description: 'Doctor ID' })
  @ApiQuery({
    name: 'branchId',
    required: false,
    type: Number,
    description: 'Filter by branch ID',
    example: 1,
  })
  @ApiQuery({
    name: 'day',
    required: false,
    enum: DayOfWeek,
    description: 'Filter by day of the week',
    example: DayOfWeek.MONDAY,
  })
  @ApiResponse({
    status: 200,
    description: 'Doctor working hours retrieved successfully',
    type: [DoctorWorkingHour],
  })
  getDoctorWorkingHours(
    @ClinicId() clinicId: number,
    @Param('doctorId', ParseIntPipe) doctorId: number,
    @Query('branchId', new ParseIntPipe({ optional: true })) branchId?: number,
    @Query('day') day?: string,
  ) {
    if (!clinicId) {
      throw new Error('Clinic ID is required');
    }

    // Validate and parse day if provided
    let dayEnum: DayOfWeek | undefined;
    if (day) {
      if (!Object.values(DayOfWeek).includes(day as DayOfWeek)) {
        throw new BadRequestException(
          `Invalid day value. Must be one of: ${Object.values(DayOfWeek).join(', ')}`,
        );
      }
      dayEnum = day as DayOfWeek;
    }

    // If both branchId and day are provided, we need to filter by both
    if (branchId && dayEnum) {
      return this.workingHoursService.getDoctorWorkingHoursByBranchAndDay(
        doctorId,
        branchId,
        dayEnum,
      );
    }

    // If only branchId is provided
    if (branchId) {
      return this.workingHoursService.getDoctorWorkingHoursByBranch(
        doctorId,
        branchId,
      );
    }

    // If only day is provided
    if (dayEnum) {
      return this.workingHoursService.getDoctorWorkingHoursByDay(doctorId, dayEnum);
    }

    // Return all working hours if no filters
    return this.workingHoursService.getDoctorWorkingHours(doctorId);
  }

  @Patch(':doctorId')
  @UseGuards(ClinicPermissionsGuard)
  @Permissions(ClinicPermission.UPDATE_DOCTOR)
  @ApiOperation({ summary: 'Update a doctor' })
  @ApiParam({
    name: 'clinicId',
    type: Number,
    description: 'Clinic ID (can be from JWT token or route parameter)',
  })
  @ApiParam({ name: 'doctorId', type: Number, description: 'Doctor ID' })
  @ApiBody({
    type: UpdateDoctorDto,
    description: 'Partial doctor data. Optional: doctor_services.',
  })
  @ApiResponse({ status: 200, description: 'Doctor updated successfully' })
  @ApiResponse({ status: 404, description: 'Doctor not found' })
  update(
    @ClinicId() clinicId: number,
    @Param('doctorId') doctorId: string,
    @Body() updateDoctorDto: UpdateDoctorDto,
  ) {
    if (!clinicId) {
      throw new Error('Clinic ID is required');
    }
    return this.doctorsService.update(clinicId, +doctorId, updateDoctorDto);
  }

  @Delete(':doctorId')
  @UseGuards(ClinicPermissionsGuard)
  @Permissions(ClinicPermission.DELETE_DOCTOR)
  @ApiOperation({ summary: 'Delete a doctor' })
  @ApiParam({
    name: 'clinicId',
    type: Number,
    description: 'Clinic ID (can be from JWT token or route parameter)',
  })
  @ApiParam({ name: 'doctorId', type: Number, description: 'Doctor ID' })
  @ApiResponse({ status: 200, description: 'Doctor deleted successfully' })
  @ApiResponse({ status: 404, description: 'Doctor not found' })
  remove(@ClinicId() clinicId: number, @Param('doctorId') doctorId: string) {
    if (!clinicId) {
      throw new Error('Clinic ID is required');
    }
    return this.doctorsService.remove(clinicId, +doctorId);
  }

  @Patch(':doctorId/avatar')
  @UseGuards(ClinicPermissionsGuard)
  @Permissions(ClinicPermission.UPDATE_DOCTOR)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/avatars',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `doctor-avatar-${uniqueSuffix}${ext}`);
        },
      }),
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload doctor avatar' })
  @ApiParam({
    name: 'clinicId',
    type: Number,
    description: 'Clinic ID (can be from JWT token or route parameter)',
  })
  @ApiParam({ name: 'doctorId', type: Number, description: 'Doctor ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Avatar uploaded successfully' })
  @ApiResponse({ status: 404, description: 'Doctor not found' })
  async uploadAvatar(
    @ClinicId() clinicId: number,
    @Param('doctorId') doctorId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|gif|webp)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    if (!clinicId) {
      throw new Error('Clinic ID is required');
    }
    const filePath = `/uploads/avatars/${file.filename}`;
    return this.doctorsService.update(clinicId, +doctorId, {
      avatar: filePath,
    });
  }
}

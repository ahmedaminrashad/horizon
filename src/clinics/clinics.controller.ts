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
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor, AnyFilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { ClinicsService } from './clinics.service';
import { CreateClinicDto } from './dto/create-clinic.dto';
import { UpdateClinicDto } from './dto/update-clinic.dto';
import { RegisterClinicDto } from './dto/register-clinic.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { UpdateClinicIvrDto } from './dto/update-clinic-ivr.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Permission } from '../permissions/enums/permission.enum';
import { Department } from '../clinic/doctors/entities/doctor.entity';
import { SlotType } from './enums/slot-type.enum';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ClinicNameInterceptor } from './interceptors/clinic-name.interceptor';

@ApiTags('clinics')
@Controller('clinics')
@UseInterceptors(ClinicNameInterceptor)
export class ClinicsController {
  constructor(private readonly clinicsService: ClinicsService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new clinic' })
  @ApiResponse({
    status: 201,
    description: 'Clinic registered successfully',
    schema: {
      type: 'object',
      properties: {
        clinic: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            name: { type: 'string' },
            email: { type: 'string' },
            phone: { type: 'string' },
            image: { type: 'string', nullable: true },
            lat: { type: 'number', nullable: true },
            longit: { type: 'number', nullable: true },
            departments: {
              type: 'array',
              items: { type: 'string' },
              nullable: true,
            },
            database_name: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 409, description: 'Email or phone already exists' })
  register(@Body() registerClinicDto: RegisterClinicDto) {
    return this.clinicsService.registerClinic(registerClinicDto);
  }

  @Post()
  @Public()
  @ApiOperation({ summary: 'Create a new clinic' })
  @ApiResponse({ status: 201, description: 'Clinic created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 409, description: 'Email or phone already exists' })
  create(@Body() createClinicDto: CreateClinicDto) {
    return this.clinicsService.create(createClinicDto);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all clinics with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({ status: 200, description: 'List of clinics' })
  findAll(@Query() paginationQuery: PaginationQueryDto) {
    const page = paginationQuery.page || 1;
    const limit = paginationQuery.limit || 10;
    return this.clinicsService.findAll(page, limit);
  }

  @Get('departments')
  @ApiOperation({ summary: 'Get list of all departments' })
  @ApiResponse({
    status: 200,
    description: 'List of departments',
    schema: {
      type: 'object',
      properties: {
        departments: {
          type: 'array',
          items: {
            type: 'string',
            enum: Object.values(Department),
          },
        },
      },
    },
  })
  getDepartments() {
    return {
      departments: Object.values(Department),
    };
  }

  @Get('slot-types')
  @Public()
  @ApiOperation({ summary: 'Get list of all slot types' })
  @ApiResponse({
    status: 200,
    description: 'List of slot types',
    schema: {
      type: 'object',
      properties: {
        slotTypes: {
          type: 'array',
          items: {
            type: 'string',
            enum: Object.values(SlotType),
          },
        },
      },
    },
  })
  getSlotTypes() {
    return {
      slotTypes: Object.values(SlotType),
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a clinic by ID' })
  @ApiResponse({ status: 200, description: 'Clinic found' })
  @ApiResponse({ status: 404, description: 'Clinic not found' })
  findOne(@Param('id') id: string) {
    return this.clinicsService.findOne(+id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth('JWT-auth')
  @Permissions(Permission.UPDATE_CLINIC as string)
  @ApiOperation({ summary: 'Update a clinic' })
  @ApiResponse({ status: 200, description: 'Clinic updated successfully' })
  @ApiResponse({ status: 404, description: 'Clinic not found' })
  @ApiResponse({ status: 409, description: 'Email or phone already exists' })
  update(@Param('id') id: string, @Body() updateClinicDto: UpdateClinicDto) {
    return this.clinicsService.update(+id, updateClinicDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth('JWT-auth')
  @Permissions(Permission.DELETE_CLINIC as string)
  @ApiOperation({ summary: 'Delete a clinic' })
  @ApiResponse({ status: 200, description: 'Clinic deleted successfully' })
  @ApiResponse({ status: 404, description: 'Clinic not found' })
  remove(@Param('id') id: string) {
    return this.clinicsService.remove(+id);
  }

  @Patch(':id/image')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth('JWT-auth')
  @Permissions(Permission.UPDATE_CLINIC as string)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/clinics',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `clinic-${uniqueSuffix}${ext}`);
        },
      }),
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload clinic image' })
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
  @ApiResponse({ status: 200, description: 'Image uploaded successfully' })
  @ApiResponse({ status: 404, description: 'Clinic not found' })
  async uploadImage(
    @Param('id') id: string,
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
    const filePath = `/uploads/clinics/${file.filename}`;
    return this.clinicsService.update(+id, { image: filePath });
  }

  @Patch(':id/ivr')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth('JWT-auth')
  @Permissions(Permission.UPDATE_CLINIC as string)
  @UseInterceptors(
    AnyFilesInterceptor({
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB per file
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update clinic IVR audio files' })
  @ApiBody({
    description: 'IVR audio files to update',
    type: UpdateClinicIvrDto,
  })
  @ApiResponse({
    status: 200,
    description: 'IVR audio files updated successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        uploadedFiles: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Clinic not found or no extension number' })
  async updateIvr(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    // Convert files array to object keyed by field name
    const filesObject: Record<string, Express.Multer.File> = {};
    
    if (files && files.length > 0) {
      // AnyFilesInterceptor preserves field names in file.fieldname
      for (const file of files) {
        if (file && file.fieldname) {
          filesObject[file.fieldname] = file;
        }
      }
    }

    return this.clinicsService.updateIvr(+id, filesObject);
  }
}

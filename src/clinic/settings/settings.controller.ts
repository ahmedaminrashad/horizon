import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Param,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { ClinicSettingsService } from './settings.service';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ClinicTenantGuard } from '../guards/clinic-tenant.guard';
import { ClinicPermissionsGuard } from '../guards/clinic-permissions.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { ClinicPermission } from '../permissions/enums/clinic-permission.enum';
import { ClinicId } from '../decorators/clinic-id.decorator';
import { diskStorage } from 'multer';
import { extname } from 'path';

/**
 * Clinic Settings Controller
 * All operations work with the first (and only) settings record (id: 1) in the clinic database
 */
@ApiTags('clinic/settings')
@Controller('clinic/:clinicId/settings')
@UseGuards(ClinicTenantGuard, JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ClinicSettingsController {
  constructor(private readonly clinicSettingsService: ClinicSettingsService) {}

  @Get()
  @UseGuards(ClinicPermissionsGuard)
  @Permissions(ClinicPermission.READ_SETTING as string)
  @ApiOperation({ summary: 'Get clinic application settings' })
  @ApiResponse({ status: 200, description: 'Settings retrieved successfully' })
  findOne(@ClinicId() clinicId: number) {
    return this.clinicSettingsService.findOne();
  }

  @Patch()
  @UseGuards(ClinicPermissionsGuard)
  @Permissions(ClinicPermission.UPDATE_SETTING as string)
  @ApiOperation({ summary: 'Update clinic application settings' })
  @ApiResponse({ status: 200, description: 'Settings updated successfully' })
  @ApiResponse({ status: 404, description: 'Settings not found' })
  update(
    @ClinicId() clinicId: number,
    @Body() updateSettingDto: UpdateSettingDto,
  ) {
    return this.clinicSettingsService.update(updateSettingDto);
  }

  @Patch('logo')
  @UseGuards(ClinicPermissionsGuard)
  @Permissions(ClinicPermission.UPDATE_SETTING as string)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/logos',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `logo-${uniqueSuffix}${ext}`);
        },
      }),
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload clinic logo' })
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
  @ApiResponse({ status: 200, description: 'Logo uploaded successfully' })
  async uploadLogo(
    @ClinicId() clinicId: number,
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
    const filePath = `/uploads/logos/${file.filename}`;
    return this.clinicSettingsService.update({ logo: filePath });
  }
}

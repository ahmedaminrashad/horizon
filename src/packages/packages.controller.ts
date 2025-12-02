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
  ApiHeader,
} from '@nestjs/swagger';
import { PackagesService } from './packages.service';
import { CreatePackageDto } from './dto/create-package.dto';
import { UpdatePackageDto } from './dto/update-package.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../permissions/enums/permission.enum';
import { LangHeader } from '../decorators/lang-header.decorator';

@ApiTags('packages')
@Controller('packages')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class PackagesController {
  constructor(private readonly packagesService: PackagesService) {}

  @Post()
  @Permissions(Permission.CREATE_PACKAGE as string)
  @ApiOperation({ summary: 'Create a new package' })
  @ApiResponse({ status: 201, description: 'Package created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  create(@Body() createPackageDto: CreatePackageDto) {
    return this.packagesService.create(createPackageDto);
  }

  @Get()
  @Permissions(Permission.READ_PACKAGE as string)
  @ApiOperation({ summary: 'Get all packages with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiHeader({
    name: 'lang',
    required: false,
    description: 'Language code (e.g., en, ar)',
    example: 'en',
  })
  @ApiResponse({ status: 200, description: 'List of packages' })
  findAll(
    @Query() paginationQuery: PaginationQueryDto,
    @LangHeader() lang?: string,
  ) {
    const page = paginationQuery.page || 1;
    const limit = paginationQuery.limit || 10;
    return this.packagesService.findAll(page, limit);
  }

  @Get(':id')
  @Permissions(Permission.READ_PACKAGE as string)
  @ApiOperation({ summary: 'Get a package by ID' })
  @ApiHeader({
    name: 'lang',
    required: false,
    description: 'Language code (e.g., en, ar)',
    example: 'en',
  })
  @ApiResponse({ status: 200, description: 'Package found' })
  @ApiResponse({ status: 404, description: 'Package not found' })
  findOne(@Param('id') id: string, @LangHeader() lang?: string) {
    return this.packagesService.findOne(+id, lang);
  }

  @Patch(':id')
  @Permissions(Permission.UPDATE_PACKAGE as string)
  @ApiOperation({ summary: 'Update a package' })
  @ApiResponse({ status: 200, description: 'Package updated successfully' })
  @ApiResponse({ status: 404, description: 'Package not found' })
  update(@Param('id') id: string, @Body() updatePackageDto: UpdatePackageDto) {
    return this.packagesService.update(+id, updatePackageDto);
  }

  @Delete(':id')
  @Permissions(Permission.DELETE_PACKAGE as string)
  @ApiOperation({ summary: 'Delete a package' })
  @ApiResponse({ status: 200, description: 'Package deleted successfully' })
  @ApiResponse({ status: 404, description: 'Package not found' })
  remove(@Param('id') id: string) {
    return this.packagesService.remove(+id);
  }

  @Post(':id/translations')
  @Permissions(Permission.UPDATE_PACKAGE as string)
  @ApiOperation({ summary: 'Add a translation to a package' })
  @ApiResponse({ status: 201, description: 'Translation added successfully' })
  @ApiResponse({ status: 404, description: 'Package not found' })
  @ApiResponse({ status: 409, description: 'Translation already exists' })
  addTranslation(
    @Param('id') id: string,
    @Body()
    translation: {
      lang: string;
      name: string;
      content?: string;
    },
  ) {
    return this.packagesService.addTranslation(+id, translation);
  }

  @Patch(':id/translations/:lang')
  @Permissions(Permission.UPDATE_PACKAGE as string)
  @ApiOperation({ summary: 'Update a package translation' })
  @ApiResponse({ status: 200, description: 'Translation updated successfully' })
  @ApiResponse({ status: 404, description: 'Translation not found' })
  updateTranslation(
    @Param('id') id: string,
    @Param('lang') lang: string,
    @Body()
    translation: {
      name?: string;
      content?: string;
    },
  ) {
    return this.packagesService.updateTranslation(+id, lang, translation);
  }

  @Delete(':id/translations/:lang')
  @Permissions(Permission.UPDATE_PACKAGE as string)
  @ApiOperation({ summary: 'Delete a package translation' })
  @ApiResponse({ status: 200, description: 'Translation deleted successfully' })
  @ApiResponse({ status: 404, description: 'Translation not found' })
  removeTranslation(@Param('id') id: string, @Param('lang') lang: string) {
    return this.packagesService.removeTranslation(+id, lang);
  }
}

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { ClinicPermissionsService } from './clinic-permissions.service';
import { CreateClinicPermissionDto } from './dto/create-permission.dto';
import { UpdateClinicPermissionDto } from './dto/update-permission.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ClinicTenantGuard } from '../guards/clinic-tenant.guard';
import { ClinicPermissionsGuard } from '../guards/clinic-permissions.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { ClinicPermission } from './enums/clinic-permission.enum';
import { ClinicId } from '../decorators/clinic-id.decorator';

@ApiTags('clinic/permissions')
@Controller('clinic/:clinicId/permissions')
@UseGuards(ClinicTenantGuard, JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ClinicPermissionsController {
  constructor(
    private readonly clinicPermissionsService: ClinicPermissionsService,
  ) {}

  @Post()
  @UseGuards(ClinicPermissionsGuard)
  @Permissions(ClinicPermission.MANAGE_CLINIC as string)
  @ApiOperation({ summary: 'Create a new permission' })
  @ApiParam({
    name: 'clinicId',
    schema: { type: 'integer', example: 1 },
    description: 'Clinic ID',
  })
  @ApiBody({ type: CreateClinicPermissionDto })
  @ApiResponse({ status: 201, description: 'Permission created successfully' })
  @ApiResponse({ status: 409, description: 'Permission already exists' })
  create(
    @ClinicId() clinicId: number,
    @Body() createPermissionDto: CreateClinicPermissionDto,
  ) {
    if (!clinicId) throw new Error('Clinic ID is required');
    return this.clinicPermissionsService.create(createPermissionDto);
  }

  @Get()
  @UseGuards(ClinicPermissionsGuard)
  @Permissions(ClinicPermission.MANAGE_CLINIC as string)
  @ApiOperation({ summary: 'Get all permissions' })
  @ApiParam({
    name: 'clinicId',
    schema: { type: 'integer', example: 1 },
    description: 'Clinic ID',
  })
  @ApiResponse({ status: 200, description: 'List of all permissions' })
  findAll(@ClinicId() clinicId: number) {
    if (!clinicId) throw new Error('Clinic ID is required');
    return this.clinicPermissionsService.findAll();
  }

  @Get(':id')
  @UseGuards(ClinicPermissionsGuard)
  @Permissions(ClinicPermission.MANAGE_CLINIC as string)
  @ApiOperation({ summary: 'Get a permission by ID' })
  @ApiParam({
    name: 'clinicId',
    schema: { type: 'integer', example: 1 },
    description: 'Clinic ID',
  })
  @ApiParam({
    name: 'id',
    schema: { type: 'integer' },
    description: 'Permission ID',
  })
  @ApiResponse({ status: 200, description: 'Permission found' })
  @ApiResponse({ status: 404, description: 'Permission not found' })
  findOne(@ClinicId() clinicId: number, @Param('id', ParseIntPipe) id: number) {
    if (!clinicId) throw new Error('Clinic ID is required');
    return this.clinicPermissionsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(ClinicPermissionsGuard)
  @Permissions(ClinicPermission.MANAGE_CLINIC as string)
  @ApiOperation({ summary: 'Update a permission' })
  @ApiParam({
    name: 'clinicId',
    schema: { type: 'integer', example: 1 },
    description: 'Clinic ID',
  })
  @ApiParam({
    name: 'id',
    schema: { type: 'integer' },
    description: 'Permission ID',
  })
  @ApiBody({ type: UpdateClinicPermissionDto })
  @ApiResponse({ status: 200, description: 'Permission updated successfully' })
  @ApiResponse({ status: 404, description: 'Permission not found' })
  update(
    @ClinicId() clinicId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePermissionDto: UpdateClinicPermissionDto,
  ) {
    if (!clinicId) throw new Error('Clinic ID is required');
    return this.clinicPermissionsService.update(id, updatePermissionDto);
  }

  @Delete(':id')
  @UseGuards(ClinicPermissionsGuard)
  @Permissions(ClinicPermission.MANAGE_CLINIC as string)
  @ApiOperation({ summary: 'Delete a permission' })
  @ApiParam({
    name: 'clinicId',
    schema: { type: 'integer', example: 1 },
    description: 'Clinic ID',
  })
  @ApiParam({
    name: 'id',
    schema: { type: 'integer' },
    description: 'Permission ID',
  })
  @ApiResponse({ status: 200, description: 'Permission deleted successfully' })
  @ApiResponse({ status: 404, description: 'Permission not found' })
  async remove(
    @ClinicId() clinicId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    if (!clinicId) throw new Error('Clinic ID is required');
    await this.clinicPermissionsService.remove(id);
  }
}

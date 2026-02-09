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
import { ClinicRolesService } from './clinic-roles.service';
import { CreateClinicRoleDto } from './dto/create-role.dto';
import { UpdateClinicRoleDto } from './dto/update-role.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ClinicTenantGuard } from '../guards/clinic-tenant.guard';
import { ClinicPermissionsGuard } from '../guards/clinic-permissions.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { ClinicPermission } from '../permissions/enums/clinic-permission.enum';
import { ClinicId } from '../decorators/clinic-id.decorator';

@ApiTags('clinic/roles')
@Controller('clinic/:clinicId/roles')
@UseGuards(ClinicTenantGuard, JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ClinicRolesController {
  constructor(private readonly clinicRolesService: ClinicRolesService) {}

  @Post()
  @UseGuards(ClinicPermissionsGuard)
  @Permissions(ClinicPermission.MANAGE_CLINIC as string)
  @ApiOperation({ summary: 'Create a new role' })
  @ApiParam({
    name: 'clinicId',
    schema: { type: 'integer', example: 1 },
    description: 'Clinic ID',
  })
  @ApiBody({ type: CreateClinicRoleDto })
  @ApiResponse({ status: 201, description: 'Role created successfully' })
  @ApiResponse({ status: 409, description: 'Role already exists' })
  create(@ClinicId() clinicId: number, @Body() createRoleDto: CreateClinicRoleDto) {
    if (!clinicId) throw new Error('Clinic ID is required');
    return this.clinicRolesService.create(createRoleDto);
  }

  @Get()
  @UseGuards(ClinicPermissionsGuard)
  @Permissions(ClinicPermission.MANAGE_CLINIC as string)
  @ApiOperation({ summary: 'Get all roles' })
  @ApiParam({
    name: 'clinicId',
    schema: { type: 'integer', example: 1 },
    description: 'Clinic ID',
  })
  @ApiResponse({ status: 200, description: 'List of all roles' })
  findAll(@ClinicId() clinicId: number) {
    if (!clinicId) throw new Error('Clinic ID is required');
    return this.clinicRolesService.findAll();
  }

  @Get(':id')
  @UseGuards(ClinicPermissionsGuard)
  @Permissions(ClinicPermission.MANAGE_CLINIC as string)
  @ApiOperation({ summary: 'Get a role by ID' })
  @ApiParam({
    name: 'clinicId',
    schema: { type: 'integer', example: 1 },
    description: 'Clinic ID',
  })
  @ApiParam({ name: 'id', schema: { type: 'integer' }, description: 'Role ID' })
  @ApiResponse({ status: 200, description: 'Role found' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  findOne(@ClinicId() clinicId: number, @Param('id', ParseIntPipe) id: number) {
    if (!clinicId) throw new Error('Clinic ID is required');
    return this.clinicRolesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(ClinicPermissionsGuard)
  @Permissions(ClinicPermission.MANAGE_CLINIC as string)
  @ApiOperation({ summary: 'Update a role' })
  @ApiParam({
    name: 'clinicId',
    schema: { type: 'integer', example: 1 },
    description: 'Clinic ID',
  })
  @ApiParam({ name: 'id', schema: { type: 'integer' }, description: 'Role ID' })
  @ApiBody({ type: UpdateClinicRoleDto })
  @ApiResponse({ status: 200, description: 'Role updated successfully' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  update(
    @ClinicId() clinicId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRoleDto: UpdateClinicRoleDto,
  ) {
    if (!clinicId) throw new Error('Clinic ID is required');
    return this.clinicRolesService.update(id, updateRoleDto);
  }

  @Delete(':id')
  @UseGuards(ClinicPermissionsGuard)
  @Permissions(ClinicPermission.MANAGE_CLINIC as string)
  @ApiOperation({ summary: 'Delete a role' })
  @ApiParam({
    name: 'clinicId',
    schema: { type: 'integer', example: 1 },
    description: 'Clinic ID',
  })
  @ApiParam({ name: 'id', schema: { type: 'integer' }, description: 'Role ID' })
  @ApiResponse({ status: 200, description: 'Role deleted successfully' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  async remove(@ClinicId() clinicId: number, @Param('id', ParseIntPipe) id: number) {
    if (!clinicId) throw new Error('Clinic ID is required');
    await this.clinicRolesService.remove(id);
  }

  @Post(':id/permissions')
  @UseGuards(ClinicPermissionsGuard)
  @Permissions(ClinicPermission.MANAGE_CLINIC as string)
  @ApiOperation({ summary: 'Assign permissions to a role' })
  @ApiParam({
    name: 'clinicId',
    schema: { type: 'integer', example: 1 },
    description: 'Clinic ID',
  })
  @ApiParam({ name: 'id', schema: { type: 'integer' }, description: 'Role ID' })
  @ApiBody({ schema: { type: 'object', properties: { permissionIds: { type: 'array', items: { type: 'number' } } } } })
  @ApiResponse({ status: 200, description: 'Permissions assigned successfully' })
  assignPermissions(
    @ClinicId() clinicId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { permissionIds: number[] },
  ) {
    if (!clinicId) throw new Error('Clinic ID is required');
    return this.clinicRolesService.assignPermissions(id, body.permissionIds);
  }
}

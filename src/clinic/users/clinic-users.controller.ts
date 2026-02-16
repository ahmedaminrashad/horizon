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
} from '@nestjs/swagger';
import { ClinicUsersService } from './clinic-users.service';
import { CreateClinicUserDto } from './dto/create-clinic-user.dto';
import { UpdateClinicUserDto } from './dto/update-clinic-user.dto';
import { ClinicUsersQueryDto } from './dto/clinic-users-query.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ClinicTenantGuard } from '../guards/clinic-tenant.guard';
import { ClinicPermissionsGuard } from '../guards/clinic-permissions.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { ClinicPermission } from '../permissions/enums/clinic-permission.enum';
import { ClinicId } from '../decorators/clinic-id.decorator';

@ApiTags('clinic/users')
@Controller('clinic/:clinicId/users')
@UseGuards(ClinicTenantGuard, JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ClinicUsersController {
  constructor(private readonly clinicUsersService: ClinicUsersService) {}

  @Post()
  @UseGuards(ClinicPermissionsGuard)
  @Permissions(ClinicPermission.CREATE_USER as string)
  @ApiOperation({ summary: 'Create a new clinic user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 409, description: 'Phone or email already exists' })
  create(
    @ClinicId() clinicId: number,
    @Body() createClinicUserDto: CreateClinicUserDto,
  ) {
    if (!clinicId) {
      throw new Error('Clinic ID is required');
    }
    return this.clinicUsersService.create(clinicId, createClinicUserDto);
  }

  @Get()
  @UseGuards(ClinicPermissionsGuard)
  @Permissions(ClinicPermission.READ_USER as string)
  @ApiOperation({
    summary: 'Get all clinic users with pagination',
    description: 'Supports search (name, email, phone) and filter by role_id.',
  })
  @ApiResponse({ status: 200, description: 'List of users' })
  findAll(
    @ClinicId() clinicId: number,
    @Query() query: ClinicUsersQueryDto,
  ) {
    if (!clinicId) {
      throw new Error('Clinic ID is required');
    }
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    return this.clinicUsersService.findAll(clinicId, page, limit, {
      search: query.search,
      role_id: query.role_id,
    });
  }

  @Get(':id')
  @UseGuards(ClinicPermissionsGuard)
  @Permissions(ClinicPermission.READ_USER as string)
  @ApiOperation({ summary: 'Get a clinic user by ID' })
  @ApiResponse({ status: 200, description: 'User found' })
  @ApiResponse({ status: 404, description: 'User not found' })
  findOne(
    @ClinicId() clinicId: number,
    @Param('id') id: string,
  ) {
    if (!clinicId) {
      throw new Error('Clinic ID is required');
    }
    return this.clinicUsersService.findOne(clinicId, +id);
  }

  @Patch(':id')
  @UseGuards(ClinicPermissionsGuard)
  @Permissions(ClinicPermission.UPDATE_USER as string)
  @ApiOperation({ summary: 'Update a clinic user' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'Phone or email already exists' })
  update(
    @ClinicId() clinicId: number,
    @Param('id') id: string,
    @Body() updateClinicUserDto: UpdateClinicUserDto,
  ) {
    if (!clinicId) {
      throw new Error('Clinic ID is required');
    }
    return this.clinicUsersService.update(clinicId, +id, updateClinicUserDto);
  }

  @Delete(':id')
  @UseGuards(ClinicPermissionsGuard)
  @Permissions(ClinicPermission.DELETE_USER as string)
  @ApiOperation({ summary: 'Delete a clinic user' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  remove(
    @ClinicId() clinicId: number,
    @Param('id') id: string,
  ) {
    if (!clinicId) {
      throw new Error('Clinic ID is required');
    }
    return this.clinicUsersService.remove(clinicId, +id);
  }
}

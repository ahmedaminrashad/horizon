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
} from '@nestjs/swagger';
import { ClinicUsersService } from './clinic-users.service';
import { CreateClinicUserDto } from './dto/create-clinic-user.dto';
import { UpdateClinicUserDto } from './dto/update-clinic-user.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ClinicTenantGuard } from '../guards/clinic-tenant.guard';
import { ClinicPermissionsGuard } from '../guards/clinic-permissions.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { ClinicPermission } from '../permissions/enums/clinic-permission.enum';

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
    @Param('clinicId') clinicId: string,
    @Body() createClinicUserDto: CreateClinicUserDto,
  ) {
    return this.clinicUsersService.create(+clinicId, createClinicUserDto);
  }

  @Get()
  @UseGuards(ClinicPermissionsGuard)
  @Permissions(ClinicPermission.READ_USER as string)
  @ApiOperation({ summary: 'Get all clinic users with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({ status: 200, description: 'List of users' })
  findAll(
    @Param('clinicId') clinicId: string,
    @Query() paginationQuery: PaginationQueryDto,
  ) {
    const page = paginationQuery.page || 1;
    const limit = paginationQuery.limit || 10;
    return this.clinicUsersService.findAll(+clinicId, page, limit);
  }

  @Get(':id')
  @UseGuards(ClinicPermissionsGuard)
  @Permissions(ClinicPermission.READ_USER as string)
  @ApiOperation({ summary: 'Get a clinic user by ID' })
  @ApiResponse({ status: 200, description: 'User found' })
  @ApiResponse({ status: 404, description: 'User not found' })
  findOne(
    @Param('clinicId') clinicId: string,
    @Param('id') id: string,
  ) {
    return this.clinicUsersService.findOne(+clinicId, +id);
  }

  @Patch(':id')
  @UseGuards(ClinicPermissionsGuard)
  @Permissions(ClinicPermission.UPDATE_USER as string)
  @ApiOperation({ summary: 'Update a clinic user' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'Phone or email already exists' })
  update(
    @Param('clinicId') clinicId: string,
    @Param('id') id: string,
    @Body() updateClinicUserDto: UpdateClinicUserDto,
  ) {
    return this.clinicUsersService.update(+clinicId, +id, updateClinicUserDto);
  }

  @Delete(':id')
  @UseGuards(ClinicPermissionsGuard)
  @Permissions(ClinicPermission.DELETE_USER as string)
  @ApiOperation({ summary: 'Delete a clinic user' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  remove(
    @Param('clinicId') clinicId: string,
    @Param('id') id: string,
  ) {
    return this.clinicUsersService.remove(+clinicId, +id);
  }
}

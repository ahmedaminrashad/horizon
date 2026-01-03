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
  ApiParam,
} from '@nestjs/swagger';
import { BranchesService } from './branches.service';
import { CreateClinicBranchDto } from './dto/create-branch.dto';
import { UpdateClinicBranchDto } from './dto/update-branch.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ClinicTenantGuard } from '../guards/clinic-tenant.guard';
import { ClinicPermissionsGuard } from '../guards/clinic-permissions.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { ClinicPermission } from '../permissions/enums/clinic-permission.enum';
import { ClinicId } from '../decorators/clinic-id.decorator';

@ApiTags('clinic/branches')
@Controller('clinic/:clinicId/branches')
@UseGuards(ClinicTenantGuard, JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Post()
  @UseGuards(ClinicPermissionsGuard)
  @Permissions(ClinicPermission.CREATE_BRANCH as string)
  @ApiOperation({ summary: 'Create a new branch' })
  @ApiParam({
    name: 'clinicId',
    type: Number,
    description: 'Clinic ID (can be from JWT token or route parameter)',
  })
  @ApiResponse({ status: 201, description: 'Branch created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  create(
    @Param('clinicId') clinicId: string,
    @ClinicId() clinicIdFromToken: number,
    @Body() createBranchDto: CreateClinicBranchDto,
  ) {
    const id = clinicIdFromToken || +clinicId;
    return this.branchesService.create(id, createBranchDto);
  }

  @Get()
  @UseGuards(ClinicPermissionsGuard)
  @Permissions(ClinicPermission.READ_BRANCH as string)
  @ApiOperation({ summary: 'Get all branches with pagination' })
  @ApiParam({
    name: 'clinicId',
    type: Number,
    description: 'Clinic ID (can be from JWT token or route parameter)',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({ status: 200, description: 'List of branches' })
  findAll(
    @Param('clinicId') clinicId: string,
    @ClinicId() clinicIdFromToken: number,
    @Query() paginationQuery: PaginationQueryDto,
  ) {
    const id = clinicIdFromToken || +clinicId;
    const page = paginationQuery.page || 1;
    const limit = paginationQuery.limit || 10;
    return this.branchesService.findAll(id, page, limit);
  }

  @Get(':id')
  @UseGuards(ClinicPermissionsGuard)
  @Permissions(ClinicPermission.READ_BRANCH as string)
  @ApiOperation({ summary: 'Get a branch by ID' })
  @ApiParam({
    name: 'clinicId',
    type: Number,
    description: 'Clinic ID (can be from JWT token or route parameter)',
  })
  @ApiResponse({ status: 200, description: 'Branch found' })
  @ApiResponse({ status: 404, description: 'Branch not found' })
  findOne(
    @Param('clinicId') clinicId: string,
    @Param('id') id: string,
    @ClinicId() clinicIdFromToken: number,
  ) {
    const clinicIdNum = clinicIdFromToken || +clinicId;
    return this.branchesService.findOne(clinicIdNum, +id);
  }

  @Patch(':id')
  @UseGuards(ClinicPermissionsGuard)
  @Permissions(ClinicPermission.UPDATE_BRANCH as string)
  @ApiOperation({ summary: 'Update a branch' })
  @ApiParam({
    name: 'clinicId',
    type: Number,
    description: 'Clinic ID (can be from JWT token or route parameter)',
  })
  @ApiResponse({ status: 200, description: 'Branch updated successfully' })
  @ApiResponse({ status: 404, description: 'Branch not found' })
  update(
    @Param('clinicId') clinicId: string,
    @Param('id') id: string,
    @ClinicId() clinicIdFromToken: number,
    @Body() updateBranchDto: UpdateClinicBranchDto,
  ) {
    const clinicIdNum = clinicIdFromToken || +clinicId;
    return this.branchesService.update(clinicIdNum, +id, updateBranchDto);
  }

  @Delete(':id')
  @UseGuards(ClinicPermissionsGuard)
  @Permissions(ClinicPermission.DELETE_BRANCH as string)
  @ApiOperation({ summary: 'Delete a branch' })
  @ApiParam({
    name: 'clinicId',
    type: Number,
    description: 'Clinic ID (can be from JWT token or route parameter)',
  })
  @ApiResponse({ status: 200, description: 'Branch deleted successfully' })
  @ApiResponse({ status: 404, description: 'Branch not found' })
  remove(
    @Param('clinicId') clinicId: string,
    @Param('id') id: string,
    @ClinicId() clinicIdFromToken: number,
  ) {
    const clinicIdNum = clinicIdFromToken || +clinicId;
    return this.branchesService.remove(clinicIdNum, +id);
  }
}

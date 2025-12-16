import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { ServicesService } from './services.service';
import { PaginationQueryDto } from './dto/pagination-query.dto';

@ApiTags('services')
@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all services with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({
    name: 'clinicId',
    required: false,
    type: Number,
    description: 'Filter by clinic ID',
    example: 1,
  })
  @ApiResponse({ status: 200, description: 'List of services' })
  findAll(
    @Query() paginationQuery: PaginationQueryDto,
    @Query('clinicId') clinicId?: string,
  ) {
    const page = paginationQuery.page || 1;
    const limit = paginationQuery.limit || 10;
    const clinicIdNum = clinicId ? +clinicId : undefined;
    return this.servicesService.findAll(page, limit, clinicIdNum);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a service by ID' })
  @ApiResponse({ status: 200, description: 'Service found' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  findOne(@Param('id') id: string) {
    return this.servicesService.findOne(+id);
  }
}

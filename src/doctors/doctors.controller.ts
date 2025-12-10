import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { DoctorsService } from './doctors.service';
import { PaginationQueryDto } from './dto/pagination-query.dto';

@ApiTags('doctors')
@Controller('doctors')
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all doctors with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({
    name: 'clinicId',
    required: false,
    type: Number,
    description: 'Filter by clinic ID',
    example: 1,
  })
  @ApiResponse({ status: 200, description: 'List of doctors' })
  findAll(
    @Query() paginationQuery: PaginationQueryDto,
    @Query('clinicId') clinicId?: string,
  ) {
    const page = paginationQuery.page || 1;
    const limit = paginationQuery.limit || 10;
    const clinicIdNum = clinicId ? +clinicId : undefined;
    return this.doctorsService.findAll(page, limit, clinicIdNum);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a doctor by ID' })
  @ApiResponse({ status: 200, description: 'Doctor found' })
  @ApiResponse({ status: 404, description: 'Doctor not found' })
  findOne(@Param('id') id: string) {
    return this.doctorsService.findOne(+id);
  }
}

import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DoctorsService } from './doctors.service';
import { PaginationQueryDto } from './dto/pagination-query.dto';

@ApiTags('doctors')
@Controller('doctors')
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all doctors with pagination' })
  @ApiResponse({ status: 200, description: 'List of doctors' })
  findAll(@Query() paginationQuery: PaginationQueryDto) {
    const page = paginationQuery.page || 1;
    const limit = paginationQuery.limit || 10;
    return this.doctorsService.findAll(
      page,
      limit,
      paginationQuery.clinicId as number | undefined,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a doctor by ID' })
  @ApiResponse({ status: 200, description: 'Doctor found' })
  @ApiResponse({ status: 404, description: 'Doctor not found' })
  findOne(@Param('id') id: string) {
    return this.doctorsService.findOne(+id);
  }

  @Get(':id/suggest-services')
  @ApiOperation({
    summary: 'Get suggested services for a doctor',
    description:
      "Retrieves all active services matching the doctor's specialty and degree",
  })
  @ApiResponse({
    status: 200,
    description: 'List of suggested services',
  })
  @ApiResponse({ status: 404, description: 'Doctor not found' })
  suggestServices(@Param('id', ParseIntPipe) id: number) {
    return this.doctorsService.suggestServices(id);
  }
}

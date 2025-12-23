import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { SearchQueryDto } from './dto/search-query.dto';
import { Public } from '../auth/decorators/public.decorator';
import { AppointType } from '../doctors/entities/doctor.entity';

@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @Public()
  @ApiOperation({
    summary: 'Smart search for doctors and clinics',
    description:
      'Search for doctors and clinics by name, specialty, service name, city, area, appointment type, language, and gender',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search term for doctor name, clinic name, specialty, or service name',
  })
  @ApiQuery({
    name: 'city_id',
    required: false,
    type: Number,
    description: 'City ID to filter results',
  })
  @ApiQuery({
    name: 'area_id',
    required: false,
    type: Number,
    description: 'Area/Branch ID to filter results',
  })
  @ApiQuery({
    name: 'appoint_type',
    required: false,
    enum: AppointType,
    description: 'Appointment type (in-clinic, online, home)',
  })
  @ApiQuery({
    name: 'language',
    required: false,
    type: String,
    description: 'Language spoken by doctor',
  })
  @ApiQuery({
    name: 'gender',
    required: false,
    type: String,
    description: 'Doctor gender',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of results per page',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Search results for doctors and clinics',
    schema: {
      type: 'object',
      properties: {
        doctors: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: { type: 'object' },
            },
            meta: {
              type: 'object',
              properties: {
                total: { type: 'number' },
                page: { type: 'number' },
                limit: { type: 'number' },
                totalPages: { type: 'number' },
                hasNextPage: { type: 'boolean' },
                hasPreviousPage: { type: 'boolean' },
              },
            },
          },
        },
        clinics: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: { type: 'object' },
            },
            meta: {
              type: 'object',
              properties: {
                total: { type: 'number' },
                page: { type: 'number' },
                limit: { type: 'number' },
                totalPages: { type: 'number' },
                hasNextPage: { type: 'boolean' },
                hasPreviousPage: { type: 'boolean' },
              },
            },
          },
        },
        meta: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            page: { type: 'number' },
            limit: { type: 'number' },
          },
        },
      },
    },
  })
  search(@Query() searchQuery: SearchQueryDto) {
    return this.searchService.search(searchQuery);
  }
}


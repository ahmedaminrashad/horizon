import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from './pagination-query.dto';

export class ClinicUsersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Search by name, email, or phone number',
    example: 'ahmed',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by role ID',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  role_id?: number;
}

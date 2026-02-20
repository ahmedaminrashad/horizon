import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/** Maximum allowed limit per page for clinic users list. */
export const CLINIC_USERS_PAGINATION_MAX_LIMIT = 100;

export class PaginationQueryDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    example: 10,
    default: 10,
    maximum: CLINIC_USERS_PAGINATION_MAX_LIMIT,
    description: `Items per page (max ${CLINIC_USERS_PAGINATION_MAX_LIMIT})`,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(CLINIC_USERS_PAGINATION_MAX_LIMIT, {
    message: `limit must not exceed ${CLINIC_USERS_PAGINATION_MAX_LIMIT}`,
  })
  limit?: number = 10;
}

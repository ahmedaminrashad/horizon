import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean, IsInt, Min } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class ClinicPatientsQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by phone (partial match). Legacy param.',
    example: '+123',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Search by name, phone, email, or patient ID',
    example: 'ahmed',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by active status (true/false, 1/0, or "true"/"false")',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true || value === 1 || value === '1') {
      return true;
    }
    if (value === 'false' || value === false || value === 0 || value === '0') {
      return false;
    }
    return undefined;
  })
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by clinic ID (overrides path clinicId when provided)',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  clinic_id?: number;

  @ApiPropertyOptional({
    description:
      'Filter to patients that have at least one reservation with this doctor (clinic doctor ID)',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  doctor_id?: number;

  @ApiPropertyOptional({ description: 'Page number for pagination (whitelisted)', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page (whitelisted)', example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({ description: 'Sort field (whitelisted, not yet applied)', example: 'createdAt' })
  @IsOptional()
  @IsString()
  sort?: string;

  @ApiPropertyOptional({ description: 'Sort order (whitelisted, not yet applied)', example: 'desc' })
  @IsOptional()
  @IsString()
  order?: string;
}

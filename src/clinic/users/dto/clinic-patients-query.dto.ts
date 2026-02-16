import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean } from 'class-validator';
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
    description: 'Filter by active status',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) =>
    value === 'true' || value === true
      ? true
      : value === 'false' || value === false
        ? false
        : undefined,
  )
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by clinic ID (overrides path clinicId when provided)',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  clinic_id?: number;
}

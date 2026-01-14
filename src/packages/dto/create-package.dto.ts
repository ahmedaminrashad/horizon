import { IsNumber, IsOptional, IsArray, IsBoolean, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePackageDto {
  @ApiProperty({ example: 'حزمة مميزة', description: 'Package name in Arabic' })
  @IsString()
  @IsOptional()
  name_ar?: string;

  @ApiPropertyOptional({ example: 'Premium Package', description: 'Package name in English' })
  @IsString()
  @IsOptional()
  name_en?: string;

  @ApiPropertyOptional({ example: 'هذه حزمة مميزة', description: 'Package content in Arabic' })
  @IsString()
  @IsOptional()
  content_ar?: string;

  @ApiPropertyOptional({ example: 'This is a premium package', description: 'Package content in English' })
  @IsString()
  @IsOptional()
  content_en?: string;

  @ApiProperty({ example: 99.99, description: 'Package monthly price' })
  @IsNumber()
  @Min(0)
  price_monthly: number;

  @ApiProperty({ example: 999.99, description: 'Package annual price' })
  @IsNumber()
  @Min(0)
  price_annual: number;

  @ApiPropertyOptional({
    description: 'Whether the package is featured',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  is_featured?: boolean;

  @ApiPropertyOptional({
    description: 'List of package features in Arabic',
    example: ['ميزة 1', 'ميزة 2', 'ميزة 3'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  features_ar?: string[];

  @ApiPropertyOptional({
    description: 'List of package features in English',
    example: ['Feature 1', 'Feature 2', 'Feature 3'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  features_en?: string[];
}

import { IsNumber, IsOptional, IsArray, ValidateNested, IsBoolean, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreatePackageTranslationDto } from './create-package-translation.dto';

export class CreatePackageDto {
  @ApiProperty({ example: 99.99, description: 'Package monthly price' })
  @IsNumber()
  @Min(0)
  price_monthly: number;

  @ApiProperty({ example: 999.99, description: 'Package annual price' })
  @IsNumber()
  @Min(0)
  price_annual: number;

  @ApiPropertyOptional({
    type: [CreatePackageTranslationDto],
    description: 'Package translations',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePackageTranslationDto)
  translations?: CreatePackageTranslationDto[];

  @ApiPropertyOptional({
    description: 'Whether the package is featured',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  is_featured?: boolean;

  @ApiPropertyOptional({
    description: 'List of package features',
    example: ['Feature 1', 'Feature 2', 'Feature 3'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  features?: string[];
}

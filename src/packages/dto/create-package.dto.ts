import { IsNumber, IsOptional, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreatePackageTranslationDto } from './create-package-translation.dto';

export class CreatePackageDto {
  @ApiProperty({ example: 99.99, description: 'Package cost' })
  @IsNumber()
  @Min(0)
  cost: number;

  @ApiPropertyOptional({
    type: [CreatePackageTranslationDto],
    description: 'Package translations',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePackageTranslationDto)
  translations?: CreatePackageTranslationDto[];
}

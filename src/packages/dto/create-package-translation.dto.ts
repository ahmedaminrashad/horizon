import { IsString, IsNotEmpty, IsOptional, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePackageTranslationDto {
  @ApiProperty({ example: 'en', description: 'Language code' })
  @IsString()
  @IsNotEmpty()
  @Length(2, 10)
  lang: string;

  @ApiProperty({ example: 'Premium Package', description: 'Package name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    example: 'This is a premium package with all features',
    description: 'Package content/description',
  })
  @IsOptional()
  @IsString()
  content?: string;
}

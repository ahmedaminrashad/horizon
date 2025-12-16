import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateCountryDto {
  @ApiProperty({ description: 'Country name in English', example: 'Egypt' })
  @IsString()
  @IsNotEmpty()
  name_en: string;

  @ApiProperty({ description: 'Country name in Arabic', example: 'مصر' })
  @IsString()
  @IsNotEmpty()
  name_ar: string;
}


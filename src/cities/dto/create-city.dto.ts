import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber } from 'class-validator';

export class CreateCityDto {
  @ApiProperty({ description: 'City name in English', example: 'Cairo' })
  @IsString()
  @IsNotEmpty()
  name_en: string;

  @ApiProperty({ description: 'City name in Arabic', example: 'القاهرة' })
  @IsString()
  @IsNotEmpty()
  name_ar: string;

  @ApiProperty({ description: 'Country ID', example: 1 })
  @IsNumber()
  @IsNotEmpty()
  country_id: number;
}


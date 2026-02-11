import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class CreateDoctorFileDto {
  @ApiPropertyOptional({
    description: 'Original file name',
    example: 'license.pdf',
  })
  @IsOptional()
  @IsString()
  file_name?: string;

  @ApiPropertyOptional({
    description: 'File type/category (e.g. certificate, license, other)',
    example: 'certificate',
  })
  @IsOptional()
  @IsString()
  file_type?: string;
}

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';

export class UpdateClinicIvrDto {
  @ApiPropertyOptional({
    description: 'Welcome message audio file (Arabic)',
    type: 'string',
    format: 'binary',
  })
  @IsOptional()
  welcome_ar?: Express.Multer.File;

  @ApiPropertyOptional({
    description: 'Welcome message audio file (English)',
    type: 'string',
    format: 'binary',
  })
  @IsOptional()
  welcome_en?: Express.Multer.File;

  @ApiPropertyOptional({
    description: 'Main menu audio file (Arabic)',
    type: 'string',
    format: 'binary',
  })
  @IsOptional()
  main_menu_ar?: Express.Multer.File;

  @ApiPropertyOptional({
    description: 'Main menu audio file (English)',
    type: 'string',
    format: 'binary',
  })
  @IsOptional()
  main_menu_en?: Express.Multer.File;

  @ApiPropertyOptional({
    description: 'Invalid option audio file (Arabic)',
    type: 'string',
    format: 'binary',
  })
  @IsOptional()
  invalid_ar?: Express.Multer.File;

  @ApiPropertyOptional({
    description: 'Invalid option audio file (English)',
    type: 'string',
    format: 'binary',
  })
  @IsOptional()
  invalid_en?: Express.Multer.File;

  @ApiPropertyOptional({
    description: 'Timeout message audio file (Arabic)',
    type: 'string',
    format: 'binary',
  })
  @IsOptional()
  timeout_ar?: Express.Multer.File;

  @ApiPropertyOptional({
    description: 'Timeout message audio file (English)',
    type: 'string',
    format: 'binary',
  })
  @IsOptional()
  timeout_en?: Express.Multer.File;

  @ApiPropertyOptional({
    description: 'Please select option audio file (Arabic)',
    type: 'string',
    format: 'binary',
  })
  @IsOptional()
  please_select_ar?: Express.Multer.File;

  @ApiPropertyOptional({
    description: 'Please select option audio file (English)',
    type: 'string',
    format: 'binary',
  })
  @IsOptional()
  please_select_en?: Express.Multer.File;

  @ApiPropertyOptional({
    description: 'Services audio file (Arabic)',
    type: 'string',
    format: 'binary',
  })
  @IsOptional()
  services_ar?: Express.Multer.File;

  @ApiPropertyOptional({
    description: 'Services audio file (English)',
    type: 'string',
    format: 'binary',
  })
  @IsOptional()
  services_en?: Express.Multer.File;

  @ApiPropertyOptional({
    description: 'Opening hours audio file (Arabic)',
    type: 'string',
    format: 'binary',
  })
  @IsOptional()
  opening_hours_ar?: Express.Multer.File;

  @ApiPropertyOptional({
    description: 'Opening hours audio file (English)',
    type: 'string',
    format: 'binary',
  })
  @IsOptional()
  opening_hours_en?: Express.Multer.File;

  @ApiPropertyOptional({
    description: 'Goodbye message audio file (Arabic)',
    type: 'string',
    format: 'binary',
  })
  @IsOptional()
  goodbye_ar?: Express.Multer.File;

  @ApiPropertyOptional({
    description: 'Goodbye message audio file (English)',
    type: 'string',
    format: 'binary',
  })
  @IsOptional()
  goodbye_en?: Express.Multer.File;
}

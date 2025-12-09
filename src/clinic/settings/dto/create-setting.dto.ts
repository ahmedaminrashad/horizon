import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSettingDto {
  @ApiPropertyOptional({ type: 'string', format: 'binary', description: 'Logo file' })
  @IsOptional()
  logo?: string;

  @ApiPropertyOptional({ example: 'عنوان التطبيق', description: 'Arabic title' })
  @IsOptional()
  @IsString()
  title_ar?: string;

  @ApiPropertyOptional({ example: 'App Title', description: 'English title' })
  @IsOptional()
  @IsString()
  title_en?: string;

  @ApiPropertyOptional({ example: '1.0.0', description: 'Android app version' })
  @IsOptional()
  @IsString()
  android_version?: string;

  @ApiPropertyOptional({ example: '1.0.0', description: 'iOS app version' })
  @IsOptional()
  @IsString()
  ios_version?: string;

  @ApiPropertyOptional({ example: '#FF5733', description: 'Primary color' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ example: 'light', description: 'Theme (light/dark)' })
  @IsOptional()
  @IsString()
  theme?: string;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateClinicPermissionDto {
  @ApiProperty({ description: 'Permission name', example: 'Create User' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Permission description',
    example: 'Allows creating new users',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Permission slug', example: 'create-user' })
  @IsString()
  @IsNotEmpty()
  slug: string;
}

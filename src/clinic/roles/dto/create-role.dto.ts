import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsNumber,
} from 'class-validator';

export class CreateClinicRoleDto {
  @ApiProperty({ description: 'Role name', example: 'Admin' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Role description',
    example: 'Administrator role with full access',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Role slug', example: 'admin' })
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiPropertyOptional({
    description: 'Permission IDs',
    example: [1, 2, 3],
    type: [Number],
  })
  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  permissionIds?: number[];
}

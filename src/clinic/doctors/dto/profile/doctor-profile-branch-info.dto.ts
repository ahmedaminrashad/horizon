import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DoctorProfileBranchInfoDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Main Branch' })
  name: string;

  @ApiPropertyOptional({ example: '123 Main St' })
  address?: string;

  @ApiPropertyOptional({ example: 31.2 })
  lat?: number;

  @ApiPropertyOptional({ example: 29.9 })
  longit?: number;
}

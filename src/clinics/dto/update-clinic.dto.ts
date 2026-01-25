import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { CreateClinicDto } from './create-clinic.dto';

export class UpdateClinicDto extends PartialType(CreateClinicDto) {
  @ApiPropertyOptional({
    description: 'Reason for deactivating the clinic (required when is_active is false)',
    example: 'Clinic closed due to renovation',
  })
  @IsOptional()
  @IsString()
  deactivate_reason?: string | null;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class AddClinicPatientDto {
  @ApiProperty({ description: 'Main user (patient) ID to link to the clinic', example: 1 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  user_id: number;
}

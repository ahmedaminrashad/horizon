import { ApiProperty } from '@nestjs/swagger';

export class DoctorProfileServiceInfoDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Consultation' })
  name: string;
}

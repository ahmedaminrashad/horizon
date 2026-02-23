import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DoctorProfileServiceInfoDto } from './doctor-profile-service-info.dto';
import { DoctorProfileWorkingHourDto } from './doctor-profile-working-hour.dto';

export class DoctorProfileServiceDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  doctor_id: number;

  @ApiProperty({ example: 1 })
  service_id: number;

  @ApiPropertyOptional({ nullable: true, example: 30 })
  duration: number | null;

  @ApiPropertyOptional({ nullable: true, example: 100 })
  price: number | null;

  @ApiPropertyOptional({ nullable: true, example: 'consultation' })
  service_type: string | null;

  @ApiPropertyOptional({ type: () => DoctorProfileServiceInfoDto })
  service?: DoctorProfileServiceInfoDto;

  @ApiProperty({ type: [DoctorProfileWorkingHourDto] })
  working_hours: DoctorProfileWorkingHourDto[];
}

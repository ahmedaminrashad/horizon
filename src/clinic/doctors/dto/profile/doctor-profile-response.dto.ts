import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Doctor } from '../../entities/doctor.entity';
import { DoctorProfileBranchDto } from './doctor-profile-branch.dto';
import { DoctorProfileServiceDto } from './doctor-profile-service.dto';
import { DoctorProfileNextReservationDto } from './doctor-profile-next-reservation.dto';

export class DoctorProfileResponseDto {
  @ApiProperty({ description: 'Doctor with user (password stripped)' })
  doctor: Doctor;

  @ApiProperty({
    type: [DoctorProfileBranchDto],
    description: 'Branches linked to this doctor',
  })
  branches: DoctorProfileBranchDto[];

  @ApiProperty({
    type: [DoctorProfileServiceDto],
    description: 'Services with working hours',
  })
  services: DoctorProfileServiceDto[];

  @ApiProperty({
    example: 42,
    description: 'Number of distinct patients',
  })
  number_of_patients: number;

  @ApiProperty({
    example: 150,
    description: 'Total number of reservations (all time)',
  })
  total_reservations: number;

  @ApiProperty({
    example: 12,
    description: 'Total upcoming reservations (date >= today, not cancelled)',
  })
  total_upcoming_reservations: number;

  @ApiPropertyOptional({
    type: () => DoctorProfileNextReservationDto,
    nullable: true,
    description: 'Next upcoming reservation (date >= today, not cancelled)',
  })
  next_reservation: DoctorProfileNextReservationDto | null;
}

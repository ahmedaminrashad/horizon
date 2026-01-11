import { IsInt, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMainUserReservationDto {
  @ApiProperty({ example: 1, description: 'Clinic ID' })
  @IsInt()
  clinic_id: number;

  @ApiProperty({ example: 1, description: 'Doctor ID' })
  @IsInt()
  doctor_id: number;

  @ApiProperty({
    example: 1,
    description: 'Doctor working hour ID (required)',
  })
  @IsInt()
  doctor_working_hour_id: number;

  @ApiProperty({
    example: '2024-01-15',
    description: 'Reservation date (time will be taken from working hour)',
  })
  @IsDateString()
  date: string;
}

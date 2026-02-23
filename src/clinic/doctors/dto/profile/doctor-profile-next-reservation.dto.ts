import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DoctorProfileNextReservationBranchDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Main Branch' })
  name: string;
}

export class DoctorProfileNextReservationDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: '2025-02-15', description: 'Date (YYYY-MM-DD)' })
  date: string;

  @ApiPropertyOptional({ nullable: true, example: '09:00:00' })
  time: string | null;

  @ApiProperty({
    description: 'Time range from working hour',
    example: { from: '09:00:00', to: '09:30:00' },
  })
  time_range: { from: string | null; to: string | null };

  @ApiProperty({ example: 1 })
  patient_id: number;

  @ApiPropertyOptional({ nullable: true, example: 'Ahmed Mohamed' })
  patient_name: string | null;

  @ApiProperty({ example: 'pending' })
  status: string;

  @ApiProperty({ example: 100 })
  fees: number;

  @ApiProperty({ example: false })
  paid: boolean;

  @ApiPropertyOptional({ nullable: true, example: 'in-clinic' })
  appoint_type: string | null;

  @ApiPropertyOptional({ type: () => DoctorProfileNextReservationBranchDto })
  branch?: DoctorProfileNextReservationBranchDto;
}

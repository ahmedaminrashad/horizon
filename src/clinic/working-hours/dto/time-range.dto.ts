import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, IsNotEmpty } from 'class-validator';

/**
 * Time range DTO for working hours and breaks
 * Validates time format (HH:MM:SS)
 */
export class TimeRangeDto {
  @ApiProperty({
    description: 'Start time in HH:MM:SS format',
    example: '09:00:00',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/, {
    message: 'start_time must be in HH:MM:SS format',
  })
  start_time: string;

  @ApiProperty({
    description: 'End time in HH:MM:SS format',
    example: '17:00:00',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/, {
    message: 'end_time must be in HH:MM:SS format',
  })
  end_time: string;
}


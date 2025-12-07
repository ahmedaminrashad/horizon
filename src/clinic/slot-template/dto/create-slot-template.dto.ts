import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsNotEmpty, Matches } from 'class-validator';

export class CreateSlotTemplateDto {
  @ApiProperty({
    description: 'Duration of the slot in TIME format (HH:MM:SS)',
    example: '00:30:00',
    pattern: '^([0-1]\\d|2[0-3]):[0-5]\\d:[0-5]\\d$',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^([0-1]\d|2[0-3]):[0-5]\d:[0-5]\d$/, {
    message: 'Duration must be in TIME format (HH:MM:SS)',
  })
  duration: string;

  @ApiProperty({
    description: 'Cost of the slot',
    example: 100.50,
    type: Number,
  })
  @IsNumber()
  @IsNotEmpty()
  cost: number;

  @ApiProperty({
    description: 'Days of the week (comma-separated: MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY,SATURDAY,SUNDAY)',
    example: 'MONDAY,TUESDAY,WEDNESDAY',
  })
  @IsString()
  @IsNotEmpty()
  days: string;

  @ApiProperty({
    description: 'Doctor ID that owns this slot template',
    example: 1,
    type: Number,
  })
  @IsNumber()
  @IsNotEmpty()
  doctor_id: number;
}

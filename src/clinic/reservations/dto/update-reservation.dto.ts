import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, Min } from 'class-validator';
import { PartialType } from '@nestjs/swagger';
import { CreateReservationDto } from './create-reservation.dto';

export class UpdateReservationDto extends PartialType(CreateReservationDto) {
  @ApiPropertyOptional({ description: 'Reservation fees', example: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  fees?: number;
}

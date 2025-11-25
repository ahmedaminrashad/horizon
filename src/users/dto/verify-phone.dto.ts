import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class VerifyPhoneDto {
  @ApiProperty({
    description: 'Phone number to verify',
    example: '+1234567890',
  })
  @IsString()
  @IsNotEmpty()
  phone: string;
}


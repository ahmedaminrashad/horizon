import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';

export class ForgotPasswordDto {
  @ApiProperty({
    description: 'Phone number of the main user (used for login)',
    example: '+1234567890',
  })
  @IsString()
  @IsNotEmpty({ message: 'phone is required' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  phone: string;
}

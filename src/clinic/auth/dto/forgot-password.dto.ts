import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';

export class ForgotPasswordDto {
  @ApiProperty({
    description: 'Email of the clinic user to send reset link',
    example: 'user@clinic.com',
  })
  @IsString()
  @IsNotEmpty({ message: 'email is required' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  email: string;
}

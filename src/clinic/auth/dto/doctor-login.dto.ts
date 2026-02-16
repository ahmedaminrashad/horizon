import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class DoctorLoginDto {
  @ApiProperty({
    description: 'User name: email or phone',
    example: 'doctor@clinic.com',
  })
  @IsString()
  @IsNotEmpty()
  user_name: string;

  @ApiProperty({ description: 'Password', example: 'password123' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

/** Password: 8–128 chars, at least one uppercase, one lowercase, one digit, one special character. */
const PASSWORD_PATTERN =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_])[A-Za-z\d\W_]{8,128}$/;

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Phone number used with forgot-password (same account)',
    example: '+966501234567',
  })
  @IsString()
  @IsNotEmpty({ message: 'phone is required' })
  phone: string;

  @ApiProperty({
    description: '6-digit code from the reset email',
    example: '482913',
  })
  @IsString()
  @IsNotEmpty({ message: 'code is required' })
  @Matches(/^\d{6}$/, { message: 'code must be exactly 6 digits' })
  code: string;

  @ApiProperty({
    description:
      'New password (8–128 chars, uppercase, lowercase, digit, special character)',
    example: 'NewSecureP@ss1',
    minLength: 8,
    maxLength: 128,
  })
  @IsString()
  @IsNotEmpty({ message: 'new_password is required' })
  @MinLength(8, {
    message: 'new_password must be at least 8 characters',
  })
  @MaxLength(128, {
    message: 'new_password must be at most 128 characters',
  })
  @Matches(PASSWORD_PATTERN, {
    message:
      'new_password must include uppercase, lowercase, number and special character',
  })
  new_password: string;
}

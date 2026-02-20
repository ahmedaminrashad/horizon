import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsNumber,
  MinLength,
  Matches,
  MaxLength,
} from 'class-validator';

/** Name: letters, spaces, hyphen, apostrophe only (no emojis or special characters). */
export const NAME_PATTERN = /^[a-zA-Z\s'-]+$/;

/** Phone: must start with + (country code), then digits/spaces/hyphens/parentheses, 10–30 chars total. */
export const PHONE_PATTERN = /^\+[\d\s\-()]+$/;

/** Trim string for validation and persistence (exported for update DTO). */
export const trimString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : (value as string);

/** Password: 8–128 chars, at least one uppercase, one lowercase, one digit, one special character. */
const PASSWORD_PATTERN =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_])[A-Za-z\d\W_]{8,128}$/;

export class CreateClinicUserDto {
  @ApiProperty({
    description:
      'User name (3–255 characters; letters, spaces, hyphen, apostrophe only)',
    example: 'John Doe',
    minLength: 3,
    maxLength: 255,
  })
  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty({ message: 'name is required' })
  @MinLength(3, {
    message: 'name must be at least 3 characters',
  })
  @MaxLength(255, {
    message: 'name must be at most 255 characters',
  })
  @Matches(NAME_PATTERN, {
    message: 'name must contain only letters, spaces, hyphen and apostrophe',
  })
  name: string;

  @ApiProperty({
    description: 'Phone with country code (e.g. +1234567890); 10–30 characters',
    example: '+1234567890',
    minLength: 10,
    maxLength: 30,
  })
  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty({ message: 'phone is required' })
  @MinLength(10, {
    message:
      'phone must be at least 10 characters (include country code, e.g. +1234567890)',
  })
  @MaxLength(30, {
    message: 'phone must be at most 30 characters',
  })
  @Matches(PHONE_PATTERN, {
    message:
      'phone must start with + (country code) and contain only digits, spaces, hyphens, parentheses',
  })
  phone: string;

  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @Transform(({ value }) => trimString(value))
  @IsEmail({}, { message: 'email must be a valid email address' })
  @IsNotEmpty({ message: 'email is required' })
  email: string;

  @ApiProperty({
    description:
      'Password: 8–128 characters, at least one uppercase, one lowercase, one digit, one special character',
    example: 'SecurePass1!',
    minLength: 8,
    maxLength: 128,
  })
  @IsString()
  @IsNotEmpty({ message: 'password is required' })
  @MinLength(8, {
    message: 'password must be at least 8 characters',
  })
  @MaxLength(128, {
    message: 'password must be at most 128 characters',
  })
  @Matches(PASSWORD_PATTERN, {
    message:
      'password must include at least one uppercase letter, one lowercase letter, one number, and one special character (e.g. !@#$%^&*)',
  })
  password: string;

  @ApiProperty({ description: 'Role ID', example: 1 })
  @IsNumber()
  @IsNotEmpty({ message: 'role_id is required' })
  role_id: number;
}

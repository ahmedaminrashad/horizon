import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsOptional,
  IsNumber,
  MinLength,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';

/** Name: letters, spaces, hyphen, apostrophe only (no emojis or special characters). */
const NAME_PATTERN = /^[a-zA-Z\s'-]+$/;

export class CreateClinicUserDto {
  @ApiPropertyOptional({
    description: 'User name (letters, spaces, hyphen, apostrophe only)',
    example: 'John Doe',
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  @ValidateIf((o) => o.name != null && o.name !== '')
  @Matches(NAME_PATTERN, {
    message: 'name must contain only letters, spaces, hyphen and apostrophe',
  })
  name?: string;

  @ApiProperty({ description: 'User phone number', example: '+1234567890' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiPropertyOptional({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({
    description: 'User password',
    example: 'password123',
    minLength: 6,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ description: 'Role ID', example: 1 })
  @IsNumber()
  @IsOptional()
  role_id?: number;
}

import { ApiPropertyOptional } from '@nestjs/swagger';
import { PartialType } from '@nestjs/swagger';
import { OmitType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsString,
  IsOptional,
  MinLength,
  Matches,
  MaxLength,
} from 'class-validator';
import {
  CreateClinicUserDto,
  NAME_PATTERN,
  PHONE_PATTERN,
  trimString,
} from './create-clinic-user.dto';

export class UpdateClinicUserDto extends PartialType(
  OmitType(CreateClinicUserDto, ['name', 'phone'] as const),
) {
  @ApiPropertyOptional({
    description:
      'User name (3–255 characters; letters, spaces, hyphen, apostrophe only)',
    example: 'John Doe',
    minLength: 3,
    maxLength: 255,
  })
  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MinLength(3, { message: 'name must be at least 3 characters' })
  @MaxLength(255, { message: 'name must be at most 255 characters' })
  @Matches(NAME_PATTERN, {
    message: 'name must contain only letters, spaces, hyphen and apostrophe',
  })
  name?: string;

  @ApiPropertyOptional({
    description: 'Phone with country code (e.g. +1234567890); 10–30 characters',
    example: '+1234567890',
    minLength: 10,
    maxLength: 30,
  })
  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MinLength(10, {
    message:
      'phone must be at least 10 characters (include country code, e.g. +1234567890)',
  })
  @MaxLength(30, { message: 'phone must be at most 30 characters' })
  @Matches(PHONE_PATTERN, {
    message:
      'phone must start with + (country code) and contain only digits, spaces, hyphens, parentheses',
  })
  phone?: string;
}

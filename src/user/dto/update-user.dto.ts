import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  IsBoolean,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../common/enums/role.enum.js';
import { EMAIL_INVALID } from '../../common/message.js';

export class UpdateUserDto {
  @ApiPropertyOptional({
    example: 'John Doe',
    description: 'Updated full name of the user',
  })
  @IsOptional()
  @IsString({ message: 'name must be a string' })
  name?: string;

  @ApiPropertyOptional({
    example: 'john@example.com',
    description: 'Updated email address of the user',
  })
  @IsOptional()
  @IsEmail({}, { message: EMAIL_INVALID })
  email?: string;

  @ApiPropertyOptional({
    example: '+919876543210',
    description: 'Updated mobile phone number of the user',
  })
  @IsOptional()
  @IsString({ message: 'mobile must be a string' })
  mobile?: string;

  @ApiPropertyOptional({
    example: 'NewPassword@123',
    description: 'Updated password (minimum 6 characters)',
  })
  @IsOptional()
  @IsString({ message: 'password must be a string' })
  @MinLength(6, { message: 'password must be at least 6 characters long' })
  password?: string;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Updated profile picture file to upload (form-data)',
  })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  profile_picture?: any;

  @ApiPropertyOptional({
    enum: UserRole,
    description: 'Updated role of the user',
  })
  @IsOptional()
  @IsEnum(UserRole, { message: 'role must be a valid UserRole' })
  role?: UserRole;

  @ApiPropertyOptional({
    example: true,
    description: 'Updated account active status',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean({ message: 'is_active must be a boolean' })
  is_active?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Updated login status of the user',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean({ message: 'has_login must be a boolean' })
  has_login?: boolean;

  @ApiPropertyOptional({
    example: 'dK9...',
    description: 'FCM device token for push notifications',
  })
  @IsOptional()
  @IsString({ message: 'fcm_token must be a string' })
  fcm_token?: string;
}

import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  IsBoolean,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../common/enums/role.enum.js';
import { EMAIL_INVALID, EMAIL_REQUIRED } from '../../common/message.js';

export class CreateUserDto {
  @ApiProperty({
    example: 'John Doe',
    description: 'Full name of the user',
  })
  @IsString({ message: 'name must be a string' })
  @IsNotEmpty({ message: 'name should not be empty' })
  name: string;

  @ApiProperty({
    example: 'john@example.com',
    description: 'Email address of the user',
  })
  @IsEmail({}, { message: EMAIL_INVALID })
  @IsNotEmpty({ message: EMAIL_REQUIRED })
  email: string;

  @ApiProperty({
    example: '+919876543210',
    description: 'Mobile phone number of the user',
  })
  @IsString({ message: 'mobile must be a string' })
  @IsNotEmpty({ message: 'mobile should not be empty' })
  mobile: string;

  @ApiPropertyOptional({
    example: 'Password@123',
    description: 'User password (optional, user can set on first login)',
  })
  @IsOptional()
  @IsString({ message: 'password must be a string' })
  @MinLength(6, { message: 'password must be at least 6 characters long' })
  password?: string;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Profile picture file to upload (form-data)',
  })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  profile_picture?: any;

  @ApiPropertyOptional({
    enum: UserRole,
    default: UserRole.USER,
    description: 'Role assigned to the user',
  })
  @IsOptional()
  @IsEnum(UserRole, { message: 'role must be a valid UserRole' })
  role?: UserRole;

  @ApiPropertyOptional({
    default: true,
    description: 'Account active status',
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
    default: false,
    description: 'Login status (false until first successful login)',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean({ message: 'has_login must be a boolean' })
  has_login?: boolean;
}

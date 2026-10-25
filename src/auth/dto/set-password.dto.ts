import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import {
  EMAIL_INVALID,
  EMAIL_REQUIRED,
  PASSWORD_STRING,
  PASSWORD_REQUIRED,
} from '../../common/message.js';

export class SetPasswordDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Email address of the user',
  })
  @IsEmail({}, { message: EMAIL_INVALID })
  @IsNotEmpty({ message: EMAIL_REQUIRED })
  email: string;

  @ApiProperty({
    example: 'NewPassword@123',
    description:
      'New password to set for the user account (minimum 6 characters)',
  })
  @IsString({ message: PASSWORD_STRING })
  @IsNotEmpty({ message: PASSWORD_REQUIRED })
  @MinLength(6, { message: 'password must be at least 6 characters long' })
  new_password: string;
}

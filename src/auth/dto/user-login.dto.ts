import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import {
  EMAIL_INVALID,
  EMAIL_REQUIRED,
  PASSWORD_STRING,
  PASSWORD_REQUIRED,
} from '../../common/message.js';

export class UserLoginDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
  })
  @IsEmail({}, { message: EMAIL_INVALID })
  @IsNotEmpty({ message: EMAIL_REQUIRED })
  email: string;

  @ApiProperty({
    example: 'Password@123',
    description: 'User password',
  })
  @IsString({ message: PASSWORD_STRING })
  @IsNotEmpty({ message: PASSWORD_REQUIRED })
  password: string;
}

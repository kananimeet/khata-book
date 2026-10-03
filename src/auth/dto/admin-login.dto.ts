import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import {
  EMAIL_INVALID,
  EMAIL_REQUIRED,
  PASSWORD_STRING,
  PASSWORD_REQUIRED,
} from '../../common/message.js';

export class AdminLoginDto {
  @ApiProperty({
    example: 'admin@khatabook.com',
    description: 'Admin email address',
  })
  @IsEmail({}, { message: EMAIL_INVALID })
  @IsNotEmpty({ message: EMAIL_REQUIRED })
  email: string;

  @ApiProperty({
    example: 'Admin@123',
    description: 'Admin password',
  })
  @IsString({ message: PASSWORD_STRING })
  @IsNotEmpty({ message: PASSWORD_REQUIRED })
  password: string;
}

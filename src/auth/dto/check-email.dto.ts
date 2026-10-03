import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { EMAIL_INVALID, EMAIL_REQUIRED } from '../../common/message.js';

export class CheckEmailDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Email address of the user to check login/password status',
  })
  @IsEmail({}, { message: EMAIL_INVALID })
  @IsNotEmpty({ message: EMAIL_REQUIRED })
  email: string;
}

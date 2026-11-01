import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateFcmTokenDto {
  @ApiProperty({
    example: 'dK9xYz123...',
    description: 'FCM device registration token for push notifications',
  })
  @IsNotEmpty({ message: 'fcm_token is required' })
  @IsString({ message: 'fcm_token must be a string' })
  fcm_token: string;
}

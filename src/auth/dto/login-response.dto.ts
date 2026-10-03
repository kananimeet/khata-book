import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../common/enums/role.enum.js';

export class UserResponseDto {
  @ApiProperty({ example: '7b8e1f0e-384f-4d9d-80f4-5fca0835e5d1' })
  id: string;

  @ApiProperty({ example: 'Super Admin' })
  name: string;

  @ApiProperty({ example: 'admin@khatabook.com' })
  email: string;

  @ApiProperty({ enum: UserRole, example: UserRole.ADMIN })
  role: UserRole;

  @ApiProperty({ example: true, description: 'Login status (true after first successful login)' })
  has_login: boolean;
}

export class LoginResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  access_token: string;

  @ApiProperty({ example: true, description: 'Login status (true after first successful login)' })
  has_login: boolean;

  @ApiProperty({ type: UserResponseDto })
  user: UserResponseDto;
}

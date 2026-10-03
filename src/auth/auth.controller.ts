import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service.js';
import { AdminLoginDto } from './dto/admin-login.dto.js';
import { UserLoginDto } from './dto/user-login.dto.js';
import { CheckEmailDto } from './dto/check-email.dto.js';
import { SetPasswordDto } from './dto/set-password.dto.js';
import { LoginResponseDto } from './dto/login-response.dto.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('admin/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin login' })
  @ApiResponse({
    status: 200,
    description: 'Admin login successful',
    type: LoginResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials',
  })
  async adminLogin(@Body() dto: AdminLoginDto) {
    return this.authService.adminLogin(dto);
  }

  @Post('check-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Check user email and password setup status',
    description:
      'Checks if a user exists and if their password is already set. Ideal for frontend 2-step login.',
  })
  @ApiResponse({
    status: 200,
    description: 'Email status checked successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async checkEmail(@Body() dto: CheckEmailDto) {
    return this.authService.checkEmail(dto);
  }

  @Post('set-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'First-time password setup & auto login',
    description:
      'Allows a newly created user (with no initial password) to set their password and get an access token.',
  })
  @ApiResponse({
    status: 200,
    description: 'Password set successfully and logged in',
  })
  @ApiResponse({
    status: 400,
    description: 'Password already set or validation failed',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async setPassword(@Body() dto: SetPasswordDto) {
    return this.authService.setPassword(dto);
  }

  @Post('user/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'User login with email and password',
    description: 'Authenticate an active user with email and password.',
  })
  @ApiResponse({
    status: 200,
    description: 'User login successful',
  })
  @ApiResponse({
    status: 400,
    description: 'Password not set yet',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials',
  })
  async userLogin(@Body() dto: UserLoginDto) {
    return this.authService.userLogin(dto);
  }
}

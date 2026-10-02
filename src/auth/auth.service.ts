import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserService } from '../user/user.service.js';
import { AdminLoginDto } from './dto/admin-login.dto.js';
import { UserRole } from '../common/enums/role.enum.js';
import { JwtPayload } from './strategies/jwt.strategy.js';
import { INVALID_CREDENTIALS, LOGIN_SUCCESS } from '../common/message.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async adminLogin(dto: AdminLoginDto) {
    const genericErrorMessage = INVALID_CREDENTIALS;

    const user = await this.userService.findForAuthByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException(genericErrorMessage);
    }

    if (user.role !== UserRole.ADMIN) {
      throw new UnauthorizedException(genericErrorMessage);
    }

    if (!user.is_active) {
      throw new UnauthorizedException(genericErrorMessage);
    }

    if (!user.password) {
      throw new UnauthorizedException(genericErrorMessage);
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException(genericErrorMessage);
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const access_token = await this.jwtService.signAsync(payload);

    return {
      message: LOGIN_SUCCESS,
      access_token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }
}

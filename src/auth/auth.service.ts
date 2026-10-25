import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserService } from '../user/user.service.js';
import { AdminLoginDto } from './dto/admin-login.dto.js';
import { UserLoginDto } from './dto/user-login.dto.js';
import { CheckEmailDto } from './dto/check-email.dto.js';
import { SetPasswordDto } from './dto/set-password.dto.js';
import { UserRole } from '../common/enums/role.enum.js';
import { JwtPayload } from './strategies/jwt.strategy.js';
import {
  INVALID_CREDENTIALS,
  LOGIN_SUCCESS,
  USER_LOGIN_SUCCESS,
  PASSWORD_NOT_SET,
  PASSWORD_ALREADY_SET,
  PASSWORD_SET_SUCCESS,
  EMAIL_CHECKED_SUCCESS,
  USER_NOT_FOUND,
  USER_INACTIVE,
} from '../common/message.js';

const BCRYPT_SALT_ROUNDS = 10;

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

    if (!user.has_login) {
      await this.userService.updateHasLogin(user.id, true);
      user.has_login = true;
    }

    if (dto.fcm_token) {
      await this.userService.updateFcmToken(user.id, dto.fcm_token);
      user.fcm_token = dto.fcm_token;
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
      has_login: user.has_login,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        has_login: user.has_login,
      },
    };
  }

  async checkEmail(dto: CheckEmailDto) {
    const user = await this.userService.findForAuthByEmail(dto.email);
    if (!user) {
      throw new NotFoundException(USER_NOT_FOUND(dto.email));
    }

    if (!user.is_active) {
      throw new UnauthorizedException(USER_INACTIVE);
    }

    return {
      message: EMAIL_CHECKED_SUCCESS,
      exists: true,
      is_password_set: !!user.password,
      has_login: user.has_login ?? false,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        profile_picture: user.profile_picture ?? null,
        has_login: user.has_login ?? false,
      },
    };
  }

  async setPassword(dto: SetPasswordDto) {
    const user = await this.userService.findForAuthByEmail(dto.email);
    if (!user) {
      throw new NotFoundException(USER_NOT_FOUND(dto.email));
    }

    if (!user.is_active) {
      throw new UnauthorizedException(USER_INACTIVE);
    }

    if (user.password) {
      throw new BadRequestException(PASSWORD_ALREADY_SET);
    }

    const hashedPassword = await bcrypt.hash(
      dto.new_password,
      BCRYPT_SALT_ROUNDS,
    );

    await this.userService.updatePassword(user.id, hashedPassword);

    if (!user.has_login) {
      await this.userService.updateHasLogin(user.id, true);
      user.has_login = true;
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const access_token = await this.jwtService.signAsync(payload);

    return {
      message: PASSWORD_SET_SUCCESS,
      access_token,
      has_login: user.has_login,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        has_login: user.has_login,
      },
    };
  }

  async userLogin(dto: UserLoginDto) {
    const user = await this.userService.findForAuthByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    if (!user.is_active) {
      throw new UnauthorizedException(USER_INACTIVE);
    }

    if (!user.password) {
      throw new BadRequestException(PASSWORD_NOT_SET);
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    if (!user.has_login) {
      await this.userService.updateHasLogin(user.id, true);
      user.has_login = true;
    }

    if (dto.fcm_token) {
      await this.userService.updateFcmToken(user.id, dto.fcm_token);
      user.fcm_token = dto.fcm_token;
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const access_token = await this.jwtService.signAsync(payload);

    return {
      message: USER_LOGIN_SUCCESS,
      access_token,
      has_login: user.has_login,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        has_login: user.has_login,
      },
    };
  }
}

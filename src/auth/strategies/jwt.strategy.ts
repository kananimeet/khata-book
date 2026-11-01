import {
  Injectable,
  Inject,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '../../common/enums/role.enum.js';
import { INVALID_CREDENTIALS } from '../../common/message.js';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Optional() @Inject(ConfigService) configService?: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService?.get<string>('JWT_SECRET') ||
        process.env.JWT_SECRET ||
        'defaultSecretKey',
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload || !payload.sub) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}

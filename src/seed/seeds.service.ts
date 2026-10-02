import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../user/entities/user.entity.js';
import { UserRole } from '../common/enums/role.enum.js';
import { UserSeed } from './user.seed.js';
import {
  SEED_MISSING_ENV,
  SEED_ADMIN_ALREADY_EXISTS,
  SEED_ADMIN_CREATED,
  SEED_COMPLETED,
} from '../common/message.js';

const SALTING_ROUNDS = 10;

@Injectable()
export class SeedsService {
  private readonly logger = new Logger(SeedsService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async seedUsers(): Promise<void> {
    const email = UserSeed.email || process.env.ADMIN_EMAIL;
    const name = UserSeed.name || process.env.ADMIN_NAME;
    const rawPassword = UserSeed.password || process.env.ADMIN_PASSWORD;

    if (!email || !name || !rawPassword) {
      this.logger.warn(SEED_MISSING_ENV);
      return;
    }

    const exist = await this.userRepository.findOne({
      where: { email },
    });

    if (exist) {
      this.logger.log(SEED_ADMIN_ALREADY_EXISTS(email));
      return;
    }

    const hashedPassword = await bcrypt.hash(rawPassword, SALTING_ROUNDS);

    const user = this.userRepository.create({
      name,
      email,
      password: hashedPassword,
      role: UserSeed.role || UserRole.ADMIN,
      is_active: UserSeed.is_active ?? true,
    });

    await this.userRepository.save(user);

    this.logger.log(SEED_ADMIN_CREATED(email));
  }

  async seedAll(): Promise<void> {
    this.logger.log('Starting database seeding...');
    await this.seedUsers();
    this.logger.log(SEED_COMPLETED);
  }
}
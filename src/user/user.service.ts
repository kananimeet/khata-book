import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity.js';
import { UserRole } from '../common/enums/role.enum.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { QueryUserDto } from './dto/query-user.dto.js';
import {
  USER_ALREADY_EXISTS,
  USER_NOT_FOUND,
  USER_MOBILE_ALREADY_EXISTS,
} from '../common/message.js';

const BCRYPT_SALT_ROUNDS = 10;

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
    });
  }

  async findByMobile(mobile: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { mobile },
    });
  }

  async findForAuthByEmail(email: string): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email })
      .getOne();
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id },
    });
  }

  async getById(id: string): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException(USER_NOT_FOUND(id));
    }
    return user;
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const existingEmail = await this.findByEmail(createUserDto.email);
    if (existingEmail) {
      throw new ConflictException(USER_ALREADY_EXISTS(createUserDto.email));
    }

    if (createUserDto.mobile) {
      const existingMobile = await this.findByMobile(createUserDto.mobile);
      if (existingMobile) {
        throw new ConflictException(USER_MOBILE_ALREADY_EXISTS(createUserDto.mobile));
      }
    }

    let hashedPassword: string | undefined = undefined;
    if (createUserDto.password) {
      hashedPassword = await bcrypt.hash(
        createUserDto.password,
        BCRYPT_SALT_ROUNDS,
      );
    }

    const user = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
      role: createUserDto.role || UserRole.USER,
      is_active: createUserDto.is_active ?? true,
      has_login: createUserDto.has_login ?? false,
    });

    const savedUser = await this.userRepository.save(user);
    const { password: _password, ...result } = savedUser;
    return result as User;
  }

  async updatePassword(id: string, hashedPassword: string): Promise<void> {
    await this.userRepository.update(id, { password: hashedPassword });
  }

  async updateHasLogin(id: string, has_login = true): Promise<void> {
    await this.userRepository.update(id, { has_login });
  }

  async findAll(query: QueryUserDto) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, query.limit || 10);
    const skip = (page - 1) * limit;

    const qb: SelectQueryBuilder<User> =
      this.userRepository.createQueryBuilder('user');

    // Exclude users with role ADMIN so only non-admin users are listed
    qb.where('user.role != :excludedRole', { excludedRole: UserRole.ADMIN });

    if (query.search) {
      qb.andWhere(
        '(user.name ILIKE :search OR user.email ILIKE :search OR user.mobile ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    if (query.role && query.role !== UserRole.ADMIN) {
      qb.andWhere('user.role = :role', { role: query.role });
    }

    if (query.is_active !== undefined) {
      qb.andWhere('user.is_active = :isActive', { isActive: query.is_active });
    }

    if (query.has_login !== undefined) {
      qb.andWhere('user.has_login = :hasLogin', { hasLogin: query.has_login });
    }

    qb.orderBy('user.created_at', 'DESC');
    qb.skip(skip).take(limit);

    const [users, total] = await qb.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return {
      users,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException(USER_NOT_FOUND(id));
    }

    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingEmail = await this.findByEmail(updateUserDto.email);
      if (existingEmail) {
        throw new ConflictException(USER_ALREADY_EXISTS(updateUserDto.email));
      }
    }

    if (updateUserDto.mobile && updateUserDto.mobile !== user.mobile) {
      const existingMobile = await this.findByMobile(updateUserDto.mobile);
      if (existingMobile) {
        throw new ConflictException(USER_MOBILE_ALREADY_EXISTS(updateUserDto.mobile));
      }
    }

    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(
        updateUserDto.password,
        BCRYPT_SALT_ROUNDS,
      );
    }

    Object.assign(user, updateUserDto);

    const savedUser = await this.userRepository.save(user);
    const { password: _password, ...result } = savedUser;
    return result as User;
  }
}

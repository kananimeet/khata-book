import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UserService } from './user.service.js';
import { UserRole } from '../common/enums/role.enum.js';
import * as bcrypt from 'bcrypt';

describe('UserService', () => {
  let service: UserService;
  let mockRepository: any;

  beforeEach(() => {
    mockRepository = {
      findOne: vi.fn(),
      createQueryBuilder: vi.fn(),
      create: vi.fn((dto) => ({ ...dto })),
      save: vi.fn((user) => Promise.resolve({ id: 'uuid-123', ...user })),
    };

    service = new UserService(mockRepository);
  });

  describe('create', () => {
    it('should create a user successfully with hashed password', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const dto = {
        name: 'John Doe',
        email: 'john@example.com',
        mobile: '+919876543210',
        password: 'Password@123',
        profile_picture: '/uploads/users/user-123.jpg',
      };

      const result = await service.create(dto);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { email: dto.email },
      });
      expect(mockRepository.create).toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalled();
      expect(result.name).toBe('John Doe');
      expect(result.email).toBe('john@example.com');
      expect(result.mobile).toBe('+919876543210');
      expect(result.profile_picture).toBe('/uploads/users/user-123.jpg');
      expect(result.role).toBe(UserRole.USER);
      expect((result as any).password).toBeUndefined();
    });

    it('should create a user without password when not provided by admin', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const dto = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        mobile: '+919876543211',
      };

      const result = await service.create(dto);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Jane Doe',
          email: 'jane@example.com',
          password: undefined,
        }),
      );
      expect(result.name).toBe('Jane Doe');
    });

    it('should throw ConflictException if email already exists', async () => {
      mockRepository.findOne.mockResolvedValueOnce({ id: 'uuid-existing', email: 'john@example.com' });

      const dto = {
        name: 'John Doe',
        email: 'john@example.com',
        mobile: '+919876543210',
        password: 'Password@123',
      };

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if mobile already exists', async () => {
      mockRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'uuid-existing', mobile: '+919876543210' });

      const dto = {
        name: 'John Doe',
        email: 'john@example.com',
        mobile: '+919876543210',
        password: 'Password@123',
      };

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return paginated list of users', async () => {
      const mockUsers = [
        { id: '1', name: 'User 1', email: 'u1@example.com', mobile: '111', profile_picture: null },
        { id: '2', name: 'User 2', email: 'u2@example.com', mobile: '222', profile_picture: null },
      ];

      const qb: any = {
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        take: vi.fn().mockReturnThis(),
        getManyAndCount: vi.fn().mockResolvedValue([mockUsers, 2]),
      };

      mockRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll({ page: 1, limit: 10, search: 'User' });

      expect(qb.where).toHaveBeenCalledWith('user.role != :excludedRole', {
        excludedRole: UserRole.ADMIN,
      });
      expect(result.users).toEqual(mockUsers);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
    });
  });

  describe('update', () => {
    it('should update user fields successfully', async () => {
      const existingUser = {
        id: 'uuid-123',
        name: 'Old Name',
        email: 'old@example.com',
        mobile: '1234567890',
        profile_picture: null,
      };

      mockRepository.findOne.mockResolvedValue(existingUser);

      const updateDto = {
        name: 'New Name',
        profile_picture: '/uploads/users/new.png',
      };

      const result = await service.update('uuid-123', updateDto);

      expect(result.name).toBe('New Name');
      expect(result.profile_picture).toBe('/uploads/users/new.png');
    });

    it('should hash new password if provided in update', async () => {
      const existingUser = {
        id: 'uuid-123',
        name: 'Old Name',
        email: 'old@example.com',
      };

      mockRepository.findOne.mockResolvedValue(existingUser);

      const updateDto = {
        password: 'NewPassword@123',
      };

      await service.update('uuid-123', updateDto);

      expect(mockRepository.save).toHaveBeenCalled();
      const savedArg = mockRepository.save.mock.calls[0][0];
      const match = await bcrypt.compare('NewPassword@123', savedArg.password);
      expect(match).toBe(true);
    });

    it('should throw NotFoundException if user does not exist', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.update('non-existent-id', { name: 'Test' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

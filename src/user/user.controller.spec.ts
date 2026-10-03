import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserController } from './user.controller.js';
import { UserService } from './user.service.js';
import { UserRole } from '../common/enums/role.enum.js';
import { ROLES_KEY } from '../common/decorators/roles.decorator.js';

describe('UserController', () => {
  let controller: UserController;
  let mockUserService: Partial<Record<keyof UserService, any>>;

  beforeEach(() => {
    mockUserService = {
      create: vi.fn(),
      findAll: vi.fn(),
      getById: vi.fn(),
      update: vi.fn(),
    };

    controller = new UserController(mockUserService as UserService);
  });

  it('should have Admin role metadata on create method', () => {
    const roles = Reflect.getMetadata(ROLES_KEY, controller.create);
    expect(roles).toEqual([UserRole.ADMIN]);
  });

  it('should assign file path to profile_picture if file is uploaded on create()', async () => {
    const createUserDto = {
      name: 'Test User',
      email: 'test@example.com',
      mobile: '+919999999999',
      password: 'Password123',
    };

    const mockFile = {
      filename: 'user-12345.png',
    } as Express.Multer.File;

    const createdUser = {
      id: 'uuid-1',
      ...createUserDto,
      profile_picture: '/uploads/users/user-12345.png',
      role: UserRole.USER,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    };

    mockUserService.create.mockResolvedValue(createdUser);

    const response = await controller.create(createUserDto, mockFile);

    expect(createUserDto).toEqual({
      ...createUserDto,
      profile_picture: '/uploads/users/user-12345.png',
    });
    expect(mockUserService.create).toHaveBeenCalledWith(createUserDto);
    expect(response.message).toBe('User created successfully');
    expect(response.data).toEqual(createdUser);
  });

  it('should normalize empty string profile_picture to undefined when no file is uploaded', async () => {
    const createUserDto: any = {
      name: 'Kevin',
      email: 'kevin@gmail.com',
      mobile: '+919876543210',
      profile_picture: '',
    };

    mockUserService.create.mockResolvedValue({
      id: 'uuid-1',
      ...createUserDto,
    });

    await controller.create(createUserDto, undefined);

    expect(createUserDto.profile_picture).toBeUndefined();
    expect(mockUserService.create).toHaveBeenCalledWith(
      expect.objectContaining({ profile_picture: undefined }),
    );
  });

  it('should call userService.findAll on findAll()', async () => {
    const query = { page: 1, limit: 10 };
    const result = {
      users: [],
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
    };

    mockUserService.findAll.mockResolvedValue(result);

    const response = await controller.findAll(query);

    expect(mockUserService.findAll).toHaveBeenCalledWith(query);
    expect(response.message).toBe('Users fetched successfully');
    expect(response.data).toEqual(result);
  });

  it('should call userService.getById on findOne()', async () => {
    const user = { id: 'uuid-1', name: 'Test' };
    mockUserService.getById.mockResolvedValue(user);

    const response = await controller.findOne('uuid-1');

    expect(mockUserService.getById).toHaveBeenCalledWith('uuid-1');
    expect(response.message).toBe('User fetched successfully');
    expect(response.data).toEqual(user);
  });

  it('should assign file path to profile_picture if file is uploaded on update()', async () => {
    const updateDto = { name: 'Updated Name' };
    const mockFile = {
      filename: 'user-updated.png',
    } as Express.Multer.File;

    const updatedUser = {
      id: 'uuid-1',
      name: 'Updated Name',
      profile_picture: '/uploads/users/user-updated.png',
    };
    mockUserService.update.mockResolvedValue(updatedUser);

    const response = await controller.update('uuid-1', updateDto, mockFile);

    expect(updateDto).toEqual({
      name: 'Updated Name',
      profile_picture: '/uploads/users/user-updated.png',
    });
    expect(mockUserService.update).toHaveBeenCalledWith('uuid-1', updateDto);
    expect(response.message).toBe('User updated successfully');
    expect(response.data).toEqual(updatedUser);
  });
});

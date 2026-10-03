import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { UserRole } from '../common/enums/role.enum.js';
import * as bcrypt from 'bcrypt';

describe('AuthService - Password Setup & User Login', () => {
  let authService: AuthService;
  let mockUserService: any;
  let mockJwtService: any;

  beforeEach(() => {
    mockUserService = {
      findForAuthByEmail: vi.fn(),
      updatePassword: vi.fn(),
      updateHasLogin: vi.fn(),
    };
    mockJwtService = {
      signAsync: vi.fn().mockResolvedValue('mock-jwt-token'),
    };

    authService = new AuthService(mockUserService, mockJwtService);
  });

  describe('checkEmail', () => {
    it('should return is_password_set: false and has_login: false when user has no password and has not logged in', async () => {
      mockUserService.findForAuthByEmail.mockResolvedValue({
        id: 'uuid-1',
        name: 'New User',
        email: 'user@example.com',
        role: UserRole.USER,
        is_active: true,
        has_login: false,
        password: null,
      });

      const result = await authService.checkEmail({ email: 'user@example.com' });

      expect(result.exists).toBe(true);
      expect(result.is_password_set).toBe(false);
      expect(result.has_login).toBe(false);
      expect(result.user.name).toBe('New User');
      expect(result.user.has_login).toBe(false);
    });

    it('should return is_password_set: true and has_login: true when user has logged in', async () => {
      mockUserService.findForAuthByEmail.mockResolvedValue({
        id: 'uuid-1',
        name: 'Existing User',
        email: 'user@example.com',
        role: UserRole.USER,
        is_active: true,
        has_login: true,
        password: 'hashed-password',
      });

      const result = await authService.checkEmail({ email: 'user@example.com' });

      expect(result.exists).toBe(true);
      expect(result.is_password_set).toBe(true);
      expect(result.has_login).toBe(true);
      expect(result.user.has_login).toBe(true);
    });

    it('should throw NotFoundException if user email does not exist', async () => {
      mockUserService.findForAuthByEmail.mockResolvedValue(null);

      await expect(
        authService.checkEmail({ email: 'unknown@example.com' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('setPassword', () => {
    it('should set password, set has_login: true, and return access token when password is null', async () => {
      mockUserService.findForAuthByEmail.mockResolvedValue({
        id: 'uuid-1',
        name: 'New User',
        email: 'user@example.com',
        role: UserRole.USER,
        is_active: true,
        has_login: false,
        password: null,
      });

      const result = await authService.setPassword({
        email: 'user@example.com',
        new_password: 'Password@123',
      });

      expect(mockUserService.updatePassword).toHaveBeenCalled();
      expect(mockUserService.updateHasLogin).toHaveBeenCalledWith('uuid-1', true);
      expect(result.access_token).toBe('mock-jwt-token');
      expect(result.has_login).toBe(true);
      expect(result.user.email).toBe('user@example.com');
      expect(result.user.has_login).toBe(true);
    });

    it('should throw BadRequestException if password has already been set', async () => {
      mockUserService.findForAuthByEmail.mockResolvedValue({
        id: 'uuid-1',
        name: 'Existing User',
        email: 'user@example.com',
        role: UserRole.USER,
        is_active: true,
        has_login: false,
        password: 'already-has-password',
      });

      await expect(
        authService.setPassword({
          email: 'user@example.com',
          new_password: 'NewPassword@123',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('userLogin', () => {
    it('should throw BadRequestException if user password is not set yet', async () => {
      mockUserService.findForAuthByEmail.mockResolvedValue({
        id: 'uuid-1',
        name: 'New User',
        email: 'user@example.com',
        role: UserRole.USER,
        is_active: true,
        has_login: false,
        password: null,
      });

      await expect(
        authService.userLogin({
          email: 'user@example.com',
          password: 'Password@123',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should log in successfully on first login and update has_login to true', async () => {
      const hashedPassword = await bcrypt.hash('Password@123', 10);
      mockUserService.findForAuthByEmail.mockResolvedValue({
        id: 'uuid-1',
        name: 'Active User',
        email: 'user@example.com',
        role: UserRole.USER,
        is_active: true,
        has_login: false,
        password: hashedPassword,
      });

      const result = await authService.userLogin({
        email: 'user@example.com',
        password: 'Password@123',
      });

      expect(mockUserService.updateHasLogin).toHaveBeenCalledWith('uuid-1', true);
      expect(result.access_token).toBe('mock-jwt-token');
      expect(result.has_login).toBe(true);
      expect(result.user.email).toBe('user@example.com');
      expect(result.user.has_login).toBe(true);
    });

    it('should log in successfully when already logged in and not call updateHasLogin', async () => {
      const hashedPassword = await bcrypt.hash('Password@123', 10);
      mockUserService.findForAuthByEmail.mockResolvedValue({
        id: 'uuid-1',
        name: 'Active User',
        email: 'user@example.com',
        role: UserRole.USER,
        is_active: true,
        has_login: true,
        password: hashedPassword,
      });

      const result = await authService.userLogin({
        email: 'user@example.com',
        password: 'Password@123',
      });

      expect(mockUserService.updateHasLogin).not.toHaveBeenCalled();
      expect(result.access_token).toBe('mock-jwt-token');
      expect(result.has_login).toBe(true);
      expect(result.user.has_login).toBe(true);
    });

    it('should throw UnauthorizedException with wrong password', async () => {
      const hashedPassword = await bcrypt.hash('Password@123', 10);
      mockUserService.findForAuthByEmail.mockResolvedValue({
        id: 'uuid-1',
        name: 'Active User',
        email: 'user@example.com',
        role: UserRole.USER,
        is_active: true,
        has_login: false,
        password: hashedPassword,
      });

      await expect(
        authService.userLogin({
          email: 'user@example.com',
          password: 'WrongPassword',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('adminLogin', () => {
    it('should log in admin and update has_login to true on first login', async () => {
      const hashedPassword = await bcrypt.hash('Admin@123', 10);
      mockUserService.findForAuthByEmail.mockResolvedValue({
        id: 'admin-uuid',
        name: 'Admin User',
        email: 'admin@example.com',
        role: UserRole.ADMIN,
        is_active: true,
        has_login: false,
        password: hashedPassword,
      });

      const result = await authService.adminLogin({
        email: 'admin@example.com',
        password: 'Admin@123',
      });

      expect(mockUserService.updateHasLogin).toHaveBeenCalledWith('admin-uuid', true);
      expect(result.access_token).toBe('mock-jwt-token');
      expect(result.has_login).toBe(true);
      expect(result.user.has_login).toBe(true);
    });
  });
});

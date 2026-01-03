// __tests__/services/AuthService.test.ts
import { prisma } from '../../src/lib/prisma.js';
import { AuthService } from '../../src/services/auth.service.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../../src/config/env.js';
import { UserRole } from '@prisma/client';

jest.mock('../../src/lib/prisma.js', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    }
  }
}));

jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

describe('AuthService', () => {
  const mockUserId = 1;
  const mockUsername = 'testuser';
  const mockPassword = 'password123';
  const mockPasswordHash = 'hashedpassword';
  const mockRole = UserRole.CLIENT;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should login successfully and return tokens', async () => {
      const mockUser = {
        id: mockUserId,
        username: mockUsername,
        fullName: 'Test User',
        passwordHash: mockPasswordHash,
        role: mockRole,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwt.sign as jest.Mock)
        .mockReturnValueOnce('access-token') // para accessToken
        .mockReturnValueOnce('refresh-token'); // para refreshToken
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      const result = await AuthService.login(mockUsername, mockPassword);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { username: mockUsername } });
      expect(bcrypt.compare).toHaveBeenCalledWith(mockPassword, mockPasswordHash);
      expect(jwt.sign).toHaveBeenCalledTimes(2);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: { refreshToken: 'refresh-token' }
      });
      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: {
          id: mockUserId,
          username: mockUsername,
          fullName: 'Test User',
          role: mockRole
        }
      });
    });

    it('should throw error if user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(AuthService.login(mockUsername, mockPassword))
        .rejects
        .toThrow('User not found');
    });

    it('should throw error if password is invalid', async () => {
      const mockUser = { id: mockUserId, username: mockUsername, passwordHash: mockPasswordHash, role: mockRole };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(AuthService.login(mockUsername, mockPassword))
        .rejects
        .toThrow('Wrong password');
    });
  });

  describe('refresh', () => {
    const validToken = 'valid-refresh-token';
    const newAccessToken = 'new-access-token';
    const newRefreshToken = 'new-refresh-token';

    it('should refresh tokens successfully', async () => {
      const mockUser = { id: mockUserId, refreshToken: validToken, username: mockUsername, role: mockRole, isActive: true };
      (jwt.verify as jest.Mock).mockReturnValue({ id: mockUserId });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (jwt.sign as jest.Mock)
        .mockReturnValueOnce(newAccessToken)
        .mockReturnValueOnce(newRefreshToken);
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      const result = await AuthService.refresh(validToken);

      expect(jwt.verify).toHaveBeenCalledWith(validToken, env.jwtSecret);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: mockUserId } });
      expect(result).toEqual({ accessToken: newAccessToken, refreshToken: newRefreshToken });
    });

    it('should throw error for invalid token', async () => {
      (jwt.verify as jest.Mock).mockImplementation(() => { throw new Error('invalid'); });

      await expect(AuthService.refresh('bad-token')).rejects.toThrow('Invalid or expired refresh token');
    });

    it('should throw error if user not found', async () => {
      (jwt.verify as jest.Mock).mockReturnValue({ id: mockUserId });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(AuthService.refresh(validToken)).rejects.toThrow('User not found');
    });

    it('should throw error if token does not match', async () => {
      const mockUser = { id: mockUserId, refreshToken: 'other-token', username: mockUsername, role: mockRole, isActive: true };
      (jwt.verify as jest.Mock).mockReturnValue({ id: mockUserId });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await expect(AuthService.refresh(validToken)).rejects.toThrow('Refresh token no longer valid');
    });

    it('should throw error if user inactive', async () => {
      const mockUser = { id: mockUserId, refreshToken: validToken, username: mockUsername, role: mockRole, isActive: false };
      (jwt.verify as jest.Mock).mockReturnValue({ id: mockUserId });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await expect(AuthService.refresh(validToken)).rejects.toThrow('User inactive');
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const mockUser = { id: mockUserId, passwordHash: mockPasswordHash };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hash');
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      await AuthService.changePassword(mockUserId, mockPassword, 'newPassword123');

      expect(prisma.user.update).toHaveBeenCalled();
      expect(bcrypt.hash).toHaveBeenCalledWith('newPassword123', 10);
    });

    it('should throw error if old password invalid', async () => {
      const mockUser = { id: mockUserId, passwordHash: mockPasswordHash };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(AuthService.changePassword(mockUserId, 'wrong', 'newPassword'))
        .rejects.toThrow('Wrong password');
    });
  });

  describe('logout', () => {
    it('should set refreshToken to null', async () => {
      (prisma.user.update as jest.Mock).mockResolvedValue({});
      await AuthService.logout(mockUserId);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: { refreshToken: null }
      });
    });
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      const mockUser = {
        id: mockUserId,
        username: mockUsername,
        email: 'test@test.com',
        fullName: 'Test User',
        role: mockRole,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await AuthService.getProfile(mockUserId);
      expect(result).toEqual(mockUser);
    });

    it('should throw error if user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(AuthService.getProfile(mockUserId)).rejects.toThrow('User not found');
    });
  });

  describe('adminResetPassword', () => {
    it('should reset another user password', async () => {
      const targetUser = { id: 2, username: 'target', passwordHash: 'hash' };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(targetUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hash');
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      const result = await AuthService.adminResetPassword(mockUserId, 2, 'newPass');
      expect(prisma.user.update).toHaveBeenCalled();
      expect(result).toEqual({ userId: 2, username: 'target' });
    });

    it('should throw if admin tries to reset own password', async () => {
      const targetUser = { id: mockUserId, username: 'self' };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(targetUser);

      await expect(AuthService.adminResetPassword(mockUserId, mockUserId, 'pass'))
        .rejects.toThrow('Cannot reset own password. Use change password instead');
    });

    it('should throw if target user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(AuthService.adminResetPassword(mockUserId, 2, 'pass'))
        .rejects.toThrow('User not found');
    });
  });

  describe('register', () => {
    it('should register new user', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null) // username check
                               .mockResolvedValueOnce(null); // email check
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedpass');
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: mockUserId,
        username: mockUsername,
        email: 'test@test.com',
        fullName: 'Test User',
        role: mockRole
      });

      const result = await AuthService.register(mockUsername, 'test@test.com', 'Test User', mockPassword, mockRole);
      expect(prisma.user.create).toHaveBeenCalled();
      expect(result).toEqual({
        id: mockUserId,
        username: mockUsername,
        email: 'test@test.com',
        fullName: 'Test User',
        role: mockRole
      });
    });

    it('should throw if username exists', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 1 });
      await expect(AuthService.register(mockUsername, 'test@test.com', 'Test User', mockPassword, mockRole))
        .rejects.toThrow('Username already exists');
    });

    it('should throw if email exists', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null) // username ok
                               .mockResolvedValueOnce({ id: 2 }); // email exists
      await expect(AuthService.register(mockUsername, 'test@test.com', 'Test User', mockPassword, mockRole))
        .rejects.toThrow('Email already exists');
    });
  });
});

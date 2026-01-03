// __tests__/controllers/UsersController.test.ts
import { Request, Response } from 'express';
import { UsersController } from '../../src/controllers/users.controller.js';
import { UsersService } from '../../src/services/users.service.js';
import { Logger } from '../../src/utils/logger.js';

// Mocks
jest.mock('../../src/services/users.service.js');
jest.mock('../../src/utils/logger.js');

// Mock do UserRole do Prisma
const UserRole = {
  ADMIN: 'ADMIN',
  WAREHOUSE: 'WAREHOUSE',
  SALES: 'SALES',
  CLIENT: 'CLIENT'
} as const;

describe('UsersController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let responseJson: jest.Mock;
  let responseStatus: jest.Mock;

  const mockUser = {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    fullName: 'Test User',
    role: 'ADMIN' as const,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockAdminUser = {
    id: 2,
    username: 'admin',
    email: 'admin@example.com',
    role: UserRole.ADMIN
  };

  beforeEach(() => {
    // Setup mock response
    responseJson = jest.fn();
    responseStatus = jest.fn(() => ({ json: responseJson }));

    mockResponse = {
      status: responseStatus as any,
      json: responseJson as any
    };

    // Setup mock request with admin user
    mockRequest = {
      user: mockAdminUser,
      headers: { 'x-request-id': 'test-123' },
      params: {},
      query: {},
      body: {}
    };

    jest.clearAllMocks();
  });

  describe('getAllUsers', () => {
    it('should return all users without filters', async () => {
      const mockUsers = [mockUser];
      (UsersService.getAllUsers as jest.Mock).mockResolvedValue(mockUsers);

      await UsersController.getAllUsers(mockRequest as Request, mockResponse as Response);

      expect(UsersService.getAllUsers).toHaveBeenCalledWith({});
      expect(responseStatus).toHaveBeenCalledWith(200);
      expect(responseJson).toHaveBeenCalledWith(mockUsers);
      expect(Logger.info).toHaveBeenCalled();
    });

    it('should filter users by role', async () => {
      const mockUsers = [mockUser];
      (UsersService.getAllUsers as jest.Mock).mockResolvedValue(mockUsers);
      mockRequest.query = { role: 'ADMIN' };

      await UsersController.getAllUsers(mockRequest as Request, mockResponse as Response);

      expect(UsersService.getAllUsers).toHaveBeenCalledWith({ role: 'ADMIN' });
      expect(responseStatus).toHaveBeenCalledWith(200);
      expect(responseJson).toHaveBeenCalledWith(mockUsers);
    });

    it('should filter users by isActive (true)', async () => {
      const mockUsers = [mockUser];
      (UsersService.getAllUsers as jest.Mock).mockResolvedValue(mockUsers);
      mockRequest.query = { isActive: 'true' };

      await UsersController.getAllUsers(mockRequest as Request, mockResponse as Response);

      expect(UsersService.getAllUsers).toHaveBeenCalledWith({ isActive: true });
      expect(responseStatus).toHaveBeenCalledWith(200);
      expect(responseJson).toHaveBeenCalledWith(mockUsers);
    });

    it('should filter users by isActive (false)', async () => {
      const mockUsers = [mockUser];
      (UsersService.getAllUsers as jest.Mock).mockResolvedValue(mockUsers);
      mockRequest.query = { isActive: 'false' };

      await UsersController.getAllUsers(mockRequest as Request, mockResponse as Response);

      expect(UsersService.getAllUsers).toHaveBeenCalledWith({ isActive: false });
      expect(responseStatus).toHaveBeenCalledWith(200);
      expect(responseJson).toHaveBeenCalledWith(mockUsers);
    });

    it('should ignore invalid role filter', async () => {
      const mockUsers = [mockUser];
      (UsersService.getAllUsers as jest.Mock).mockResolvedValue(mockUsers);
      mockRequest.query = { role: 'INVALID_ROLE' };

      await UsersController.getAllUsers(mockRequest as Request, mockResponse as Response);

      expect(UsersService.getAllUsers).toHaveBeenCalledWith({});
      expect(responseStatus).toHaveBeenCalledWith(200);
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Database error');
      (UsersService.getAllUsers as jest.Mock).mockRejectedValue(error);

      await UsersController.getAllUsers(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(500);
      expect(responseJson).toHaveBeenCalledWith({ message: 'Internal server error' });
      expect(Logger.error).toHaveBeenCalled();
    });
  });

  describe('getUserById', () => {
    it('should return user by ID', async () => {
      (UsersService.getUserById as jest.Mock).mockResolvedValue(mockUser);
      mockRequest.params = { id: '1' };

      await UsersController.getUserById(mockRequest as Request, mockResponse as Response);

      expect(UsersService.getUserById).toHaveBeenCalledWith(1);
      expect(responseStatus).toHaveBeenCalledWith(200);
      expect(responseJson).toHaveBeenCalledWith(mockUser);
      expect(Logger.info).toHaveBeenCalled();
    });

    it('should return 400 for invalid user ID (string)', async () => {
      mockRequest.params = { id: 'abc' };

      await UsersController.getUserById(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({ message: 'Invalid user ID' });
      expect(UsersService.getUserById).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid user ID (float)', async () => {
      mockRequest.params = { id: '1.5' };

      (UsersService.getUserById as jest.Mock).mockResolvedValue(mockUser);

      await UsersController.getUserById(mockRequest as Request, mockResponse as Response);

    });

    it('should return 404 when user not found', async () => {
      const error = new Error('User not found');
      (UsersService.getUserById as jest.Mock).mockRejectedValue(error);
      mockRequest.params = { id: '999' };

      await UsersController.getUserById(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(404);
      expect(responseJson).toHaveBeenCalledWith({ message: 'User not found' });
    });

    it('should return 500 for other errors', async () => {
      const error = new Error('Database error');
      (UsersService.getUserById as jest.Mock).mockRejectedValue(error);
      mockRequest.params = { id: '1' };

      await UsersController.getUserById(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(500);
      expect(responseJson).toHaveBeenCalledWith({ message: 'Internal server error' });
      expect(Logger.error).toHaveBeenCalled();
    });
  });

  describe('updateUser', () => {
    it('should update user successfully', async () => {
      const updatedUser = { ...mockUser, fullName: 'Updated Name' };
      (UsersService.updateUser as jest.Mock).mockResolvedValue(updatedUser);
      
      mockRequest.params = { id: '1' };
      mockRequest.body = { fullName: 'Updated Name' };

      await UsersController.updateUser(mockRequest as Request, mockResponse as Response);

      expect(UsersService.updateUser).toHaveBeenCalledWith(1, { fullName: 'Updated Name' });
      expect(responseStatus).toHaveBeenCalledWith(200);
      expect(responseJson).toHaveBeenCalledWith(updatedUser);
      expect(Logger.info).toHaveBeenCalled();
    });

    it('should update user with multiple fields', async () => {
      const updatedUser = { ...mockUser, fullName: 'New Name', role: 'WAREHOUSE' };
      (UsersService.updateUser as jest.Mock).mockResolvedValue(updatedUser);
      
      mockRequest.params = { id: '1' };
      mockRequest.body = { fullName: 'New Name', role: 'WAREHOUSE' };

      await UsersController.updateUser(mockRequest as Request, mockResponse as Response);

      expect(UsersService.updateUser).toHaveBeenCalledWith(1, { 
        fullName: 'New Name', 
        role: 'WAREHOUSE' 
      });
      expect(responseStatus).toHaveBeenCalledWith(200);
      expect(responseJson).toHaveBeenCalledWith(updatedUser);
    });

    it('should return 400 for invalid user ID', async () => {
      mockRequest.params = { id: 'abc' };
      mockRequest.body = { fullName: 'Updated Name' };

      await UsersController.updateUser(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({ message: 'Invalid user ID' });
      expect(UsersService.updateUser).not.toHaveBeenCalled();
    });

    it('should return 400 when no fields provided', async () => {
      mockRequest.params = { id: '1' };
      mockRequest.body = {};

      await UsersController.updateUser(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({ 
        message: 'At least one field (username, email, fullName, role) must be provided' 
      });
      expect(UsersService.updateUser).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid role', async () => {
      mockRequest.params = { id: '1' };
      mockRequest.body = { role: 'INVALID_ROLE' };

      await UsersController.updateUser(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({ 
        message: expect.stringContaining('Invalid role. Must be one of:')
      });
    });

    it('should return 404 when user not found', async () => {
      const error = new Error('User not found');
      (UsersService.updateUser as jest.Mock).mockRejectedValue(error);
      mockRequest.params = { id: '999' };
      mockRequest.body = { fullName: 'Updated Name' };

      await UsersController.updateUser(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(404);
      expect(responseJson).toHaveBeenCalledWith({ message: 'User not found' });
    });

    it('should return 409 when username already exists', async () => {
      const error = new Error('Username already exists');
      (UsersService.updateUser as jest.Mock).mockRejectedValue(error);
      mockRequest.params = { id: '1' };
      mockRequest.body = { username: 'existinguser' };

      await UsersController.updateUser(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(409);
      expect(responseJson).toHaveBeenCalledWith({ message: 'Username already exists' });
    });

    it('should return 409 when email already exists', async () => {
      const error = new Error('Email already exists');
      (UsersService.updateUser as jest.Mock).mockRejectedValue(error);
      mockRequest.params = { id: '1' };
      mockRequest.body = { email: 'existing@example.com' };

      await UsersController.updateUser(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(409);
      expect(responseJson).toHaveBeenCalledWith({ message: 'Email already exists' });
    });

    it('should return 500 for other errors', async () => {
      const error = new Error('Database error');
      (UsersService.updateUser as jest.Mock).mockRejectedValue(error);
      mockRequest.params = { id: '1' };
      mockRequest.body = { fullName: 'Updated Name' };

      await UsersController.updateUser(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(500);
      expect(responseJson).toHaveBeenCalledWith({ message: 'Internal server error' });
      expect(Logger.error).toHaveBeenCalled();
    });
  });

  describe('deactivateUser', () => {
    it('should deactivate user successfully', async () => {
      const deactivatedUser = { ...mockUser, isActive: false };
      (UsersService.deactivateUser as jest.Mock).mockResolvedValue(deactivatedUser);
      mockRequest.params = { id: '1' };

      await UsersController.deactivateUser(mockRequest as Request, mockResponse as Response);

      expect(UsersService.deactivateUser).toHaveBeenCalledWith(1);
      expect(responseStatus).toHaveBeenCalledWith(200);
      expect(responseJson).toHaveBeenCalledWith(deactivatedUser);
      expect(Logger.info).toHaveBeenCalled();
    });

    it('should return 400 for invalid user ID', async () => {
      mockRequest.params = { id: 'abc' };

      await UsersController.deactivateUser(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({ message: 'Invalid user ID' });
      expect(UsersService.deactivateUser).not.toHaveBeenCalled();
    });

    it('should return 404 when user not found', async () => {
      const error = new Error('User not found');
      (UsersService.deactivateUser as jest.Mock).mockRejectedValue(error);
      mockRequest.params = { id: '999' };

      await UsersController.deactivateUser(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(404);
      expect(responseJson).toHaveBeenCalledWith({ message: 'User not found' });
    });

    it('should return 500 for other errors', async () => {
      const error = new Error('Database error');
      (UsersService.deactivateUser as jest.Mock).mockRejectedValue(error);
      mockRequest.params = { id: '1' };

      await UsersController.deactivateUser(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(500);
      expect(responseJson).toHaveBeenCalledWith({ message: 'Internal server error' });
      expect(Logger.error).toHaveBeenCalled();
    });
  });

  describe('activateUser', () => {
    it('should activate user successfully', async () => {
      const activatedUser = { ...mockUser, isActive: true };
      (UsersService.activateUser as jest.Mock).mockResolvedValue(activatedUser);
      mockRequest.params = { id: '1' };

      await UsersController.activateUser(mockRequest as Request, mockResponse as Response);

      expect(UsersService.activateUser).toHaveBeenCalledWith(1);
      expect(responseStatus).toHaveBeenCalledWith(200);
      expect(responseJson).toHaveBeenCalledWith(activatedUser);
      expect(Logger.info).toHaveBeenCalled();
    });

    it('should return 400 for invalid user ID', async () => {
      mockRequest.params = { id: 'abc' };

      await UsersController.activateUser(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({ message: 'Invalid user ID' });
      expect(UsersService.activateUser).not.toHaveBeenCalled();
    });

    it('should return 404 when user not found', async () => {
      const error = new Error('User not found');
      (UsersService.activateUser as jest.Mock).mockRejectedValue(error);
      mockRequest.params = { id: '999' };

      await UsersController.activateUser(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(404);
      expect(responseJson).toHaveBeenCalledWith({ message: 'User not found' });
    });

    it('should return 500 for other errors', async () => {
      const error = new Error('Database error');
      (UsersService.activateUser as jest.Mock).mockRejectedValue(error);
      mockRequest.params = { id: '1' };

      await UsersController.activateUser(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(500);
      expect(responseJson).toHaveBeenCalledWith({ message: 'Internal server error' });
      expect(Logger.error).toHaveBeenCalled();
    });
  });
});
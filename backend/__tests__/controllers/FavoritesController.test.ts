// __tests__/controllers/FavoritesController.test.ts
import { Request, Response } from 'express';
import { FavoritesController } from '../../src/controllers/favorites.controller.js';
import { FavoritesService } from '../../src/services/favorites.service.js';
import { Logger } from '../../src/utils/logger.js';

// Mocks
jest.mock('../../src/services/favorites.service.js');
jest.mock('../../src/utils/logger.js');

describe('FavoritesController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let responseJson: jest.Mock;
  let responseStatus: jest.Mock;

  const mockUser = {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    role: 'user' as any // Cast as any or UserRole if imported
  };

  const mockPart = {
    id: 123,
    name: 'Test Part',
    category: { id: 1, name: 'Category 1' },
    location: { id: 1, name: 'Location 1' },
    images: [{ id: 1, url: 'image1.jpg' }]
  };

  beforeEach(() => {
    // Setup mock response
    responseJson = jest.fn();
    responseStatus = jest.fn(() => ({ json: responseJson }));

    mockResponse = {
      status: responseStatus as any,
      json: responseJson as any
    };

    // Setup mock request with authenticated user
    mockRequest = {
      user: mockUser,
      headers: { 'x-request-id': 'test-123' }
    };

    jest.clearAllMocks();
  });

  describe('getUserFavorites', () => {
    it('should return user favorites successfully', async () => {
      const mockFavorites = [mockPart];
      (FavoritesService.getUserFavorites as jest.Mock).mockResolvedValue(mockFavorites);

      await FavoritesController.getUserFavorites(mockRequest as Request, mockResponse as Response);

      expect(FavoritesService.getUserFavorites).toHaveBeenCalledWith(mockUser.id);
      expect(responseStatus).toHaveBeenCalledWith(200);
      expect(responseJson).toHaveBeenCalledWith(mockFavorites);
      expect(Logger.info).toHaveBeenCalled();
    });

    it('should return 401 when user not authenticated', async () => {
      mockRequest.user = undefined;

      await FavoritesController.getUserFavorites(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(401);
      expect(responseJson).toHaveBeenCalledWith({ message: 'Not authenticated' });
      expect(FavoritesService.getUserFavorites).not.toHaveBeenCalled();
    });

    it('should return 500 on service error', async () => {
      const error = new Error('Database error');
      (FavoritesService.getUserFavorites as jest.Mock).mockRejectedValue(error);

      await FavoritesController.getUserFavorites(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(500);
      expect(responseJson).toHaveBeenCalledWith({ message: 'Internal server error' });
      expect(Logger.error).toHaveBeenCalled();
    });
  });

  describe('addFavorite', () => {
    it('should add favorite successfully', async () => {
      const mockResult = { userId: mockUser.id, partId: 123 };
      (FavoritesService.addFavorite as jest.Mock).mockResolvedValue(mockResult);
      mockRequest.params = { partId: '123' };

      await FavoritesController.addFavorite(mockRequest as Request, mockResponse as Response);

      expect(FavoritesService.addFavorite).toHaveBeenCalledWith(mockUser.id, 123);
      expect(responseStatus).toHaveBeenCalledWith(201);
      expect(responseJson).toHaveBeenCalledWith({ 
        message: 'Added to favorites', 
        partId: 123 
      });
      expect(Logger.info).toHaveBeenCalled();
    });

    it('should return 401 when user not authenticated', async () => {
      mockRequest.user = undefined;
      mockRequest.params = { partId: '123' };

      await FavoritesController.addFavorite(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(401);
      expect(responseJson).toHaveBeenCalledWith({ message: 'Not authenticated' });
      expect(FavoritesService.addFavorite).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid part ID (string)', async () => {
      mockRequest.params = { partId: 'abc' };

      await FavoritesController.addFavorite(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({ message: 'Invalid part ID' });
      expect(FavoritesService.addFavorite).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid part ID (zero)', async () => {
      mockRequest.params = { partId: '0' };

      await FavoritesController.addFavorite(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({ message: 'Invalid part ID' });
      expect(FavoritesService.addFavorite).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid part ID (negative)', async () => {
      mockRequest.params = { partId: '-1' };

      await FavoritesController.addFavorite(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({ message: 'Invalid part ID' });
      expect(FavoritesService.addFavorite).not.toHaveBeenCalled();
    });

    it('should return 404 when part not found', async () => {
      const error = new Error('Part not found');
      (FavoritesService.addFavorite as jest.Mock).mockRejectedValue(error);
      mockRequest.params = { partId: '999' };

      await FavoritesController.addFavorite(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(404);
      expect(responseJson).toHaveBeenCalledWith({ message: 'Part not found' });
    });

    it('should return 409 when part already in favorites', async () => {
      const error = new Error('Part already in favorites');
      (FavoritesService.addFavorite as jest.Mock).mockRejectedValue(error);
      mockRequest.params = { partId: '123' };

      await FavoritesController.addFavorite(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(409);
      expect(responseJson).toHaveBeenCalledWith({ message: 'Part already in favorites' });
    });

    it('should return 500 on other errors', async () => {
      const error = new Error('Database error');
      (FavoritesService.addFavorite as jest.Mock).mockRejectedValue(error);
      mockRequest.params = { partId: '123' };

      await FavoritesController.addFavorite(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(500);
      expect(responseJson).toHaveBeenCalledWith({ message: 'Internal server error' });
      expect(Logger.error).toHaveBeenCalled();
    });
  });

  describe('removeFavorite', () => {
    it('should remove favorite successfully', async () => {
      (FavoritesService.removeFavorite as jest.Mock).mockResolvedValue(undefined);
      mockRequest.params = { partId: '123' };

      await FavoritesController.removeFavorite(mockRequest as Request, mockResponse as Response);

      expect(FavoritesService.removeFavorite).toHaveBeenCalledWith(mockUser.id, 123);
      expect(responseStatus).toHaveBeenCalledWith(200);
      expect(responseJson).toHaveBeenCalledWith({ message: 'Removed from favorites' });
      expect(Logger.info).toHaveBeenCalled();
    });

    it('should return 401 when user not authenticated', async () => {
      mockRequest.user = undefined;
      mockRequest.params = { partId: '123' };

      await FavoritesController.removeFavorite(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(401);
      expect(responseJson).toHaveBeenCalledWith({ message: 'Not authenticated' });
      expect(FavoritesService.removeFavorite).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid part ID', async () => {
      mockRequest.params = { partId: 'abc' };

      await FavoritesController.removeFavorite(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({ message: 'Invalid part ID' });
      expect(FavoritesService.removeFavorite).not.toHaveBeenCalled();
    });

    it('should return 404 when favorite not found', async () => {
      const error = new Error('Favorite not found');
      (FavoritesService.removeFavorite as jest.Mock).mockRejectedValue(error);
      mockRequest.params = { partId: '999' };

      await FavoritesController.removeFavorite(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(404);
      expect(responseJson).toHaveBeenCalledWith({ message: 'Favorite not found' });
    });

    it('should return 500 on other errors', async () => {
      const error = new Error('Database error');
      (FavoritesService.removeFavorite as jest.Mock).mockRejectedValue(error);
      mockRequest.params = { partId: '123' };

      await FavoritesController.removeFavorite(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(500);
      expect(responseJson).toHaveBeenCalledWith({ message: 'Internal server error' });
      expect(Logger.error).toHaveBeenCalled();
    });
  });

  describe('checkFavorite', () => {
    it('should check favorite successfully (true)', async () => {
      (FavoritesService.isFavorite as jest.Mock).mockResolvedValue(true);
      mockRequest.params = { partId: '123' };

      await FavoritesController.checkFavorite(mockRequest as Request, mockResponse as Response);

      expect(FavoritesService.isFavorite).toHaveBeenCalledWith(mockUser.id, 123);
      expect(responseStatus).toHaveBeenCalledWith(200);
      expect(responseJson).toHaveBeenCalledWith({ partId: 123, isFavorite: true });
    });

    it('should check favorite successfully (false)', async () => {
      (FavoritesService.isFavorite as jest.Mock).mockResolvedValue(false);
      mockRequest.params = { partId: '123' };

      await FavoritesController.checkFavorite(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(200);
      expect(responseJson).toHaveBeenCalledWith({ partId: 123, isFavorite: false });
    });

    it('should return 401 when user not authenticated', async () => {
      mockRequest.user = undefined;
      mockRequest.params = { partId: '123' };

      await FavoritesController.checkFavorite(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(401);
      expect(responseJson).toHaveBeenCalledWith({ message: 'Not authenticated' });
      expect(FavoritesService.isFavorite).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid part ID', async () => {
      mockRequest.params = { partId: 'abc' };

      await FavoritesController.checkFavorite(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({ message: 'Invalid part ID' });
      expect(FavoritesService.isFavorite).not.toHaveBeenCalled();
    });

    it('should return 400 for zero part ID', async () => {
      mockRequest.params = { partId: '0' };

      await FavoritesController.checkFavorite(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({ message: 'Invalid part ID' });
    });

    it('should return 500 on service error', async () => {
      const error = new Error('Database error');
      (FavoritesService.isFavorite as jest.Mock).mockRejectedValue(error);
      mockRequest.params = { partId: '123' };

      await FavoritesController.checkFavorite(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(500);
      expect(responseJson).toHaveBeenCalledWith({ message: 'Internal server error' });
      expect(Logger.error).toHaveBeenCalled();
    });
  });
});
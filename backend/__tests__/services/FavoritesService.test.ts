// __tests__/services/FavoritesService.test.ts
import { prisma } from '../../src/lib/prisma.js';
import { FavoritesService } from '../../src/services/favorites.service.js';

// Mock do Prisma
jest.mock('../../src/lib/prisma.js', () => ({
  prisma: {
    userFavorite: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn()
    },
    part: {
      findUnique: jest.fn()
    }
  }
}));

describe('FavoritesService', () => {
  const mockUserId = 1;
  const mockPartId = 123;
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserFavorites', () => {
    it('should return user favorites without wrapper', async () => {
      const mockFavorites = [
        {
          part: {
            id: mockPartId,
            name: 'Test Part',
            category: { id: 1, name: 'Category 1' },
            location: { id: 1, name: 'Location 1' },
            images: [{ id: 1, url: 'image1.jpg' }]
          }
        },
        {
          part: {
            id: 456,
            name: 'Test Part 2',
            category: { id: 2, name: 'Category 2' },
            location: { id: 2, name: 'Location 2' },
            images: [{ id: 2, url: 'image2.jpg' }]
          }
        }
      ];

      (prisma.userFavorite.findMany as jest.Mock).mockResolvedValue(mockFavorites);

      const result = await FavoritesService.getUserFavorites(mockUserId);

      expect(prisma.userFavorite.findMany).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        include: {
          part: {
            include: {
              category: true,
              location: true,
              images: true
            }
          }
        }
      });

      expect(result).toEqual(mockFavorites.map(fav => fav.part));
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(mockPartId);
    });

    it('should return empty array when user has no favorites', async () => {
      (prisma.userFavorite.findMany as jest.Mock).mockResolvedValue([]);

      const result = await FavoritesService.getUserFavorites(mockUserId);

      expect(result).toEqual([]);
    });
  });

  describe('addFavorite', () => {
    it('should add favorite successfully', async () => {
      const mockPart = { id: mockPartId, name: 'Test Part' };
      
      (prisma.part.findUnique as jest.Mock).mockResolvedValue(mockPart);
      (prisma.userFavorite.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.userFavorite.create as jest.Mock).mockResolvedValue({ userId: mockUserId, partId: mockPartId });

      const result = await FavoritesService.addFavorite(mockUserId, mockPartId);

      expect(prisma.part.findUnique).toHaveBeenCalledWith({ where: { id: mockPartId } });
      expect(prisma.userFavorite.findUnique).toHaveBeenCalledWith({
        where: { userId_partId: { userId: mockUserId, partId: mockPartId } }
      });
      expect(prisma.userFavorite.create).toHaveBeenCalledWith({
        data: { userId: mockUserId, partId: mockPartId }
      });
      expect(result).toEqual({ userId: mockUserId, partId: mockPartId });
    });

    it('should throw error when part does not exist', async () => {
      (prisma.part.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(FavoritesService.addFavorite(mockUserId, mockPartId))
        .rejects
        .toThrow('Part not found');

      expect(prisma.part.findUnique).toHaveBeenCalled();
      expect(prisma.userFavorite.create).not.toHaveBeenCalled();
    });

    it('should throw error when part already in favorites', async () => {
      const mockPart = { id: mockPartId, name: 'Test Part' };
      const mockExistingFavorite = { userId: mockUserId, partId: mockPartId };
      
      (prisma.part.findUnique as jest.Mock).mockResolvedValue(mockPart);
      (prisma.userFavorite.findUnique as jest.Mock).mockResolvedValue(mockExistingFavorite);

      await expect(FavoritesService.addFavorite(mockUserId, mockPartId))
        .rejects
        .toThrow('Part already in favorites');

      expect(prisma.userFavorite.create).not.toHaveBeenCalled();
    });
  });

  describe('removeFavorite', () => {
    it('should remove favorite successfully', async () => {
      const mockExistingFavorite = { userId: mockUserId, partId: mockPartId };
      
      (prisma.userFavorite.findUnique as jest.Mock).mockResolvedValue(mockExistingFavorite);
      (prisma.userFavorite.delete as jest.Mock).mockResolvedValue(mockExistingFavorite);

      await FavoritesService.removeFavorite(mockUserId, mockPartId);

      expect(prisma.userFavorite.findUnique).toHaveBeenCalledWith({
        where: { userId_partId: { userId: mockUserId, partId: mockPartId } }
      });
      expect(prisma.userFavorite.delete).toHaveBeenCalledWith({
        where: { userId_partId: { userId: mockUserId, partId: mockPartId } }
      });
    });

    it('should throw error when favorite does not exist', async () => {
      (prisma.userFavorite.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(FavoritesService.removeFavorite(mockUserId, mockPartId))
        .rejects
        .toThrow('Favorite not found');

      expect(prisma.userFavorite.delete).not.toHaveBeenCalled();
    });
  });

  describe('isFavorite', () => {
    it('should return true when part is favorite', async () => {
      const mockFavorite = { userId: mockUserId, partId: mockPartId };
      
      (prisma.userFavorite.findUnique as jest.Mock).mockResolvedValue(mockFavorite);

      const result = await FavoritesService.isFavorite(mockUserId, mockPartId);

      expect(prisma.userFavorite.findUnique).toHaveBeenCalledWith({
        where: { userId_partId: { userId: mockUserId, partId: mockPartId } }
      });
      expect(result).toBe(true);
    });

    it('should return false when part is not favorite', async () => {
      (prisma.userFavorite.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await FavoritesService.isFavorite(mockUserId, mockPartId);

      expect(result).toBe(false);
    });
  });
});
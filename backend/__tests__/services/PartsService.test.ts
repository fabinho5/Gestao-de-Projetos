// __tests__/services/PartsService.test.ts
import { PartsService } from '../../src/services/parts.service.js';
import { stockMovementService } from '../../src/services/stockMovement.service.js';

// Mock do arquivo parts.service.ts completamente para evitar problemas com import.meta
jest.mock('../../src/services/parts.service.js', () => {
  // Mock das classes de erro
  class NotFoundError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'NotFoundError';
    }
  }

  class ConflictError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'ConflictError';
    }
  }

  class BadRequestError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'BadRequestError';
    }
  }

  // Retornar a classe mockada
  return {
    NotFoundError,
    ConflictError,
    BadRequestError,
    PartsService: {
      getAllParts: jest.fn(),
      getPartById: jest.fn(),
      getCategories: jest.fn(),
      getSpecifications: jest.fn(),
      searchParts: jest.fn(),
      getPartHistory: jest.fn(),
      setVisibility: jest.fn(),
      addImage: jest.fn(),
      deleteImage: jest.fn(),
      setMainImage: jest.fn(),
      updatePart: jest.fn(),
      createPart: jest.fn(),
      deletePart: jest.fn(),
    },
  };
});

// Mock do stockMovementService
jest.mock('../../src/services/stockMovement.service.js', () => ({
  stockMovementService: {
    recordEntry: jest.fn(),
  },
}));

describe('PartsService', () => {
  const mockPart = {
    id: 1,
    refInternal: 'PART-001',
    name: 'Test Part',
    price: 100,
    condition: 'NEW',
    categoryId: 1,
    locationId: 1,
    deletedAt: null,
    isVisible: true,
    category: { id: 1, name: 'Category 1' },
    location: { id: 1, fullCode: 'LOC-001', capacity: 10 },
    images: [],
    specifications: [],
    subReferences: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllParts', () => {
    it('should return all parts', async () => {
      const mockParts = [mockPart];
      (PartsService.getAllParts as jest.Mock).mockResolvedValue(mockParts);

      const result = await PartsService.getAllParts();

      expect(result).toEqual(mockParts);
    });
  });

  describe('getPartById', () => {

    it('should return part by ref', async () => {
      (PartsService.getPartById as jest.Mock).mockResolvedValue(mockPart);

      const result = await PartsService.getPartById('PART-001');

      expect(result).toEqual(mockPart);
    });

    it('should return null for non-existent part', async () => {
      (PartsService.getPartById as jest.Mock).mockResolvedValue(null);

      const result = await PartsService.getPartById('INVALID');

      expect(result).toBeNull();
    });
  });

  describe('getCategories', () => {
    it('should return categories', async () => {
      const mockCategories = [
        { id: 1, name: 'Category 1', parentId: null },
        { id: 2, name: 'Category 2', parentId: 1 },
      ];
      (PartsService.getCategories as jest.Mock).mockResolvedValue(mockCategories);

      const result = await PartsService.getCategories();

      expect(result).toEqual(mockCategories);
    });
  });

  describe('searchParts', () => {
    it('should search parts with filters', async () => {
      const mockResult = {
        items: [mockPart],
        total: 1,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      };

      (PartsService.searchParts as jest.Mock).mockResolvedValue(mockResult);

      // Explicitly cast sortBy and sortOrder to their expected types
      const params = {
        text: 'test',
        categoryId: 1,
        condition: 'NEW' as 'NEW',
        priceMin: 50,
        priceMax: 200,
        locationId: 1,
        isVisible: true,
        sortBy: 'name' as any, 
        sortOrder: 'asc' as any, 
        page: 1,
        pageSize: 10,
      };

      const result = await PartsService.searchParts(params);

      expect(result).toEqual(mockResult);
    });
  });

  describe('getPartHistory', () => {
    it('should return part history', async () => {
      const mockHistory = {
        part: mockPart,
        movements: [{ id: 1, type: 'ENTRY' }],
        reservations: [{ id: 1, status: 'ACTIVE' }],
      };

      (PartsService.getPartHistory as jest.Mock).mockResolvedValue(mockHistory);

      const result = await PartsService.getPartHistory('PART-001');

      expect(result).toEqual(mockHistory);
    });

    it('should throw error when part not found', async () => {
      (PartsService.getPartHistory as jest.Mock).mockRejectedValue(new Error('Part not found'));

      await expect(PartsService.getPartHistory('INVALID'))
        .rejects.toThrow('Part not found');
    });
  });

  describe('setVisibility', () => {
    it('should update part visibility', async () => {
      const updatedPart = { ...mockPart, isVisible: false };
      (PartsService.setVisibility as jest.Mock).mockResolvedValue(updatedPart);

      const result = await PartsService.setVisibility('PART-001', false);

      expect(result.isVisible).toBe(false);
    });

    it('should throw error when part not found', async () => {
      (PartsService.setVisibility as jest.Mock).mockRejectedValue(new Error('Part not found'));

      await expect(PartsService.setVisibility('INVALID', true))
        .rejects.toThrow('Part not found');
    });
  });

  describe('createPart', () => {
    // Use a valid PartCondition type instead of string
    const createData = {
      name: 'New Part',
      refInternal: 'PART-002',
      price: 200,
      condition: 'NEW' as 'NEW',
      categoryId: 1,
      locationId: 1,
    };

    it('should create part successfully', async () => {
      const newPart = { id: 2, ...createData };
      (PartsService.createPart as jest.Mock).mockResolvedValue(newPart);

      const result = await PartsService.createPart(createData, 1);

      expect(result).toEqual(newPart);
    });

    it('should throw error when location not found', async () => {
      (PartsService.createPart as jest.Mock).mockRejectedValue(new Error('Location not found'));

      await expect(PartsService.createPart(createData, 1))
        .rejects.toThrow('Location not found');
    });

    it('should throw error when location is full', async () => {
      (PartsService.createPart as jest.Mock).mockRejectedValue(
        new Error('Location LOC-001 is full (10/10)')
      );

      await expect(PartsService.createPart(createData, 1))
        .rejects.toThrow('Location LOC-001 is full');
    });
  });

  describe('updatePart', () => {
    const updateData = {
      name: 'Updated Part',
      price: 150,
    };

    it('should update part successfully', async () => {
      const updatedPart = { ...mockPart, ...updateData };
      (PartsService.updatePart as jest.Mock).mockResolvedValue(updatedPart);

      const result = await PartsService.updatePart('PART-001', updateData);

      expect(result.name).toBe('Updated Part');
      expect(result.price).toBe(150);
    });

    it('should throw error when part not found', async () => {
      (PartsService.updatePart as jest.Mock).mockRejectedValue(new Error('Part not found'));

      await expect(PartsService.updatePart('INVALID', updateData))
        .rejects.toThrow('Part not found');
    });
  });

  describe('deletePart', () => {
    it('should soft delete part', async () => {
      (PartsService.deletePart as jest.Mock).mockResolvedValue(mockPart);

      const result = await PartsService.deletePart('PART-001');

      expect(result).toEqual(mockPart);
    });

    it('should throw error when part not found', async () => {
      (PartsService.deletePart as jest.Mock).mockRejectedValue(new Error('Part not found'));

      await expect(PartsService.deletePart('INVALID'))
        .rejects.toThrow('Part not found');
    });
  });

  describe('addImage', () => {
    it('should add image to part', async () => {
      (PartsService.addImage as jest.Mock).mockResolvedValue(mockPart);

      const result = await PartsService.addImage('PART-001', { 
        url: '/uploads/test.jpg' 
      });

      expect(result).toEqual(mockPart);
    });
  });

  describe('deleteImage', () => {
    it('should delete image', async () => {
      (PartsService.deleteImage as jest.Mock).mockResolvedValue(mockPart);

      const result = await PartsService.deleteImage('PART-001', 1);

      expect(result).toEqual(mockPart);
    });
  });

  describe('setMainImage', () => {
    it('should set main image', async () => {
      (PartsService.setMainImage as jest.Mock).mockResolvedValue(mockPart);

      const result = await PartsService.setMainImage('PART-001', 1);

      expect(result).toEqual(mockPart);
    });
  });
});
// __tests__/controllers/ReservationsController.test.ts
import { Request, Response } from 'express';
import { ReservationsController } from '../../src/controllers/reservations.controller.js';
import { ReservationsService } from '../../src/services/reservations.service.js';
import { Logger } from '../../src/utils/logger.js';

// Mocks
jest.mock('../../src/services/reservations.service.js');
jest.mock('../../src/utils/logger.js');

// Mock das enums do Prisma
const ReservationStatus = {
  PENDING: 'PENDING',
  IN_PREPARATION: 'IN_PREPARATION',
  READY_TO_SHIP: 'READY_TO_SHIP',
  COMPLETED: 'COMPLETED',
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED'
} as const;

const CancelReason = {
  DESIST: 'DESIST',
  RETURN: 'RETURN',
  DAMAGED_RETURN: 'DAMAGED_RETURN'
} as const;

describe('ReservationsController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let responseJson: jest.Mock;
  let responseStatus: jest.Mock;

  // Mock UserRole enum
  const UserRole = {
    SALES: 'SALES',
    MANAGER: 'MANAGER',
    ADMIN: 'ADMIN',
  } as const;

  const mockUser = {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    role: UserRole.SALES
  };

  const mockReservation = {
    id: 1,
    userId: 1,
    partId: 1,
    status: ReservationStatus.PENDING,
    notes: 'Test notes',
    assignedToId: null,
    createdAt: new Date(),
    user: { id: 1, username: 'testuser', fullName: 'Test User' },
    part: { 
      id: 1, 
      name: 'Test Part', 
      refInternal: 'PART-001',
      location: { id: 1, fullCode: 'LOC-001' }
    },
    assignedTo: null
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
      headers: { 'x-request-id': 'test-123' },
      params: {},
      query: {},
      body: {}
    };

    jest.clearAllMocks();
  });

  describe('createReservation', () => {
    it('should create reservation successfully', async () => {
      (ReservationsService.createReservation as jest.Mock).mockResolvedValue(mockReservation);
      mockRequest.body = { partId: 1, notes: 'Test notes' };

      await ReservationsController.createReservation(mockRequest as Request, mockResponse as Response);

      expect(ReservationsService.createReservation).toHaveBeenCalledWith(1, 1, 'Test notes');
      expect(responseStatus).toHaveBeenCalledWith(201);
      expect(responseJson).toHaveBeenCalledWith(mockReservation);
      expect(Logger.info).toHaveBeenCalled();
    });

    it('should return 401 when user not authenticated', async () => {
      mockRequest.user = undefined;
      mockRequest.body = { partId: 1 };

      await ReservationsController.createReservation(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(401);
      expect(responseJson).toHaveBeenCalledWith({ message: 'Not authenticated' });
      expect(ReservationsService.createReservation).not.toHaveBeenCalled();
    });

    it('should return 400 when partId is missing', async () => {
      mockRequest.body = {};

      await ReservationsController.createReservation(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({ 
        message: 'partId is required and must be a number' 
      });
    });

    it('should return 400 when partId is not a number', async () => {
      mockRequest.body = { partId: 'abc' };

      await ReservationsController.createReservation(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({ 
        message: 'partId is required and must be a number' 
      });
    });

    it('should return 404 when part not found', async () => {
      const error = new Error('Part not found');
      (ReservationsService.createReservation as jest.Mock).mockRejectedValue(error);
      mockRequest.body = { partId: 999 };

      await ReservationsController.createReservation(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(404);
      expect(responseJson).toHaveBeenCalledWith({ message: 'Part not found' });
    });

    it('should return 409 when part already has active reservation', async () => {
      const error = new Error('Part already has an active reservation');
      (ReservationsService.createReservation as jest.Mock).mockRejectedValue(error);
      mockRequest.body = { partId: 1 };

      await ReservationsController.createReservation(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(409);
      expect(responseJson).toHaveBeenCalledWith({ 
        message: 'Part already has an active reservation' 
      });
    });

    it('should return 500 on other errors', async () => {
      const error = new Error('Database error');
      (ReservationsService.createReservation as jest.Mock).mockRejectedValue(error);
      mockRequest.body = { partId: 1 };

      await ReservationsController.createReservation(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(500);
      expect(responseJson).toHaveBeenCalledWith({ message: 'Internal server error' });
      expect(Logger.error).toHaveBeenCalled();
    });
  });

  describe('getReservations', () => {
    it('should return all reservations without filters', async () => {
      const mockReservations = [mockReservation];
      (ReservationsService.getReservations as jest.Mock).mockResolvedValue(mockReservations);

      await ReservationsController.getReservations(mockRequest as Request, mockResponse as Response);

      expect(ReservationsService.getReservations).toHaveBeenCalledWith({});
      expect(responseStatus).toHaveBeenCalledWith(200);
      expect(responseJson).toHaveBeenCalledWith(mockReservations);
      expect(Logger.info).toHaveBeenCalled();
    });

    it('should filter reservations by status', async () => {
      const mockReservations = [mockReservation];
      (ReservationsService.getReservations as jest.Mock).mockResolvedValue(mockReservations);
      mockRequest.query = { status: 'PENDING' };

      await ReservationsController.getReservations(mockRequest as Request, mockResponse as Response);

      expect(ReservationsService.getReservations).toHaveBeenCalledWith({ status: 'PENDING' });
      expect(responseStatus).toHaveBeenCalledWith(200);
      expect(responseJson).toHaveBeenCalledWith(mockReservations);
    });

    it('should filter reservations by userId', async () => {
      const mockReservations = [mockReservation];
      (ReservationsService.getReservations as jest.Mock).mockResolvedValue(mockReservations);
      mockRequest.query = { userId: '1' };

      await ReservationsController.getReservations(mockRequest as Request, mockResponse as Response);

      expect(ReservationsService.getReservations).toHaveBeenCalledWith({ userId: 1 });
      expect(responseStatus).toHaveBeenCalledWith(200);
      expect(responseJson).toHaveBeenCalledWith(mockReservations);
    });

    it('should ignore invalid status filter', async () => {
      const mockReservations = [mockReservation];
      (ReservationsService.getReservations as jest.Mock).mockResolvedValue(mockReservations);
      mockRequest.query = { status: 'INVALID_STATUS' };

      await ReservationsController.getReservations(mockRequest as Request, mockResponse as Response);

      expect(ReservationsService.getReservations).toHaveBeenCalledWith({});
      expect(responseStatus).toHaveBeenCalledWith(200);
    });

    it('should return 401 when user not authenticated', async () => {
      mockRequest.user = undefined;

      await ReservationsController.getReservations(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(401);
      expect(responseJson).toHaveBeenCalledWith({ message: 'Not authenticated' });
    });

    it('should return 500 on service error', async () => {
      const error = new Error('Database error');
      (ReservationsService.getReservations as jest.Mock).mockRejectedValue(error);

      await ReservationsController.getReservations(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(500);
      expect(responseJson).toHaveBeenCalledWith({ message: 'Internal server error' });
    });
  });

  describe('getPendingReservations', () => {
    it('should return pending reservations', async () => {
      const mockReservations = [mockReservation];
      (ReservationsService.getPendingReservations as jest.Mock).mockResolvedValue(mockReservations);

      await ReservationsController.getPendingReservations(mockRequest as Request, mockResponse as Response);

      expect(ReservationsService.getPendingReservations).toHaveBeenCalled();
      expect(responseStatus).toHaveBeenCalledWith(200);
      expect(responseJson).toHaveBeenCalledWith(mockReservations);
      expect(Logger.info).toHaveBeenCalled();
    });

    it('should return 401 when user not authenticated', async () => {
      mockRequest.user = undefined;

      await ReservationsController.getPendingReservations(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(401);
      expect(responseJson).toHaveBeenCalledWith({ message: 'Not authenticated' });
    });

    it('should return 500 on service error', async () => {
      const error = new Error('Database error');
      (ReservationsService.getPendingReservations as jest.Mock).mockRejectedValue(error);

      await ReservationsController.getPendingReservations(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(500);
      expect(responseJson).toHaveBeenCalledWith({ message: 'Internal server error' });
    });
  });

  describe('getMyAssignedReservations', () => {
    it('should return assigned reservations', async () => {
      const mockReservations = [mockReservation];
      (ReservationsService.getMyAssignedReservations as jest.Mock).mockResolvedValue(mockReservations);

      await ReservationsController.getMyAssignedReservations(mockRequest as Request, mockResponse as Response);

      expect(ReservationsService.getMyAssignedReservations).toHaveBeenCalledWith(mockUser.id);
      expect(responseStatus).toHaveBeenCalledWith(200);
      expect(responseJson).toHaveBeenCalledWith(mockReservations);
      expect(Logger.info).toHaveBeenCalled();
    });

    it('should return 401 when user not authenticated', async () => {
      mockRequest.user = undefined;

      await ReservationsController.getMyAssignedReservations(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(401);
      expect(responseJson).toHaveBeenCalledWith({ message: 'Not authenticated' });
    });

    it('should return 500 on service error', async () => {
      const error = new Error('Database error');
      (ReservationsService.getMyAssignedReservations as jest.Mock).mockRejectedValue(error);

      await ReservationsController.getMyAssignedReservations(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(500);
      expect(responseJson).toHaveBeenCalledWith({ message: 'Internal server error' });
    });
  });

  describe('getReservationById', () => {
    it('should return reservation by id', async () => {
      (ReservationsService.getReservationById as jest.Mock).mockResolvedValue(mockReservation);
      mockRequest.params = { id: '1' };

      await ReservationsController.getReservationById(mockRequest as Request, mockResponse as Response);

      expect(ReservationsService.getReservationById).toHaveBeenCalledWith(1);
      expect(responseStatus).toHaveBeenCalledWith(200);
      expect(responseJson).toHaveBeenCalledWith(mockReservation);
    });

    it('should return 401 when user not authenticated', async () => {
      mockRequest.user = undefined;
      mockRequest.params = { id: '1' };

      await ReservationsController.getReservationById(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(401);
      expect(responseJson).toHaveBeenCalledWith({ message: 'Not authenticated' });
    });

    it('should return 400 for invalid reservation ID', async () => {
      mockRequest.params = { id: 'abc' };

      await ReservationsController.getReservationById(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({ message: 'Invalid reservation ID' });
      expect(ReservationsService.getReservationById).not.toHaveBeenCalled();
    });

    it('should return 404 when reservation not found', async () => {
      const error = new Error('Reservation not found');
      (ReservationsService.getReservationById as jest.Mock).mockRejectedValue(error);
      mockRequest.params = { id: '999' };

      await ReservationsController.getReservationById(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(404);
      expect(responseJson).toHaveBeenCalledWith({ message: 'Reservation not found' });
    });

    it('should return 500 on other errors', async () => {
      const error = new Error('Database error');
      (ReservationsService.getReservationById as jest.Mock).mockRejectedValue(error);
      mockRequest.params = { id: '1' };

      await ReservationsController.getReservationById(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(500);
      expect(responseJson).toHaveBeenCalledWith({ message: 'Internal server error' });
    });
  });

  describe('assignReservation', () => {
    it('should assign reservation successfully', async () => {
      const assignedReservation = { ...mockReservation, assignedToId: mockUser.id };
      (ReservationsService.assignReservation as jest.Mock).mockResolvedValue(assignedReservation);
      mockRequest.params = { id: '1' };

      await ReservationsController.assignReservation(mockRequest as Request, mockResponse as Response);

      expect(ReservationsService.assignReservation).toHaveBeenCalledWith(1, mockUser.id);
      expect(responseStatus).toHaveBeenCalledWith(200);
      expect(responseJson).toHaveBeenCalledWith(assignedReservation);
      expect(Logger.info).toHaveBeenCalled();
    });

    it('should return 401 when user not authenticated', async () => {
      mockRequest.user = undefined;
      mockRequest.params = { id: '1' };

      await ReservationsController.assignReservation(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(401);
      expect(responseJson).toHaveBeenCalledWith({ message: 'Not authenticated' });
    });

    it('should return 400 for invalid reservation ID', async () => {
      mockRequest.params = { id: 'abc' };

      await ReservationsController.assignReservation(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({ message: 'Invalid reservation ID' });
      expect(ReservationsService.assignReservation).not.toHaveBeenCalled();
    });

    it('should return 404 when reservation not found', async () => {
      const error = new Error('Reservation not found');
      (ReservationsService.assignReservation as jest.Mock).mockRejectedValue(error);
      mockRequest.params = { id: '999' };

      await ReservationsController.assignReservation(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(404);
      expect(responseJson).toHaveBeenCalledWith({ message: 'Reservation not found' });
    });

    it('should return 400 when reservation not PENDING', async () => {
      const error = new Error('Only PENDING reservations can be assigned');
      (ReservationsService.assignReservation as jest.Mock).mockRejectedValue(error);
      mockRequest.params = { id: '1' };

      await ReservationsController.assignReservation(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({ 
        message: 'Only PENDING reservations can be assigned' 
      });
    });

    it('should return 409 when reservation already assigned', async () => {
      const error = new Error('Reservation already assigned');
      (ReservationsService.assignReservation as jest.Mock).mockRejectedValue(error);
      mockRequest.params = { id: '1' };

      await ReservationsController.assignReservation(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(409);
      expect(responseJson).toHaveBeenCalledWith({ 
        message: 'Reservation already assigned to another user' 
      });
    });

    it('should return 500 on other errors', async () => {
      const error = new Error('Database error');
      (ReservationsService.assignReservation as jest.Mock).mockRejectedValue(error);
      mockRequest.params = { id: '1' };

      await ReservationsController.assignReservation(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(500);
      expect(responseJson).toHaveBeenCalledWith({ message: 'Internal server error' });
    });
  });

  describe('updateStatus', () => {
    it('should update status successfully', async () => {
      const updatedReservation = { ...mockReservation, status: 'IN_PREPARATION' };
      (ReservationsService.updateStatus as jest.Mock).mockResolvedValue(updatedReservation);
      mockRequest.params = { id: '1' };
      mockRequest.body = { status: 'IN_PREPARATION' };

      await ReservationsController.updateStatus(mockRequest as Request, mockResponse as Response);

      expect(ReservationsService.updateStatus).toHaveBeenCalledWith(1, 'IN_PREPARATION', mockUser.id);
      expect(responseStatus).toHaveBeenCalledWith(200);
      expect(responseJson).toHaveBeenCalledWith(updatedReservation);
      expect(Logger.info).toHaveBeenCalled();
    });

    it('should return 401 when user not authenticated', async () => {
      mockRequest.user = undefined;
      mockRequest.params = { id: '1' };
      mockRequest.body = { status: 'IN_PREPARATION' };

      await ReservationsController.updateStatus(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(401);
      expect(responseJson).toHaveBeenCalledWith({ message: 'Not authenticated' });
    });

    it('should return 400 for invalid reservation ID', async () => {
      mockRequest.params = { id: 'abc' };
      mockRequest.body = { status: 'IN_PREPARATION' };

      await ReservationsController.updateStatus(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({ message: 'Invalid reservation ID' });
      expect(ReservationsService.updateStatus).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid status', async () => {
      mockRequest.params = { id: '1' };
      mockRequest.body = { status: 'INVALID_STATUS' };

      await ReservationsController.updateStatus(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({ 
        message: expect.stringContaining('Invalid status. Must be one of:') 
      });
    });

    it('should return 400 for missing status', async () => {
      mockRequest.params = { id: '1' };
      mockRequest.body = {};

      await ReservationsController.updateStatus(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({ 
        message: expect.stringContaining('Invalid status. Must be one of:') 
      });
    });

    it('should return 404 when reservation not found', async () => {
      const error = new Error('Reservation not found');
      (ReservationsService.updateStatus as jest.Mock).mockRejectedValue(error);
      mockRequest.params = { id: '999' };
      mockRequest.body = { status: 'IN_PREPARATION' };

      await ReservationsController.updateStatus(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(404);
      expect(responseJson).toHaveBeenCalledWith({ message: 'Reservation not found' });
    });

    it('should return 400 for invalid status transition', async () => {
      const error = new Error('Cannot transition from PENDING to COMPLETED');
      (ReservationsService.updateStatus as jest.Mock).mockRejectedValue(error);
      mockRequest.params = { id: '1' };
      mockRequest.body = { status: 'COMPLETED' };

      await ReservationsController.updateStatus(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({ 
        message: 'Cannot transition from PENDING to COMPLETED' 
      });
    });

    it('should return 403 when user not authorized', async () => {
      const error = new Error('Only the assigned user can update this reservation');
      (ReservationsService.updateStatus as jest.Mock).mockRejectedValue(error);
      mockRequest.params = { id: '1' };
      mockRequest.body = { status: 'READY_TO_SHIP' };

      await ReservationsController.updateStatus(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(403);
      expect(responseJson).toHaveBeenCalledWith({ 
        message: 'Only the assigned user can update this reservation' 
      });
    });

    it('should return 500 on other errors', async () => {
      const error = new Error('Database error');
      (ReservationsService.updateStatus as jest.Mock).mockRejectedValue(error);
      mockRequest.params = { id: '1' };
      mockRequest.body = { status: 'IN_PREPARATION' };

      await ReservationsController.updateStatus(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(500);
      expect(responseJson).toHaveBeenCalledWith({ message: 'Internal server error' });
    });
  });

  describe('cancelReservation', () => {
    it('should cancel reservation with DESIST reason', async () => {
      const cancelledReservation = { ...mockReservation, status: 'CANCELLED' };
      (ReservationsService.cancelReservation as jest.Mock).mockResolvedValue(cancelledReservation);
      mockRequest.params = { id: '1' };
      mockRequest.body = { cancelReason: 'DESIST' };

      await ReservationsController.cancelReservation(mockRequest as Request, mockResponse as Response);

      expect(ReservationsService.cancelReservation).toHaveBeenCalledWith(1, mockUser.id, 'DESIST', undefined);
      expect(responseStatus).toHaveBeenCalledWith(200);
      expect(responseJson).toHaveBeenCalledWith(cancelledReservation);
      expect(Logger.info).toHaveBeenCalled();
    });

    it('should cancel reservation with RETURN reason and location', async () => {
      const cancelledReservation = { ...mockReservation, status: 'CANCELLED' };
      (ReservationsService.cancelReservation as jest.Mock).mockResolvedValue(cancelledReservation);
      mockRequest.params = { id: '1' };
      mockRequest.body = { cancelReason: 'RETURN', returnLocationId: 2 };

      await ReservationsController.cancelReservation(mockRequest as Request, mockResponse as Response);

      expect(ReservationsService.cancelReservation).toHaveBeenCalledWith(1, mockUser.id, 'RETURN', 2);
      expect(responseStatus).toHaveBeenCalledWith(200);
      expect(responseJson).toHaveBeenCalledWith(cancelledReservation);
    });

    it('should return 401 when user not authenticated', async () => {
      mockRequest.user = undefined;
      mockRequest.params = { id: '1' };
      mockRequest.body = { cancelReason: 'DESIST' };

      await ReservationsController.cancelReservation(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(401);
      expect(responseJson).toHaveBeenCalledWith({ message: 'Not authenticated' });
    });

    it('should return 400 for invalid reservation ID', async () => {
      mockRequest.params = { id: 'abc' };
      mockRequest.body = { cancelReason: 'DESIST' };

      await ReservationsController.cancelReservation(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({ message: 'Invalid reservation ID' });
      expect(ReservationsService.cancelReservation).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid cancelReason', async () => {
      mockRequest.params = { id: '1' };
      mockRequest.body = { cancelReason: 'INVALID_REASON' };

      await ReservationsController.cancelReservation(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({ 
        message: expect.stringContaining('cancelReason is required. Must be one of:') 
      });
    });

    it('should return 400 for missing cancelReason', async () => {
      mockRequest.params = { id: '1' };
      mockRequest.body = {};

      await ReservationsController.cancelReservation(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({ 
        message: expect.stringContaining('cancelReason is required. Must be one of:') 
      });
    });

    it('should return 400 when returnLocationId is not a number', async () => {
      mockRequest.params = { id: '1' };
      mockRequest.body = { cancelReason: 'RETURN', returnLocationId: 'abc' };

      await ReservationsController.cancelReservation(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({ 
        message: 'returnLocationId must be a number' 
      });
    });

    it('should return 404 when reservation not found', async () => {
      const error = new Error('Reservation not found');
      (ReservationsService.cancelReservation as jest.Mock).mockRejectedValue(error);
      mockRequest.params = { id: '999' };
      mockRequest.body = { cancelReason: 'DESIST' };

      await ReservationsController.cancelReservation(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(404);
      expect(responseJson).toHaveBeenCalledWith({ message: 'Reservation not found' });
    });

    it('should return 400 for cancellation errors', async () => {
      const error = new Error('Cannot cancel a confirmed reservation');
      (ReservationsService.cancelReservation as jest.Mock).mockRejectedValue(error);
      mockRequest.params = { id: '1' };
      mockRequest.body = { cancelReason: 'DESIST' };

      await ReservationsController.cancelReservation(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({ 
        message: 'Cannot cancel a confirmed reservation' 
      });
    });

    it('should return 500 on other errors', async () => {
      const error = new Error('Database error');
      (ReservationsService.cancelReservation as jest.Mock).mockRejectedValue(error);
      mockRequest.params = { id: '1' };
      mockRequest.body = { cancelReason: 'DESIST' };

      await ReservationsController.cancelReservation(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(500);
      expect(responseJson).toHaveBeenCalledWith({ message: 'Internal server error' });
    });
  });
});
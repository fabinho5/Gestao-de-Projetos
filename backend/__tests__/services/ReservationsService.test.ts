// __tests__/services/ReservationsService.test.ts
import { prisma } from '../../src/lib/prisma.js';
import { ReservationsService } from '../../src/services/reservations.service.js';
import { stockMovementService } from '../../src/services/stockMovement.service.js';

// Mock do Prisma
jest.mock('../../src/lib/prisma.js', () => ({
  prisma: {
    reservation: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    part: {
      findUnique: jest.fn(),
    },
  },
}));

// Mock do stockMovementService
jest.mock('../../src/services/stockMovement.service.js', () => ({
  stockMovementService: {
    recordExit: jest.fn(),
    recordReturn: jest.fn(),
  },
}));

// Mock das enums que seriam importadas do @prisma/client
// Como estamos em ambiente de teste, podemos usar strings literais, mas para typings, criamos types:
type ReservationStatus =
  | 'PENDING'
  | 'IN_PREPARATION'
  | 'READY_TO_SHIP'
  | 'COMPLETED'
  | 'CONFIRMED'
  | 'CANCELLED';

type CancelReason = 'DESIST' | 'RETURN' | 'DAMAGED_RETURN';

const ReservationStatusEnum = {
  PENDING: 'PENDING' as ReservationStatus,
  IN_PREPARATION: 'IN_PREPARATION' as ReservationStatus,
  READY_TO_SHIP: 'READY_TO_SHIP' as ReservationStatus,
  COMPLETED: 'COMPLETED' as ReservationStatus,
  CONFIRMED: 'CONFIRMED' as ReservationStatus,
  CANCELLED: 'CANCELLED' as ReservationStatus
};

const CancelReasonEnum = {
  DESIST: 'DESIST' as CancelReason,
  RETURN: 'RETURN' as CancelReason,
  DAMAGED_RETURN: 'DAMAGED_RETURN' as CancelReason
};

describe('ReservationsService', () => {
  const mockUserId = 1;
  const mockPartId = 1;
  const mockReservationId = 1;
  const mockWarehouseUserId = 2;
  
  const mockPart = {
    id: mockPartId,
    name: 'Test Part',
    refInternal: 'PART-001',
    deletedAt: null,
  };

  const mockReservation = {
    id: mockReservationId,
    userId: mockUserId,
    partId: mockPartId,
    status: ReservationStatusEnum.PENDING,
    assignedToId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    notes: null,
    cancelReason: null,
    cancelledAt: null,
    returnLocationId: null,
    user: { id: mockUserId, username: 'testuser', fullName: 'Test User' },
    part: { 
      id: mockPartId, 
      name: 'Test Part', 
      refInternal: 'PART-001',
      location: { id: 1, fullCode: 'LOC-001' }
    },
    assignedTo: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createReservation', () => {
    it('should create a new reservation successfully', async () => {
      (prisma.part.findUnique as jest.Mock).mockResolvedValue(mockPart);
      (prisma.reservation.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.reservation.create as jest.Mock).mockResolvedValue(mockReservation);

      const result = await ReservationsService.createReservation(mockUserId, mockPartId, 'Test notes');

      expect(prisma.part.findUnique).toHaveBeenCalledWith({ 
        where: { id: mockPartId },
        select: { id: true, name: true, deletedAt: true }
      });
      expect(prisma.reservation.findFirst).toHaveBeenCalled();
      expect(prisma.reservation.create).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          partId: mockPartId,
          notes: 'Test notes',
          status: ReservationStatusEnum.PENDING
        },
        include: {
          user: { select: { id: true, username: true, fullName: true } },
          part: { select: { id: true, name: true, refInternal: true } }
        }
      });
      expect(result).toEqual(mockReservation);
    });

    it('should throw error when part not found', async () => {
      (prisma.part.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(ReservationsService.createReservation(mockUserId, mockPartId))
        .rejects.toThrow('Part not found');
    });

    it('should throw error when part already has active reservation', async () => {
      (prisma.part.findUnique as jest.Mock).mockResolvedValue(mockPart);
      (prisma.reservation.findFirst as jest.Mock).mockResolvedValue(mockReservation);

      await expect(ReservationsService.createReservation(mockUserId, mockPartId))
        .rejects.toThrow('Part already has an active reservation');
    });
  });

  describe('getReservations', () => {
    it('should return all reservations without filters', async () => {
      const mockReservations = [mockReservation];
      (prisma.reservation.findMany as jest.Mock).mockResolvedValue(mockReservations);

      const result = await ReservationsService.getReservations();

      expect(prisma.reservation.findMany).toHaveBeenCalledWith({
        where: {},
        include: {
          user: { select: { id: true, username: true, fullName: true } },
          assignedTo: { select: { id: true, username: true, fullName: true } },
          part: { 
            select: { 
              id: true, 
              name: true, 
              refInternal: true,
              location: { select: { id: true, fullCode: true } }
            } 
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      expect(result).toEqual(mockReservations);
    });

    it('should filter reservations by status', async () => {
      const mockReservations = [mockReservation];
      (prisma.reservation.findMany as jest.Mock).mockResolvedValue(mockReservations);

      const filters = { status: ReservationStatusEnum.PENDING };
      const result = await ReservationsService.getReservations(filters);

      expect(prisma.reservation.findMany).toHaveBeenCalledWith({
        where: { status: ReservationStatusEnum.PENDING },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' }
      });
      expect(result).toEqual(mockReservations);
    });

    it('should filter reservations by userId', async () => {
      const mockReservations = [mockReservation];
      (prisma.reservation.findMany as jest.Mock).mockResolvedValue(mockReservations);

      const filters = { userId: mockUserId };
      const result = await ReservationsService.getReservations(filters);

      expect(prisma.reservation.findMany).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' }
      });
      expect(result).toEqual(mockReservations);
    });
  });

  describe('getReservationById', () => {
    it('should return reservation by id', async () => {
      const detailedReservation = {
        ...mockReservation,
        part: {
          ...mockReservation.part,
          location: { id: 1, name: 'Location 1', fullCode: 'LOC-001' },
          category: { id: 1, name: 'Category 1' },
          images: [{ id: 1, url: 'image.jpg' }]
        }
      };
      (prisma.reservation.findUnique as jest.Mock).mockResolvedValue(detailedReservation);

      const result = await ReservationsService.getReservationById(mockReservationId);

      expect(prisma.reservation.findUnique).toHaveBeenCalledWith({
        where: { id: mockReservationId },
        include: {
          user: { select: { id: true, username: true, fullName: true } },
          assignedTo: { select: { id: true, username: true, fullName: true } },
          part: { 
            include: { 
              location: true,
              category: true,
              images: true
            } 
          }
        }
      });
      expect(result).toEqual(detailedReservation);
    });

    it('should throw error when reservation not found', async () => {
      (prisma.reservation.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(ReservationsService.getReservationById(999))
        .rejects.toThrow('Reservation not found');
    });
  });

  describe('assignReservation', () => {
    it('should assign reservation to warehouse user', async () => {
      const pendingReservation = { ...mockReservation, status: ReservationStatusEnum.PENDING, assignedToId: null };
      const assignedReservation = { 
        ...pendingReservation, 
        status: ReservationStatusEnum.IN_PREPARATION, 
        assignedToId: mockWarehouseUserId,
        assignedTo: { id: mockWarehouseUserId, username: 'warehouse', fullName: 'Warehouse User' }
      };

      (prisma.reservation.findUnique as jest.Mock).mockResolvedValue(pendingReservation);
      (prisma.reservation.update as jest.Mock).mockResolvedValue(assignedReservation);

      const result = await ReservationsService.assignReservation(mockReservationId, mockWarehouseUserId);

      expect(prisma.reservation.findUnique).toHaveBeenCalledWith({
        where: { id: mockReservationId }
      });
      expect(prisma.reservation.update).toHaveBeenCalledWith({
        where: { id: mockReservationId },
        data: {
          assignedToId: mockWarehouseUserId,
          status: ReservationStatusEnum.IN_PREPARATION
        },
        include: {
          user: { select: { id: true, username: true, fullName: true } },
          assignedTo: { select: { id: true, username: true, fullName: true } },
          part: { select: { id: true, name: true, refInternal: true } }
        }
      });
      expect(result.status).toBe(ReservationStatusEnum.IN_PREPARATION);
      expect(result.assignedToId).toBe(mockWarehouseUserId);
    });

    it('should throw error when reservation not found', async () => {
      (prisma.reservation.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(ReservationsService.assignReservation(mockReservationId, mockWarehouseUserId))
        .rejects.toThrow('Reservation not found');
    });

    it('should throw error when reservation not PENDING', async () => {
      const inPrepReservation = { ...mockReservation, status: ReservationStatusEnum.IN_PREPARATION };
      (prisma.reservation.findUnique as jest.Mock).mockResolvedValue(inPrepReservation);

      await expect(ReservationsService.assignReservation(mockReservationId, mockWarehouseUserId))
        .rejects.toThrow('Only PENDING reservations can be assigned');
    });

    it('should throw error when reservation already assigned', async () => {
      const assignedReservation = { ...mockReservation, status: ReservationStatusEnum.PENDING, assignedToId: 3 };
      (prisma.reservation.findUnique as jest.Mock).mockResolvedValue(assignedReservation);

      await expect(ReservationsService.assignReservation(mockReservationId, mockWarehouseUserId))
        .rejects.toThrow('Reservation already assigned');
    });
  });

  describe('updateStatus', () => {
    it('should update status from PENDING to IN_PREPARATION', async () => {
      const pendingReservation = { ...mockReservation, status: ReservationStatusEnum.PENDING };
      const updatedReservation = { ...pendingReservation, status: ReservationStatusEnum.IN_PREPARATION };

      (prisma.reservation.findUnique as jest.Mock).mockResolvedValue(pendingReservation);
      (prisma.reservation.update as jest.Mock).mockResolvedValue(updatedReservation);

      const result = await ReservationsService.updateStatus(
        mockReservationId, 
        ReservationStatusEnum.IN_PREPARATION, 
        mockWarehouseUserId
      );

      expect(prisma.reservation.update).toHaveBeenCalledWith({
        where: { id: mockReservationId },
        data: { status: ReservationStatusEnum.IN_PREPARATION },
        include: expect.any(Object)
      });
      expect(result.status).toBe(ReservationStatusEnum.IN_PREPARATION);
    });

    it('should update status to COMPLETED and record exit', async () => {
      const readyReservation = { 
        ...mockReservation, 
        status: ReservationStatusEnum.READY_TO_SHIP, 
        assignedToId: mockWarehouseUserId,
        partId: mockPartId
      };
      const completedReservation = { ...readyReservation, status: ReservationStatusEnum.COMPLETED };

      (prisma.reservation.findUnique as jest.Mock).mockResolvedValue(readyReservation);
      (prisma.reservation.update as jest.Mock).mockResolvedValue(completedReservation);
      (stockMovementService.recordExit as jest.Mock).mockResolvedValue(undefined);

      const result = await ReservationsService.updateStatus(
        mockReservationId, 
        ReservationStatusEnum.COMPLETED, 
        mockWarehouseUserId
      );

      expect(stockMovementService.recordExit).toHaveBeenCalledWith(mockPartId, mockWarehouseUserId);
      expect(result.status).toBe(ReservationStatusEnum.COMPLETED);
    });

    it('should throw error when status transition not allowed', async () => {
      const pendingReservation = { ...mockReservation, status: ReservationStatusEnum.PENDING };
      (prisma.reservation.findUnique as jest.Mock).mockResolvedValue(pendingReservation);

      await expect(ReservationsService.updateStatus(
        mockReservationId, 
        ReservationStatusEnum.COMPLETED, // Cannot go from PENDING directly to COMPLETED
        mockWarehouseUserId
      )).rejects.toThrow('Cannot transition from PENDING to COMPLETED');
    });

    it('should throw error when user not authorized', async () => {
      const inPrepReservation = { 
        ...mockReservation, 
        status: ReservationStatusEnum.IN_PREPARATION, 
        assignedToId: 3 // Different user
      };
      (prisma.reservation.findUnique as jest.Mock).mockResolvedValue(inPrepReservation);

      await expect(ReservationsService.updateStatus(
        mockReservationId, 
        ReservationStatusEnum.READY_TO_SHIP, 
        mockWarehouseUserId
      )).rejects.toThrow('Only the assigned user can update this reservation');
    });
  });

  describe('cancelReservation', () => {
    it('should cancel PENDING reservation with DESIST reason', async () => {
      const pendingReservation = { ...mockReservation, status: ReservationStatusEnum.PENDING, part: mockPart };
      const cancelledReservation = { 
        ...pendingReservation, 
        status: ReservationStatusEnum.CANCELLED, 
        cancelReason: CancelReasonEnum.DESIST,
        cancelledAt: new Date(),
        returnLocation: null
      };

      (prisma.reservation.findUnique as jest.Mock).mockResolvedValue(pendingReservation);
      (prisma.reservation.update as jest.Mock).mockResolvedValue(cancelledReservation);

      const result = await ReservationsService.cancelReservation(
        mockReservationId,
        mockUserId,
        CancelReasonEnum.DESIST
      );

      expect(prisma.reservation.update).toHaveBeenCalled();
      expect(result.status).toBe(ReservationStatusEnum.CANCELLED);
      expect(result.cancelReason).toBe(CancelReasonEnum.DESIST);
      expect(stockMovementService.recordReturn).not.toHaveBeenCalled();
    });

    it('should cancel COMPLETED reservation with RETURN reason', async () => {
      const completedReservation = { 
        ...mockReservation, 
        status: ReservationStatusEnum.COMPLETED, 
        part: mockPart 
      };
      const cancelledReservation = { 
        ...completedReservation, 
        status: ReservationStatusEnum.CANCELLED, 
        cancelReason: CancelReasonEnum.RETURN,
        cancelledAt: new Date(),
        returnLocationId: 1
      };

      (prisma.reservation.findUnique as jest.Mock).mockResolvedValue(completedReservation);
      (prisma.reservation.update as jest.Mock).mockResolvedValue(cancelledReservation);
      (stockMovementService.recordReturn as jest.Mock).mockResolvedValue(undefined);

      const result = await ReservationsService.cancelReservation(
        mockReservationId,
        mockUserId,
        CancelReasonEnum.RETURN,
        1 // returnLocationId
      );

      expect(stockMovementService.recordReturn).toHaveBeenCalledWith({
        partId: mockPartId,
        userId: mockUserId,
        toLocationId: 1,
        isDamaged: false
      });
      expect(result.status).toBe(ReservationStatusEnum.CANCELLED);
      expect(result.cancelReason).toBe(CancelReasonEnum.RETURN);
    });

    it('should cancel COMPLETED reservation with DAMAGED_RETURN reason', async () => {
      const completedReservation = { 
        ...mockReservation, 
        status: ReservationStatusEnum.COMPLETED, 
        part: mockPart 
      };
      const cancelledReservation = { 
        ...completedReservation, 
        status: ReservationStatusEnum.CANCELLED, 
        cancelReason: CancelReasonEnum.DAMAGED_RETURN,
        cancelledAt: new Date()
      };

      (prisma.reservation.findUnique as jest.Mock).mockResolvedValue(completedReservation);
      (prisma.reservation.update as jest.Mock).mockResolvedValue(cancelledReservation);
      (stockMovementService.recordReturn as jest.Mock).mockResolvedValue(undefined);

      const result = await ReservationsService.cancelReservation(
        mockReservationId,
        mockUserId,
        CancelReasonEnum.DAMAGED_RETURN
      );

      expect(stockMovementService.recordReturn).toHaveBeenCalledWith({
        partId: mockPartId,
        userId: mockUserId,
        toLocationId: undefined,
        isDamaged: true
      });
      expect(result.status).toBe(ReservationStatusEnum.CANCELLED);
      expect(result.cancelReason).toBe(CancelReasonEnum.DAMAGED_RETURN);
    });

    it('should throw error when cancelling CONFIRMED reservation', async () => {
      const confirmedReservation = { 
        ...mockReservation, 
        status: ReservationStatusEnum.CONFIRMED, 
        part: mockPart 
      };
      (prisma.reservation.findUnique as jest.Mock).mockResolvedValue(confirmedReservation);

      await expect(ReservationsService.cancelReservation(
        mockReservationId,
        mockUserId,
        CancelReasonEnum.DESIST
      )).rejects.toThrow('Cannot cancel a confirmed reservation');
    });

    it('should throw error when already cancelled', async () => {
      const cancelledReservation = { 
        ...mockReservation, 
        status: ReservationStatusEnum.CANCELLED, 
        part: mockPart 
      };
      (prisma.reservation.findUnique as jest.Mock).mockResolvedValue(cancelledReservation);

      await expect(ReservationsService.cancelReservation(
        mockReservationId,
        mockUserId,
        CancelReasonEnum.DESIST
      )).rejects.toThrow('Reservation already cancelled');
    });

    it('should throw error when missing returnLocationId for RETURN', async () => {
      const completedReservation = { 
        ...mockReservation, 
        status: ReservationStatusEnum.COMPLETED, 
        part: mockPart 
      };
      (prisma.reservation.findUnique as jest.Mock).mockResolvedValue(completedReservation);

      await expect(ReservationsService.cancelReservation(
        mockReservationId,
        mockUserId,
        CancelReasonEnum.RETURN
        // No returnLocationId
      )).rejects.toThrow('returnLocationId is required for RETURN');
    });

    it('should throw error when using DESIST after delivery', async () => {
      const completedReservation = { 
        ...mockReservation, 
        status: ReservationStatusEnum.COMPLETED, 
        part: mockPart 
      };
      (prisma.reservation.findUnique as jest.Mock).mockResolvedValue(completedReservation);

      await expect(ReservationsService.cancelReservation(
        mockReservationId,
        mockUserId,
        CancelReasonEnum.DESIST
      )).rejects.toThrow('Cannot use DESIST reason after part was delivered');
    });

    it('should throw error when using RETURN/DAMAGED_RETURN before delivery', async () => {
      const pendingReservation = { 
        ...mockReservation, 
        status: ReservationStatusEnum.PENDING, 
        part: mockPart 
      };
      (prisma.reservation.findUnique as jest.Mock).mockResolvedValue(pendingReservation);

      await expect(ReservationsService.cancelReservation(
        mockReservationId,
        mockUserId,
        CancelReasonEnum.RETURN,
        1
      )).rejects.toThrow('Use DESIST reason before part is delivered');
    });
  });

  describe('getPendingReservations', () => {
    it('should return pending reservations', async () => {
      const mockReservations = [mockReservation];
      // Mock the internal call to getReservations
      const spy = jest.spyOn(ReservationsService, 'getReservations');
      spy.mockResolvedValue(mockReservations);

      const result = await ReservationsService.getPendingReservations();

      expect(spy).toHaveBeenCalledWith({ status: ReservationStatusEnum.PENDING });
      expect(result).toEqual(mockReservations);
      
      spy.mockRestore();
    });
  });

  describe('getMyAssignedReservations', () => {
    it('should return assigned reservations for warehouse user', async () => {
      const mockReservations = [mockReservation];
      (prisma.reservation.findMany as jest.Mock).mockResolvedValue(mockReservations);

      const result = await ReservationsService.getMyAssignedReservations(mockWarehouseUserId);

      expect(prisma.reservation.findMany).toHaveBeenCalledWith({
        where: {
          assignedToId: mockWarehouseUserId,
          status: {
            in: [ReservationStatusEnum.IN_PREPARATION, ReservationStatusEnum.READY_TO_SHIP]
          }
        },
        include: {
          user: { select: { id: true, username: true, fullName: true } },
          part: { 
            select: { 
              id: true, 
              name: true, 
              refInternal: true,
              location: { select: { id: true, fullCode: true } }
            } 
          }
        },
        orderBy: { updatedAt: 'desc' }
      });
      expect(result).toEqual(mockReservations);
    });
  });
});
import { Router } from 'express';
import { ReservationsController } from '../controllers/reservations.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/roles.middleware.js';
import { UserRole } from '@prisma/client';

const router = Router();

// Rotas que requerem autenticação
// SALES pode criar reservas
router.post('/', authenticate, requireRole(UserRole.SALES, UserRole.ADMIN), ReservationsController.createReservation);

// Listar reservas (SALES, WAREHOUSE, ADMIN)
router.get('/', authenticate, requireRole(UserRole.SALES, UserRole.WAREHOUSE, UserRole.ADMIN), ReservationsController.getReservations);

// Listar reservas pendentes (WAREHOUSE, ADMIN)
router.get('/pending', authenticate, requireRole(UserRole.WAREHOUSE, UserRole.ADMIN), ReservationsController.getPendingReservations);

// Listar minhas reservas assumidas (WAREHOUSE)
router.get('/my-assigned', authenticate, requireRole(UserRole.WAREHOUSE), ReservationsController.getMyAssignedReservations);

// Obter detalhes de uma reserva (SALES, WAREHOUSE, ADMIN)
router.get('/:id', authenticate, requireRole(UserRole.SALES, UserRole.WAREHOUSE, UserRole.ADMIN), ReservationsController.getReservationById);

// WAREHOUSE assume preparação
router.post('/:id/assign', authenticate, requireRole(UserRole.WAREHOUSE), ReservationsController.assignReservation);

// Atualizar status (WAREHOUSE para avançar, SALES/ADMIN para cancelar)
router.patch('/:id/status', authenticate, requireRole(UserRole.SALES, UserRole.WAREHOUSE, UserRole.ADMIN), ReservationsController.updateStatus);

// Cancelar reserva (SALES, WAREHOUSE, ADMIN)
router.post('/:id/cancel', authenticate, requireRole(UserRole.SALES, UserRole.WAREHOUSE, UserRole.ADMIN), ReservationsController.cancelReservation);

export { router as reservationsRouter };

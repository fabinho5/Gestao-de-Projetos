import { Router } from 'express';
import { StockMovementController } from '../controllers/stockMovement.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/roles.middleware.js';
import { UserRole } from '@prisma/client';

const router = Router();

// ============================================
// MOVIMENTOS DE STOCK
// ============================================

// Entrada de peça no armazém (WAREHOUSE, ADMIN)
router.post(
    '/entry',
    authenticate,
    requireRole(UserRole.WAREHOUSE, UserRole.ADMIN),
    StockMovementController.recordEntry
);

// Saída de peça do armazém (WAREHOUSE, ADMIN)
router.post(
    '/exit',
    authenticate,
    requireRole(UserRole.WAREHOUSE, UserRole.ADMIN),
    StockMovementController.recordExit
);

// Transferência entre localizações (WAREHOUSE, ADMIN)
router.post(
    '/transfer',
    authenticate,
    requireRole(UserRole.WAREHOUSE, UserRole.ADMIN),
    StockMovementController.recordTransfer
);

// Devolução de peça (WAREHOUSE, ADMIN)
router.post(
    '/return',
    authenticate,
    requireRole(UserRole.WAREHOUSE, UserRole.ADMIN),
    StockMovementController.recordReturn
);

// Ajuste manual (ADMIN apenas)
router.post(
    '/adjustment',
    authenticate,
    requireRole(UserRole.ADMIN),
    StockMovementController.recordAdjustment
);

// ============================================
// CONSULTAS
// ============================================

// Histórico de movimentos de uma peça (WAREHOUSE, ADMIN)
router.get(
    '/part/:partId',
    authenticate,
    requireRole(UserRole.WAREHOUSE, UserRole.ADMIN),
    StockMovementController.getPartMovements
);

// Movimentos recentes para dashboard (WAREHOUSE, ADMIN)
router.get(
    '/recent',
    authenticate,
    requireRole(UserRole.WAREHOUSE, UserRole.ADMIN),
    StockMovementController.getRecentMovements
);

// Lista localizações disponíveis (WAREHOUSE, ADMIN)
// Retorna dados amigáveis para UI: warehouse, rack, shelf, pallet, capacidade
router.get(
    '/locations',
    authenticate,
    requireRole(UserRole.WAREHOUSE, UserRole.ADMIN),
    StockMovementController.getAvailableLocations
);

export { router as stockMovementRouter };

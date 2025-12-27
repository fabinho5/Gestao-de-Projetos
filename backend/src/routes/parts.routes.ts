import { Router } from 'express';
import { PartsController } from '../controllers/parts.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/roles.middleware.js';
import { UserRole } from '@prisma/client';

const router = Router();

// Qualquer utilizador autenticado pode ver peças
router.get(
  '/',
  authenticate,
  requireRole(UserRole.CLIENT, UserRole.SALES, UserRole.WAREHOUSE, UserRole.ADMIN),
  PartsController.getAllParts
);

router.get(
  '/:ref',
  authenticate,
  requireRole(UserRole.CLIENT, UserRole.SALES, UserRole.WAREHOUSE, UserRole.ADMIN),
  PartsController.getPartById
);

router.post(
  "/",
  authenticate,
  requireRole(UserRole.WAREHOUSE, UserRole.SALES, UserRole.ADMIN),
  PartsController.createPart
);

router.delete(
  '/:ref',
  authenticate,
  requireRole(UserRole.ADMIN),
  PartsController.deletePart
);

export { router as partsRouter };
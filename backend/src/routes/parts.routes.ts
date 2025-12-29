import { Router } from 'express';
import { PartsController } from '../controllers/parts.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/roles.middleware.js';
import { uploadPartImage } from '../middlewares/upload.middleware.js';
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
  '/search',
  authenticate,
  requireRole(UserRole.CLIENT, UserRole.SALES, UserRole.WAREHOUSE, UserRole.ADMIN),
  PartsController.searchParts
);

router.get(
  '/:ref/history',
  authenticate,
  requireRole(UserRole.CLIENT, UserRole.SALES, UserRole.WAREHOUSE, UserRole.ADMIN),
  PartsController.getPartHistory
);

router.get(
  '/:ref',
  authenticate,
  requireRole(UserRole.CLIENT, UserRole.SALES, UserRole.WAREHOUSE, UserRole.ADMIN),
  PartsController.getPartById
);

router.get(
  '/categories/list',
  authenticate,
  requireRole(UserRole.CLIENT, UserRole.SALES, UserRole.WAREHOUSE, UserRole.ADMIN),
  PartsController.getCategories
);

router.get(
  '/specifications/list',
  authenticate,
  requireRole(UserRole.CLIENT, UserRole.SALES, UserRole.WAREHOUSE, UserRole.ADMIN),
  PartsController.getSpecifications
);

router.post(
  "/",
  authenticate,
  requireRole(UserRole.WAREHOUSE, UserRole.SALES, UserRole.ADMIN),
  PartsController.createPart
);

router.patch(
  '/:ref',
  authenticate,
  requireRole(UserRole.WAREHOUSE, UserRole.SALES, UserRole.ADMIN),
  PartsController.updatePart
);

router.delete(
  '/:ref',
  authenticate,
  requireRole(UserRole.ADMIN),
  PartsController.deletePart
);

router.patch(
  '/:ref/visibility',
  authenticate,
  requireRole(UserRole.WAREHOUSE, UserRole.SALES, UserRole.ADMIN),
  PartsController.setVisibility
);

router.post(
  '/:ref/images',
  authenticate,
  requireRole(UserRole.WAREHOUSE, UserRole.SALES, UserRole.ADMIN),
  uploadPartImage.single('image'),
  PartsController.addImage
);

router.delete(
  '/:ref/images/:imageId',
  authenticate,
  requireRole(UserRole.WAREHOUSE, UserRole.SALES, UserRole.ADMIN),
  PartsController.deleteImage
);

router.patch(
  '/:ref/images/:imageId/main',
  authenticate,
  requireRole(UserRole.WAREHOUSE, UserRole.SALES, UserRole.ADMIN),
  PartsController.setMainImage
);

export { router as partsRouter };
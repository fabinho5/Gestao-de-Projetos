import { Router } from 'express';
import { WarehouseController } from '../controllers/warehouse.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/roles.middleware.js';
import { UserRole } from '@prisma/client';

const router = Router();

router.get(
  '/',
  authenticate,
  requireRole(UserRole.WAREHOUSE, UserRole.ADMIN),
  WarehouseController.list
);

router.post(
  '/',
  authenticate,
  requireRole(UserRole.ADMIN),
  WarehouseController.create
);

router.get(
  '/:id',
  authenticate,
  requireRole(UserRole.WAREHOUSE, UserRole.ADMIN),
  WarehouseController.show
);

router.post(
  '/:id/locations',
  authenticate,
  requireRole(UserRole.ADMIN),
  WarehouseController.createLocation
);

router.get(
  '/:id/locations',
  authenticate,
  requireRole(UserRole.WAREHOUSE, UserRole.ADMIN),
  WarehouseController.listLocations
);

router.patch(
  '/locations/:id',
  authenticate,
  requireRole(UserRole.ADMIN),
  WarehouseController.updateLocation
);

router.get(
  '/locations',
  authenticate,
  requireRole(UserRole.WAREHOUSE, UserRole.ADMIN),
  WarehouseController.searchLocations
);

router.get(
  '/locations/available',
  authenticate,
  requireRole(UserRole.WAREHOUSE, UserRole.ADMIN),
  WarehouseController.listAvailableLocations
);

router.get(
  '/locations/:id/capacity-check',
  authenticate,
  requireRole(UserRole.WAREHOUSE, UserRole.ADMIN),
  WarehouseController.capacityCheck
);

export { router as warehouseRouter };
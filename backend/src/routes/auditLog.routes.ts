import { Router } from 'express';
import { AuditLogController } from '../controllers/auditLog.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/roles.middleware.js';
import { UserRole } from '@prisma/client';

// Routes that expose the audit log read API only to authenticated admins.
const router = Router();

router.get('/', authenticate, requireRole(UserRole.ADMIN), AuditLogController.getLogs);
router.get('/:id', authenticate, requireRole(UserRole.ADMIN), AuditLogController.getLogById);

export { router as auditLogRouter };

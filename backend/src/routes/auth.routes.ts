import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/roles.middleware.js';
import { loginLimiter, refreshLimiter } from '../middlewares/rateLimit.middleware.js';
import { UserRole } from '@prisma/client';

const router = Router();

router.post('/login', loginLimiter, AuthController.login);
router.post('/refresh', refreshLimiter, AuthController.refresh);
router.post('/logout', authenticate, AuthController.logout);
router.get('/me', authenticate, AuthController.getProfile);
router.post('/change-password', authenticate, requireRole(UserRole.ADMIN), AuthController.changePassword);
router.post('/register', authenticate, requireRole(UserRole.ADMIN), AuthController.register);
router.post('/admin/reset-password', authenticate, requireRole(UserRole.ADMIN), AuthController.adminResetPassword);

export { router as authRouter };
import { Request, Response } from 'express';
import { UsersService } from '../services/users.service.js';
import { Logger } from '../utils/logger.js';
import { UserRole } from '@prisma/client';

export class UsersController {

    static async getAllUsers(req: Request, res: Response) {
        try {
            const { role, isActive } = req.query;

            const filters: any = {};
            if (role && Object.values(UserRole).includes(role as UserRole)) {
                filters.role = role;
            }
            if (isActive !== undefined) {
                filters.isActive = isActive === 'true';
            }

            const users = await UsersService.getAllUsers(filters);
            Logger.info(`Admin ${req.user?.username} listed users (count=${users.length}, reqId=${req.headers['x-request-id'] || 'n/a'})`);
            return res.status(200).json(users);

        } catch (error: any) {
            Logger.error(`List users failed (adminId=${req.user?.id}, reqId=${req.headers['x-request-id'] || 'n/a'})`, error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    static async getUserById(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const userId = parseInt(id);

            if (isNaN(userId)) {
                return res.status(400).json({ message: 'Invalid user ID' });
            }

            const user = await UsersService.getUserById(userId);
            Logger.info(`Admin ${req.user?.username} viewed user ${id} (reqId=${req.headers['x-request-id'] || 'n/a'})`);
            return res.status(200).json(user);

        } catch (error: any) {
            Logger.error(`Get user failed (adminId=${req.user?.id}, reqId=${req.headers['x-request-id'] || 'n/a'})`, error);

            if (error.message === 'User not found') {
                return res.status(404).json({ message: 'User not found' });
            }

            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    static async updateUser(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { username, email, fullName, role } = req.body;
            const userId = parseInt(id);

            if (isNaN(userId)) {
                return res.status(400).json({ message: 'Invalid user ID' });
            }

            if (!username && !email && !fullName && !role) {
                return res.status(400).json({ message: 'At least one field (username, email, fullName, role) must be provided' });
            }

            if (role && !Object.values(UserRole).includes(role)) {
                return res.status(400).json({ message: `Invalid role. Must be one of: ${Object.values(UserRole).join(', ')}` });
            }

            const updatedUser = await UsersService.updateUser(userId, { username, email, fullName, role });
            Logger.info(`Admin ${req.user?.username} updated user ${id} (reqId=${req.headers['x-request-id'] || 'n/a'})`);
            return res.status(200).json(updatedUser);

        } catch (error: any) {
            Logger.error(`Update user failed (adminId=${req.user?.id}, reqId=${req.headers['x-request-id'] || 'n/a'})`, error);

            if (error.message === 'User not found') {
                return res.status(404).json({ message: 'User not found' });
            }

            if (error.message === 'Username already exists') {
                return res.status(409).json({ message: 'Username already exists' });
            }

            if (error.message === 'Email already exists') {
                return res.status(409).json({ message: 'Email already exists' });
            }

            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    static async deactivateUser(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const userId = parseInt(id);

            if (isNaN(userId)) {
                return res.status(400).json({ message: 'Invalid user ID' });
            }

            const deactivatedUser = await UsersService.deactivateUser(userId);
            Logger.info(`Admin ${req.user?.username} deactivated user ${id} (reqId=${req.headers['x-request-id'] || 'n/a'})`);
            return res.status(200).json(deactivatedUser);

        } catch (error: any) {
            Logger.error(`Deactivate user failed (adminId=${req.user?.id}, reqId=${req.headers['x-request-id'] || 'n/a'})`, error);

            if (error.message === 'User not found') {
                return res.status(404).json({ message: 'User not found' });
            }

            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    static async activateUser(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const userId = parseInt(id);

            if (isNaN(userId)) {
                return res.status(400).json({ message: 'Invalid user ID' });
            }

            const activatedUser = await UsersService.activateUser(userId);
            Logger.info(`Admin ${req.user?.username} activated user ${id} (reqId=${req.headers['x-request-id'] || 'n/a'})`);
            return res.status(200).json(activatedUser);

        } catch (error: any) {
            Logger.error(`Activate user failed (adminId=${req.user?.id}, reqId=${req.headers['x-request-id'] || 'n/a'})`, error);

            if (error.message === 'User not found') {
                return res.status(404).json({ message: 'User not found' });
            }

            return res.status(500).json({ message: 'Internal server error' });
        }
    }
}

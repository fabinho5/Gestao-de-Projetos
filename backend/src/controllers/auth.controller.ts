import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service.js';
import { Logger } from '../utils/logger.js';
import { UserRole } from '@prisma/client';
import { validators, validateFields } from '../utils/validators.js';


export class AuthController { 
    static async login(req: Request, res: Response) {
        const { username, password } = req.body;

        try {
            // Validação de inputs (login usa passwordLogin - sem regras de força)
            const validationError = validateFields([
                { field: 'username', error: validators.username(username) },
                { field: 'password', error: validators.passwordLogin(password) }
            ]);
            
            if (validationError) {
                return res.status(400).json({ message: validationError });
            }

            const result = await AuthService.login(username.trim(), password);
            Logger.info(`User ${username} logged in (id=${result.user.id}, reqId=${req.headers['x-request-id'] || 'n/a'})`);
            
            return res.status(200).json(result);

        } catch (error: any) {
            Logger.error(`Login failed (username=${username || 'n/a'}, reqId=${req.headers['x-request-id'] || 'n/a'})`, error);

            if (error.message === 'User not found' || error.message === 'Wrong password') {
                return res.status(401).json({ message: 'Invalid username or password' });
            }

            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    static async refresh(req: Request, res: Response) {
        try {
            const { refreshToken } = req.body;

            // Validação de input
            const validationError = validators.refreshToken(refreshToken);
            if (validationError) {
                return res.status(400).json({ message: validationError });
            }

            const result = await AuthService.refresh(refreshToken);

            Logger.info(`Refresh token used (reqId=${req.headers['x-request-id'] || 'n/a'})`);
            return res.status(200).json(result);

        } catch (error: any) {

            Logger.error(`Refresh failed (reqId=${req.headers['x-request-id'] || 'n/a'})`, error);

            if (
                error.message === "Invalid or expired refresh token" ||
                error.message === "Refresh token no longer valid"
            ) {
                return res.status(401).json({ message: error.message });
            }

            if (error.message === "User inactive") {
                return res.status(403).json({ message: "User is inactive" });
            }

            return res.status(500).json({ message: "Internal server error" });
        }
    }

    static async changePassword(req: Request, res: Response) {
        try {
            const user = req.user;
            if (!user) return res.status(401).json({ message: 'Not authenticated' });

            const { oldPassword, newPassword } = req.body;
            
            // Validação de inputs
            const validationError = validateFields([
                { field: 'oldPassword', error: validators.passwordLogin(oldPassword) },
                { field: 'newPassword', error: validators.password(newPassword) }
            ]);
            
            if (validationError) {
                return res.status(400).json({ message: validationError });
            }

            await AuthService.changePassword(user.id, oldPassword, newPassword);
            Logger.info(`User ${user.username} changed password (id=${user.id}, reqId=${req.headers['x-request-id'] || 'n/a'})`);
            return res.status(200).json({ message: 'Password changed' });
        } catch (error: any) {
            Logger.error('Change password failed', error);
            if (error.message === 'Wrong password') {
                return res.status(401).json({ message: 'Wrong password' });
            }
            if (error.message === 'User not found') {
                return res.status(404).json({ message: 'User not found' });
            }
            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    static async logout(req: Request, res: Response) {
        try {
            const user = req.user;
            if (!user) return res.status(401).json({ message: 'Not authenticated' });

            await AuthService.logout(user.id);
            Logger.info(`User ${user.username} logged out (id=${user.id}, reqId=${req.headers['x-request-id'] || 'n/a'})`);
            return res.status(200).json({ message: 'Logged out' });
        } catch (error: any) {
            Logger.error(`Logout failed (user=${req.user?.username || 'n/a'}, reqId=${req.headers['x-request-id'] || 'n/a'})`, error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    static async getProfile(req: Request, res: Response) {
        try {
            const user = req.user;
            if (!user) return res.status(401).json({ message: 'Not authenticated' });

            const profile = await AuthService.getProfile(user.id);
            return res.status(200).json(profile);
            
        } catch (error: any) {
            Logger.error(`Get profile failed (userId=${req.user?.id || 'n/a'}, reqId=${req.headers['x-request-id'] || 'n/a'})`, error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    static async adminResetPassword(req: Request, res: Response) {
        try {
            const admin = req.user;
            if (!admin) return res.status(401).json({ message: 'Not authenticated' });

            const { userId, newPassword } = req.body;

            // Validação de inputs
            const validationError = validateFields([
                { field: 'userId', error: validators.userId(userId) },
                { field: 'newPassword', error: validators.password(newPassword) }
            ]);
            
            if (validationError) {
                return res.status(400).json({ message: validationError });
            }

            const result = await AuthService.adminResetPassword(admin.id, userId, newPassword);
            
            Logger.info(`Admin ${admin.username} reset password for user ${result.username} (targetId=${userId}, adminId=${admin.id}, reqId=${req.headers['x-request-id'] || 'n/a'})`);
            
            return res.status(200).json({ message: 'Password reset successfully', userId: result.userId });

        } catch (error: any) {
            Logger.error(`Admin reset password failed (adminId=${req.user?.id}, reqId=${req.headers['x-request-id'] || 'n/a'})`, error);

            if (error.message === 'User not found') {
                return res.status(404).json({ message: 'User not found' });
            }

            if (error.message === 'Cannot reset own password. Use change password instead') {
                return res.status(400).json({ message: error.message });
            }

            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    static async register(req: Request, res: Response) {
        try {
            const { username, email, fullName, password, role } = req.body;

            // Validação de inputs
            const validationError = validateFields([
                { field: 'username', error: validators.username(username) },
                { field: 'email', error: validators.email(email) },
                { field: 'fullName', error: validators.fullName(fullName) },
                { field: 'password', error: validators.password(password) }
            ]);
            
            if (validationError) {
                return res.status(400).json({ message: validationError });
            }

            // Validação de role
            if (!role) {
                return res.status(400).json({ message: 'Role is required' });
            }
            
            if (!Object.values(UserRole).includes(role)) {
                return res.status(400).json({ message: `Invalid role. Must be one of: ${Object.values(UserRole).join(', ')}` });
            }

            const newUser = await AuthService.register(username.trim(), email?.trim() || null, fullName.trim(), password, role);
            Logger.info(`User registered (username=${username}, id=${newUser.id}, role=${role}, adminId=${req.user?.id}, reqId=${req.headers['x-request-id'] || 'n/a'})`);
            return res.status(201).json(newUser);

        } catch (error: any) {
            Logger.error(`Register failed (adminId=${req.user?.id}, reqId=${req.headers['x-request-id'] || 'n/a'})`, error);

            if (error.message === 'Username already exists') {
                return res.status(409).json({ message: 'Username already exists' });
            }

            if (error.message === 'Email already exists') {
                return res.status(409).json({ message: 'Email already exists' });
            }

            return res.status(500).json({ message: 'Internal server error' });
        }
    }
}  
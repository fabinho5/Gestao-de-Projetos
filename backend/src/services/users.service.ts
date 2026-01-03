import { prisma } from '../lib/prisma.js';
import { UserRole } from '@prisma/client';
import { auditLogService } from './auditLog.service.js';

export class UsersService {
    
    static async getAllUsers(filters?: { role?: UserRole, isActive?: boolean }) {
        const users = await prisma.user.findMany({
            where: {
                ...(filters?.role && { role: filters.role }),
                ...(filters?.isActive !== undefined && { isActive: filters.isActive })
            },
            select: {
                id: true,
                username: true,
                email: true,
                fullName: true,
                role: true,
                isActive: true,
                createdAt: true,
                updatedAt: true
            }
        });

        return users;
    }

    static async getUserById(userId: number) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                username: true,
                email: true,
                fullName: true,
                role: true,
                isActive: true,
                createdAt: true,
                updatedAt: true
            }
        });

        if (!user) throw new Error("User not found");

        return user;
    }

    static async updateUser(userId: number, data: { username?: string, email?: string, fullName?: string, role?: UserRole }, performedByUserId: number) {
        const existingUser = await prisma.user.findUnique({ where: { id: userId } });
        if (!existingUser) throw new Error("User not found");

        if (data.username && data.username !== existingUser.username) {
            const duplicate = await prisma.user.findUnique({ where: { username: data.username } });
            if (duplicate) throw new Error("Username already exists");
        }

        if (data.email && data.email !== existingUser.email) {
            const duplicate = await prisma.user.findUnique({ where: { email: data.email } });
            if (duplicate) throw new Error("Email already exists");
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                ...(data.username && { username: data.username }),
                ...(data.email && { email: data.email }),
                ...(data.fullName && { fullName: data.fullName }),
                ...(data.role && { role: data.role })
            },
            select: {
                id: true,
                username: true,
                email: true,
                fullName: true,
                role: true,
                isActive: true,
                createdAt: true,
                updatedAt: true
            }
        });

        const updatedFields = Object.entries({
            username: data.username,
            email: data.email,
            fullName: data.fullName,
            role: data.role
        })
            .filter(([key, value]) => value !== undefined && (existingUser as any)[key] !== value)
            .map(([key]) => key);

        if (updatedFields.length) {
            // Track which profile fields an admin changed.
            await auditLogService.record({
                userId: performedByUserId,
                action: 'USER_UPDATE',
                entity: 'USER',
                entityId: userId,
                details: {
                    targetUserId: userId,
                    updatedFields,
                },
            });
        }

        return updatedUser;
    }

    static async deactivateUser(userId: number, performedByUserId: number) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new Error("User not found");

        const deactivated = await prisma.user.update({
            where: { id: userId },
            data: {
                isActive: false,
                refreshToken: null
            },
            select: {
                id: true,
                username: true,
                email: true,
                fullName: true,
                role: true,
                isActive: true,
                createdAt: true,
                updatedAt: true
            }
        });

        // Remember every deactivation for compliance investigations.
        await auditLogService.record({
            userId: performedByUserId,
            action: 'USER_DEACTIVATE',
            entity: 'USER',
            entityId: userId,
            details: {
                targetUserId: userId,
            },
        });

        return deactivated;
    }

    static async activateUser(userId: number, performedByUserId: number) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new Error("User not found");

        const activated = await prisma.user.update({
            where: { id: userId },
            data: {
                isActive: true
            },
            select: {
                id: true,
                username: true,
                email: true,
                fullName: true,
                role: true,
                isActive: true,
                createdAt: true,
                updatedAt: true
            }
        });

        // Log when an admin reactivates a user account.
        await auditLogService.record({
            userId: performedByUserId,
            action: 'USER_ACTIVATE',
            entity: 'USER',
            entityId: userId,
            details: {
                targetUserId: userId,
            },
        });

        return activated;
    }
}

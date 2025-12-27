import { prisma } from '../lib/prisma.js';
import { UserRole } from '@prisma/client';

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

    static async updateUser(userId: number, data: { username?: string, email?: string, fullName?: string, role?: UserRole }) {
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

        return updatedUser;
    }

    static async deactivateUser(userId: number) {
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

        return deactivated;
    }

    static async activateUser(userId: number) {
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

        return activated;
    }
}

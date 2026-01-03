import { prisma } from '../lib/prisma.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { UserRole } from '@prisma/client';
import { auditLogService } from './auditLog.service.js';

export class AuthService {

    static async login(username: string, passwordRaw: string) {
        const user = await prisma.user.findUnique({ where: { username } });

        if (!user) throw new Error("User not found");

        const isPasswordValid = await bcrypt.compare(passwordRaw, user.passwordHash);
        if (!isPasswordValid) throw new Error("Wrong password");

        // ACCESS TOKEN (curto)
        const accessToken = jwt.sign(
        {
            id: user.id,
            username: user.username,
            role: user.role,
        },
        env.jwtSecret,
        { expiresIn: "30m" }
        );

        // REFRESH TOKEN (longo)
        const refreshToken = jwt.sign(
            { id: user.id },
            env.jwtSecret,
            { expiresIn: "7d" }
        );

        // Guardar refresh token na BD
        await prisma.user.update({
            where: { id: user.id },
            data: { refreshToken }
        });

        return {
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                username: user.username,
                fullName: user.fullName,
                role: user.role,
            },
        };
    }

    static async refresh(refreshToken: string) {
    // 1. Validar refresh token recebido
    let decoded: any;

    try {
        decoded = jwt.verify(refreshToken, env.jwtSecret);
    } catch {
        throw new Error("Invalid or expired refresh token");
    }

    // 2. Buscar user real na BD
    const user = await prisma.user.findUnique({
        where: { id: decoded.id }
    });

    if (!user) {
        throw new Error("User not found");
    }

    // 3. Check se o refreshToken enviado é o mesmo guardado na BD
    if (user.refreshToken !== refreshToken) {
        throw new Error("Refresh token no longer valid");
    }

    if (!user.isActive) {
        throw new Error("User inactive");
    }

    // 4. Gerar novo access token
    const newAccessToken = jwt.sign(
        {
            id: user.id,
            username: user.username,
            role: user.role,
        },
        env.jwtSecret,
        { expiresIn: "30m" }
    );

    // 5. Gerar novo refresh token (rotação)
    const newRefreshToken = jwt.sign({ id: user.id }, env.jwtSecret, { expiresIn: "7d" });

    // 6. Guardar novo refresh token na BD (revoga o anterior)
    await prisma.user.update({ where: { id: user.id }, data: { refreshToken: newRefreshToken } });

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
    }

    static async changePassword(userId: number, oldPassword: string, newPassword: string) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new Error("User not found");

        const isPasswordValid = await bcrypt.compare(oldPassword, user.passwordHash);
        if (!isPasswordValid) throw new Error("Wrong password");

        const hashed = await bcrypt.hash(newPassword, 10);

        await prisma.user.update({
            where: { id: userId },
            data: {
                passwordHash: hashed,
                passwordUpdatedAt: new Date(),
                refreshToken: null
            }
        });

        // Log user-initiated password changes for accountability.
        await auditLogService.record({
            userId,
            action: 'USER_PASSWORD_CHANGE',
            entity: 'USER',
            entityId: userId,
            details: {
                targetUserId: userId,
            },
        });
    }

    static async logout(userId: number) {
        await prisma.user.update({
            where: { id: userId },
            data: { refreshToken: null }
        });
    }

    static async getProfile(userId: number) {
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

    static async adminResetPassword(adminId: number, targetUserId: number, newPassword: string) {
        // Verificar se o utilizador alvo existe
        const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
        if (!targetUser) throw new Error("User not found");

        // Admin não pode resetar a própria password por este método (deve usar changePassword)
        if (adminId === targetUserId) {
            throw new Error("Cannot reset own password. Use change password instead");
        }

        const passwordHash = await bcrypt.hash(newPassword, 10);

        await prisma.user.update({
            where: { id: targetUserId },
            data: {
                passwordHash,
                passwordUpdatedAt: new Date(),
                refreshToken: null // Invalida sessões ativas do utilizador
            }
        });

        // Capture admin-triggered resets separately from self-service changes.
        await auditLogService.record({
            userId: adminId,
            action: 'USER_PASSWORD_RESET',
            entity: 'USER',
            entityId: targetUserId,
            details: {
                targetUserId: targetUserId,
            },
        });

        return { userId: targetUserId, username: targetUser.username };
    }

    static async register(
        username: string,
        email: string | null,
        fullName: string,
        passwordRaw: string,
        role: UserRole,
        createdByUserId: number
    ) {
        const existingUsername = await prisma.user.findUnique({ where: { username } });
        if (existingUsername) throw new Error("Username already exists");

        if (email) {
            const existingEmail = await prisma.user.findUnique({ where: { email } });
            if (existingEmail) throw new Error("Email already exists");
        }

        const passwordHash = await bcrypt.hash(passwordRaw, 10);

        const newUser = await prisma.user.create({
            data: { username, email: email || '', fullName, passwordHash, role }
        });

        // Track admin-created accounts to show who onboarded the user.
        await auditLogService.record({
            userId: createdByUserId,
            action: 'USER_CREATE',
            entity: 'USER',
            entityId: newUser.id,
            details: {
                targetUserId: newUser.id,
                role,
            },
        });

        return {
            id: newUser.id,
            username: newUser.username,
            email: newUser.email,
            fullName: newUser.fullName,
            role: newUser.role
        };
    }
}  
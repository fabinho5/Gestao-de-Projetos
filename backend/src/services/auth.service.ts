import { prisma } from '../lib/prisma.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

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
        { expiresIn: "30m" }   // <-- aqui, antes tinhas "15m"
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

    return { accessToken: newAccessToken };
}
}
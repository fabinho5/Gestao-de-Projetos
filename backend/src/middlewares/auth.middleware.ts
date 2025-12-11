import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';
import jwt from 'jsonwebtoken';
import { Logger } from '../utils/logger.js';
import { UserRole } from '@prisma/client';  
import { prisma } from '../lib/prisma.js';


export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ message: "NO_TOKEN_PROVIDED" });
    }

    const token = authHeader.startsWith("Bearer ")
        ? authHeader.slice(7)
        : authHeader;

    let decoded: any;

    try {

        // 1) VALIDAR TOKEN
        decoded = jwt.verify(token, env.jwtSecret);

    } catch (error: any) {
        
        if (error instanceof jwt.TokenExpiredError) {
            Logger.warn("Access token expired");
            return res.status(401).json({ message: "ACCESS_TOKEN_EXPIRED" }); 
        }

        Logger.warn(`Token verification failed: ${error.message}`);
        return res.status(401).json({ message: "INVALID_ACCESS_TOKEN" });
    }

    // 2) BUSCAR USER DA BD
    const dbUser = await prisma.user.findUnique({
        where: { id: decoded.id }
    });

    if (!dbUser) {
        return res.status(401).json({ message: "USER_NOT_FOUND" });
    }

    if (!dbUser.isActive) {
        return res.status(403).json({ message: "USER_INACTIVE" });
    }

    if (decoded.iat && decoded.iat * 1000 < dbUser.passwordUpdatedAt.getTime()) {
            return res.status(401).json({ message: "ACCESS_TOKEN_INVALIDATED_BY_PASSWORD_CHANGE" });
        }

        // Guardar o user real no request (usa o type global)
        req.user = {
            id: dbUser.id,
            username: dbUser.username,
            role: dbUser.role,
        };

        next();
};
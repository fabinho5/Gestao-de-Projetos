import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';
import jwt from 'jsonwebtoken';
import { Logger } from '../utils/logger.js';
import { UserRole } from '@prisma/client';  

interface TokenPayload {
    id: number;
    email: string;
    role: UserRole;
}

declare global {
    namespace Express {
        interface Request {
            user?: TokenPayload;
        }
    }
}

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ message: 'No token provided' });
    }
     // Extrai o token do header (remove "Bearer ")
    const token = authHeader.startsWith('Bearer ') 
        ? authHeader.slice(7) 
        : authHeader;
    try {
            // Verifica e descodifica o token
            const decoded = jwt.verify(token, env.jwtSecret) as TokenPayload;
            
            // Mete o user descodificado no request para usares depois
            req.user = decoded;
            
            Logger.debug(`Token verified successfully: userId=${decoded.id}`);
            
            // Chama o próximo middleware/controller
            next();
        } catch (error: any) {
        Logger.warn(`Token verification failed: ${error.message}`);
        return res.status(401).json({ message: 'Invalid or expired token' });
    }

}
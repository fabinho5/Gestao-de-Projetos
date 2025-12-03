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

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ message: 'No token provided' });
    }

    Logger.debug('Authorization header found', { authHeader });
}
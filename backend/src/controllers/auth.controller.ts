import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service.js';
import { Logger } from '../utils/logger.js';

export class AuthController { 
    static async login(req: Request, res: Response) {
        try {
            const { email, password } = req.body;
            
            if(!email || !password){
                return res.status(400).json({ message: 'Email and password are required' });
            }

            const result = await AuthService.login(email, password);
            Logger.info(`User ${email} logged in successfully`);
            
            return res.status(200).json(result);

        } catch (error: any) {
            Logger.warn(`Login failed: ${error.message}`);

            if (error.message === 'User not found' || error.message === 'Wrong password') {
                return res.status(401).json({ message: 'Invalid email or password' });
            }

            return res.status(500).json({ message: 'Internal server error' });
        }
    }
}
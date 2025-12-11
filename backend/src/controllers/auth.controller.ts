import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service.js';
import { Logger } from '../utils/logger.js';


export class AuthController { 
    static async login(req: Request, res: Response) {
        try {
            const { username, password } = req.body;
            
            if(!username || !password){
                return res.status(400).json({ message: 'Username and password are required' });
            }

            const result = await AuthService.login(username, password);
            Logger.info(`User ${username} logged in successfully`);
            
            return res.status(200).json(result);

        } catch (error: any) {
            Logger.warn(`Login failed: ${error.message}`);

            if (error.message === 'User not found' || error.message === 'Wrong password') {
                return res.status(401).json({ message: 'Invalid username or password' });
            }

            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    static async refresh(req: Request, res: Response) {
        try {
            const { refreshToken } = req.body;

            if (!refreshToken) {
                return res.status(400).json({ message: "Refresh token is required" });
            }

            const result = await AuthService.refresh(refreshToken);

            return res.status(200).json(result);

        } catch (error: any) {

            Logger.warn(`Refresh token failed: ${error.message}`);

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
}
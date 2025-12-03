import { prisma } from '../lib/prisma.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export class AuthService {

    static async login(email: string, passwordRaw: string){
        const user = await prisma.user.findUnique(
            {
                where: {email}
            }
        )

        if(!user){
            throw new Error('User not found');
        }

        const isPasswordValid = await bcrypt.compare(passwordRaw, user.passwordHash);

        if(!isPasswordValid){
            throw new Error('Wrong password');
        }

        // if we get to here, then everything is clear and we can 
        // generate token

        const token = jwt.sign(
            {id: user.id, email: user.email, role: user.role},
            env.jwtSecret, {expiresIn: '1d'}
        )

        return { token, user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role } };
    }
}
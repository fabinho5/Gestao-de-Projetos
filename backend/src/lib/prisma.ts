import { PrismaClient } from '@prisma/client';
import { env } from '../config/env.js';

//we need to set prisma as a global so that during development it doesn't create multiple instances of PrismaClient
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['query'], // Show SQL in the terminal for debugging
  });

if (env.nodeEnv !== 'production') globalForPrisma.prisma = prisma;
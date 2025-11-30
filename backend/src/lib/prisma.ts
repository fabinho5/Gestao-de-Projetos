import { PrismaClient } from '@prisma/client';

//we need to set prisma as a global so that during development it doesn't create multiple instances of PrismaClient
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['query'], // Show SQL in the terminal for debugging
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
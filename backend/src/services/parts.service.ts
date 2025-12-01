import { prisma } from '../lib/prisma.js';

export class PartsService {
    static async getAllParts() {
        return prisma.part.findMany();
    }

    static async getPartById(ref: string) {
        return prisma.part.findUnique({
            where: { refInternal: ref },
        });
    }
}
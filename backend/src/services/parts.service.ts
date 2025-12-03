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

    static async createPart(data: { name: string; refInternal: string; description?: string; price: number; condition: string; categoryId: number}) {
    
    return prisma.part.create({
            data: {
                name: data.name,
                refInternal: data.refInternal,
                description: data.description,
                price: data.price,
                condition: data.condition,
                categoryId: data.categoryId,            
            }
        });
    }
}   
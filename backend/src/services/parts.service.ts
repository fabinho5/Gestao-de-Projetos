import { prisma } from '../lib/prisma.js';

export class PartsService {
    
   
    static async getAllParts() {
        return prisma.part.findMany({
            include: { 
                category: true,
                location: true,
                images: true
            }
        });
    }

    static async getPartById(ref: string) {
        return prisma.part.findUnique({
            where: { refInternal: ref },
            include: { 
                category: true, 
                location: true,
                images: true
            }
        });
    }

    static async createPart(data: { 
        name: string; 
        refInternal: string; 
        description?: string; 
        price: number; 
        condition: string; 
        categoryId: number;
        locationId: number;
    }) {
    
        // emboram vamos ter uma api que diz quais estao disponiveis ou nao, devemos sempre garantir que nao ultrapassamos a capacidade
        // pois a api pode dar um erro e dar que um splot esta disponivel quando na verdade nao esta
        const location = await prisma.location.findUnique({
            where: { id: data.locationId },
            include: { 
                _count: {
                    select: { parts: true }
                }
            }
        });

        if (!location) {
            throw new Error('Localização não encontrada');
        }

        // Se o número de peças atuais >= capacidade total, bloqueia.
        if (location._count.parts >= location.capacity) {
            throw new Error(`A localização ${location.fullCode} está cheia! (${location._count.parts}/${location.capacity})`);
        }

        // se chegamos aq, ent podemos criar a peça
        return prisma.part.create({
            data: {
                name: data.name,
                refInternal: data.refInternal,
                description: data.description,
                price: data.price,
                condition: data.condition,
                categoryId: data.categoryId,
                locationId: data.locationId
            },
            include: { category: true, location: true }
        });
    }
}
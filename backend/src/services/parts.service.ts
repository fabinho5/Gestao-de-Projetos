import { prisma } from '../lib/prisma.js';

export class PartsService {
    
    static async getAllParts() {
        return prisma.part.findMany({
            include: { 
                category: true,
                location: true,
                images: true,
                // NOVO: Queremos ver as especificações quando listamos
                specifications: { include: { spec: true } } 
            }
        });
    }

    static async getPartById(ref: string) {
        return prisma.part.findUnique({
            where: { refInternal: ref },
            include: { 
                category: true, 
                location: true,
                images: true,
                // NOVO: Traz os valores e o nome da spec (ex: "Voltagem: 12V")
                specifications: { include: { spec: true } }
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
        // NOVO: Receber as specs (opcional), maybe no futuro isto vai passar a ser obrigatório, tenho de ver com o fabio ainda
        specifications?: { specId: number; value: string }[];
    }) {
    
        // verificamos a capacidade
        const location = await prisma.location.findUnique({
            where: { id: data.locationId },
            include: { 
                _count: { select: { parts: true } }
            }
        });

        if (!location) {
            throw new Error('Localização não encontrada');
        }

        if (location._count.parts >= location.capacity) {
            throw new Error(`A localização ${location.fullCode} está cheia! (${location._count.parts}/${location.capacity})`);
        }

        
        // se cheganmos aqui, é porque está tudo ok
        return prisma.part.create({
            data: {
                name: data.name,
                refInternal: data.refInternal,
                description: data.description,
                price: data.price,
                condition: data.condition,
                categoryId: data.categoryId,
                locationId: data.locationId,
                
                // NOVO: Gravar as especificações recebidas
                // O Prisma faz um loop automático e cria as linhas na tabela PartSpecification
                specifications: {
                    create: data.specifications // Ex: [{ specId: 1, value: "12" }]
                }
            },
            include: { category: true, location: true, specifications: true }
        });
    }
}
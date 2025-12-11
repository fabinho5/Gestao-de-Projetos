import { prisma } from '../lib/prisma.js';
import { PartCondition } from '@prisma/client';

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
        refOEM?: string;
        description?: string; 
        price: number; 
        condition: string; 
        categoryId: number;
        locationId: number;
        specifications?: { specId: number; value: string }[];
        subReferences?: string[];
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
                refOEM: data.refOEM,
                description: data.description,
                price: data.price,
                condition: data.condition as PartCondition, 
                
                categoryId: data.categoryId,
                locationId: data.locationId,
                
                specifications: {
                    create: data.specifications
                },

                // <--- NOVO: Gravar Sub-Referências
                // Transforma ["REF1", "REF2"] em [{ value: "REF1" }, { value: "REF2" }]
                subReferences: {
                    create: data.subReferences?.map(ref => ({ value: ref }))
                }
            },
            include: { 
                category: true, 
                location: true, 
                specifications: { include: { spec: true } },
                subReferences: true,
                images: true
            }
        });
    }
}
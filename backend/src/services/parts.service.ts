import { prisma } from '../lib/prisma.js';
import { PartCondition } from '@prisma/client';
import { stockMovementService } from './stockMovement.service.js';

export class NotFoundError extends Error {}
export class ConflictError extends Error {}
export class BadRequestError extends Error {}

export class PartsService {
    
    static async getAllParts() {
        return prisma.part.findMany({
            where: { deletedAt: null },
            include: { 
                category: true,
                location: true,
                images: true,
                specifications: { include: { spec: true } },
                subReferences: true
            }
        });
    }

    static async getPartById(ref: string) {
        return prisma.part.findFirst({
            where: { refInternal: ref, deletedAt: null },
            include: { 
                category: true, 
                location: true,
                images: true,
                specifications: { include: { spec: true } },
                subReferences: true
            }
        });
    }

    static async getCategories() {
        return prisma.category.findMany({
            where: { deletedAt: null },
            select: {
                id: true,
                name: true,
                parentId: true,
            },
            orderBy: { name: 'asc' }
        });
    }

    static async setVisibility(ref: string, isVisible: boolean) {
        const part = await prisma.part.findFirst({ where: { refInternal: ref, deletedAt: null } });

        if (!part) {
            throw new NotFoundError('Part not found');
        }

        return prisma.part.update({
            where: { id: part.id },
            data: { isVisible },
            include: {
                category: true,
                location: true,
                images: true,
                specifications: { include: { spec: true } },
                subReferences: true
            }
        });
    }

    static async updatePart(ref: string, data: Partial<{ 
        name: string; 
        refInternal: string;
        refOEM?: string | null;
        description?: string | null; 
        price: number; 
        condition: PartCondition; 
        categoryId: number;
        locationId: number;
        specifications?: { specId: number; value: string }[];
        subReferences?: string[];
    }>) {
        const part = await prisma.part.findFirst({ where: { refInternal: ref, deletedAt: null } });

        if (!part) {
            throw new NotFoundError('Part not found');
        }

        let locationCheckPassed = true;
        if (data.locationId && data.locationId !== part.locationId) {
            const location = await prisma.location.findUnique({ where: { id: data.locationId } });
            if (!location) {
                throw new NotFoundError('Location not found');
            }

            const activePartsAtLocation = await prisma.part.count({
                where: { locationId: data.locationId, deletedAt: null }
            });

            if (activePartsAtLocation >= location.capacity) {
                throw new ConflictError(`Location ${location.fullCode} is full (${activePartsAtLocation}/${location.capacity})`);
            }
            locationCheckPassed = true;
        }

        try {
            const updated = await prisma.$transaction(async (tx) => {
                // Replace specifications if provided
                if (data.specifications) {
                    await tx.partSpecification.deleteMany({ where: { partId: part.id } });
                    if (data.specifications.length) {
                        await tx.partSpecification.createMany({
                            data: data.specifications.map((s) => ({
                                partId: part.id,
                                specId: s.specId,
                                value: s.value,
                            })),
                        });
                    }
                }

                // Replace subReferences if provided
                if (data.subReferences) {
                    await tx.partReference.deleteMany({ where: { partId: part.id } });
                    if (data.subReferences.length) {
                        await tx.partReference.createMany({
                            data: data.subReferences.map((value) => ({ partId: part.id, value })),
                        });
                    }
                }

                const { specifications, subReferences, ...rest } = data;

                return tx.part.update({
                    where: { id: part.id },
                    data: rest,
                    include: {
                        category: true,
                        location: true,
                        images: true,
                        specifications: { include: { spec: true } },
                        subReferences: true,
                    },
                });
            });

            return updated;
        } catch (error: any) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2002') {
                    throw new ConflictError('Part refInternal already exists');
                }

                if (error.code === 'P2003') {
                    const field = (error.meta?.field_name as string | undefined) || 'related id';
                    throw new BadRequestError(`Invalid or missing ${field}`);
                }
            }
            throw error;
        }
    }

    static async createPart(data: { 
        name: string; 
        refInternal: string;
        refOEM?: string | null;
        description?: string | null; 
        price: number; 
        condition: PartCondition; 
        categoryId: number;
        locationId: number;
        specifications?: { specId: number; value: string }[];
        subReferences?: string[];
    }, createdByUserId: number) {
    
        // verificamos a capacidade
        const location = await prisma.location.findUnique({ where: { id: data.locationId } });

        if (!location) {
            throw new NotFoundError('Location not found');
        }

        const activePartsAtLocation = await prisma.part.count({
            where: { locationId: data.locationId, deletedAt: null }
        });

        if (activePartsAtLocation >= location.capacity) {
            throw new ConflictError(`Location ${location.fullCode} is full (${activePartsAtLocation}/${location.capacity})`);
        }

        
        // se cheganmos aqui, é porque está tudo ok
        try {
            return await prisma.part.create({
                data: {
                    name: data.name,
                    refInternal: data.refInternal,
                    refOEM: data.refOEM,
                    description: data.description,
                    price: data.price,
                    condition: data.condition,
                    
                    categoryId: data.categoryId,
                    locationId: data.locationId,
                    
                    ...(data.specifications?.length
                        ? { specifications: { create: data.specifications } }
                        : {}),

                    ...(data.subReferences?.length
                        ? { subReferences: { create: data.subReferences.map(ref => ({ value: ref })) } }
                        : {})
                },
                include: { 
                    category: true, 
                    location: true, 
                    specifications: { include: { spec: true } },
                    subReferences: true,
                    images: true
                }
            });
        } catch (error: any) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2002') {
                    throw new ConflictError('Part refInternal already exists');
                }

                if (error.code === 'P2003') {
                    const field = (error.meta?.field_name as string | undefined) || 'related id';
                    throw new BadRequestError(`Invalid or missing ${field}`);
                }
            }
            throw error;
        }
    }

    static async deletePart(ref: string) {
        const part = await prisma.part.findFirst({ where: { refInternal: ref, deletedAt: null } });

        if (!part) {
            throw new NotFoundError('Part not found');
        }

        await prisma.part.update({
            where: { id: part.id },
            data: { deletedAt: new Date(), isVisible: false }
        });

        // here was this line
        // await stockMovementService.recordEntry(part.id, createdByUserId, data.locationId);
        // it was meant to be on create parte
        return part;
    }
}
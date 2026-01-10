import { prisma } from '../lib/prisma.js';
import { PartCondition, Prisma, ReservationStatus, CancelReason } from '@prisma/client';
import { stockMovementService } from './stockMovement.service.js';
import { auditLogService } from './auditLog.service.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class NotFoundError extends Error {}
export class ConflictError extends Error {}
export class BadRequestError extends Error {}

type SortField = 'name' | 'price' | 'createdAt' | 'updatedAt' | 'refInternal';

export type SearchPartsParams = {
    text?: string;
    categoryId?: number;
    condition?: PartCondition;
    priceMin?: number;
    priceMax?: number;
    locationId?: number;
    isVisible?: boolean;
    available?: boolean;
    sortBy: SortField;
    sortOrder: 'asc' | 'desc';
    page: number;
    pageSize: number;
};

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

    static async getPartSummary(ref: string) {
        return prisma.part.findFirst({
            where: { refInternal: ref, deletedAt: null },
            select: {
                id: true,
                name: true,
                refInternal: true,
            },
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

    static async getSpecifications() {
        return prisma.specification.findMany({
            select: { id: true, name: true, unit: true },
            orderBy: { name: 'asc' },
        });
    }

    static async searchParts(params: SearchPartsParams) {
        const {
            text,
            categoryId,
            condition,
            priceMin,
            priceMax,
            locationId,
            isVisible,
            available,
            sortBy,
            sortOrder,
            page,
            pageSize,
        } = params;

        const where: Prisma.PartWhereInput = { deletedAt: null };
        const and: Prisma.PartWhereInput[] = [];

        if (categoryId !== undefined) where.categoryId = categoryId;
        if (condition) where.condition = condition;
        if (locationId !== undefined) where.locationId = locationId;
        if (isVisible !== undefined) where.isVisible = isVisible;

        if (available === true) {
            // Only parts with no reservation that is active or cancelled due to damage
            and.push({ reservations: { none: { status: { not: ReservationStatus.CANCELLED } } } });
            and.push({ reservations: { none: { status: ReservationStatus.CANCELLED, cancelReason: CancelReason.DAMAGED_RETURN } } });
        } else if (available === false) {
            // Only parts that have an active or damaged reservation
            and.push({
                reservations: {
                    some: {
                        OR: [
                            { status: { not: ReservationStatus.CANCELLED } },
                            { status: ReservationStatus.CANCELLED, cancelReason: CancelReason.DAMAGED_RETURN },
                        ],
                    },
                },
            });
        }

        if (and.length) {
            where.AND = and;
        }

        if (priceMin !== undefined || priceMax !== undefined) {
            where.price = {
                ...(priceMin !== undefined ? { gte: priceMin } : {}),
                ...(priceMax !== undefined ? { lte: priceMax } : {}),
            };
        }

        if (text) {
            where.OR = [
                { name: { contains: text } },
                { refInternal: { contains: text } },
                { refOEM: { contains: text } },
                { subReferences: { some: { value: { contains: text } } } },
            ];
        }

        const orderBy: Prisma.PartOrderByWithRelationInput = { [sortBy]: sortOrder };

        const [total, items] = await prisma.$transaction([
            prisma.part.count({ where }),
            prisma.part.findMany({
                where,
                orderBy,
                skip: (page - 1) * pageSize,
                take: pageSize,
                include: {
                    category: true,
                    location: true,
                    images: true,
                    specifications: { include: { spec: true } },
                    subReferences: true,
                },
            }),
        ]);

        return {
            items,
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize),
        };
    }

    static async getPartHistory(ref: string) {
        const part = await prisma.part.findFirst({
            where: { refInternal: ref, deletedAt: null },
            include: {
                category: true,
                location: true,
                images: true,
                specifications: { include: { spec: true } },
                subReferences: true,
            },
        });

        if (!part) {
            throw new NotFoundError('Part not found');
        }

        const [movements, reservations] = await prisma.$transaction([
            prisma.stockMovement.findMany({
                where: { partId: part.id },
                orderBy: { timestamp: 'desc' },
                include: {
                    user: { select: { id: true, username: true, fullName: true, role: true } },
                    sourceLoc: true,
                    destLoc: true,
                },
            }),
            prisma.reservation.findMany({
                where: { partId: part.id },
                orderBy: { createdAt: 'desc' },
                include: {
                    user: { select: { id: true, username: true, fullName: true, role: true } },
                    assignedTo: { select: { id: true, username: true, fullName: true, role: true } },
                    returnLocation: true,
                },
            }),
        ]);

        return { part, movements, reservations };
    }

    static async setVisibility(ref: string, isVisible: boolean, updatedByUserId: number) {
        const part = await prisma.part.findFirst({ where: { refInternal: ref, deletedAt: null } });

        if (!part) {
            throw new NotFoundError('Part not found');
        }

        const updated = await prisma.part.update({
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

        // Record every visibility toggle so we know who hid or exposed a part.
        await auditLogService.record({
            userId: updatedByUserId,
            action: 'PART_VISIBILITY',
            entity: 'PART',
            entityId: part.id,
            details: {
                refInternal: part.refInternal,
                isVisible,
            },
        });

        return updated;
    }

    static async addImage(ref: string, data: { url: string; isMain?: boolean }) {
        const part = await prisma.part.findFirst({ where: { refInternal: ref, deletedAt: null } });
        if (!part) throw new NotFoundError('Part not found');

        const created = await prisma.$transaction(async (tx) => {
            if (data.isMain) {
                await tx.partImage.updateMany({ where: { partId: part.id, isMain: true }, data: { isMain: false } });
            }

            return tx.partImage.create({
                data: { partId: part.id, url: data.url, isMain: data.isMain ?? false },
            });
        });

        return prisma.part.findUnique({
            where: { id: part.id },
            include: {
                category: true,
                location: true,
                images: true,
                specifications: { include: { spec: true } },
                subReferences: true,
            },
        });
    }

    static async deleteImage(ref: string, imageId: number) {
        const part = await prisma.part.findFirst({ where: { refInternal: ref, deletedAt: null } });
        if (!part) throw new NotFoundError('Part not found');

        const image = await prisma.partImage.findFirst({ where: { id: imageId, partId: part.id } });
        if (!image) throw new NotFoundError('Image not found');

        await prisma.partImage.delete({ where: { id: imageId } });

        const absolutePath = path.join(__dirname, '..', '..', image.url.replace(/^\//, ''));
        if (fs.existsSync(absolutePath)) {
            try {
                fs.unlinkSync(absolutePath);
            } catch {
                // ignore filesystem deletion errors
            }
        }

        return prisma.part.findUnique({
            where: { id: part.id },
            include: {
                category: true,
                location: true,
                images: true,
                specifications: { include: { spec: true } },
                subReferences: true,
            },
        });
    }

    static async setMainImage(ref: string, imageId: number) {
        const part = await prisma.part.findFirst({ where: { refInternal: ref, deletedAt: null } });
        if (!part) throw new NotFoundError('Part not found');

        const image = await prisma.partImage.findFirst({ where: { id: imageId, partId: part.id } });
        if (!image) throw new NotFoundError('Image not found');

        await prisma.$transaction(async (tx) => {
            await tx.partImage.updateMany({ where: { partId: part.id, isMain: true }, data: { isMain: false } });
            await tx.partImage.update({ where: { id: imageId }, data: { isMain: true } });
        });

        return prisma.part.findUnique({
            where: { id: part.id },
            include: {
                category: true,
                location: true,
                images: true,
                specifications: { include: { spec: true } },
                subReferences: true,
            },
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
    }>, updatedByUserId: number) {
        const part = await prisma.part.findFirst({ where: { refInternal: ref, deletedAt: null } });

        if (!part) {
            throw new NotFoundError('Part not found');
        }

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
        }

        try {
            const { specifications, subReferences, ...simpleFields } = data;
            const updated = await prisma.$transaction(async (tx) => {
                // Replace specifications if provided
                if (specifications) {
                    await tx.partSpecification.deleteMany({ where: { partId: part.id } });
                    if (specifications.length) {
                        await tx.partSpecification.createMany({
                            data: specifications.map((s) => ({
                                partId: part.id,
                                specId: s.specId,
                                value: s.value,
                            })),
                        });
                    }
                }

                // Replace subReferences if provided
                if (subReferences) {
                    await tx.partReference.deleteMany({ where: { partId: part.id } });
                    if (subReferences.length) {
                        await tx.partReference.createMany({
                            data: subReferences.map((value) => ({ partId: part.id, value })),
                        });
                    }
                }

                return tx.part.update({
                    where: { id: part.id },
                    data: simpleFields,
                    include: {
                        category: true,
                        location: true,
                        images: true,
                        specifications: { include: { spec: true } },
                        subReferences: true,
                    },
                });
            });

            const updatedFields = [
                ...Object.keys(simpleFields),
                ...(specifications ? ['specifications'] : []),
                ...(subReferences ? ['subReferences'] : []),
            ];

            // Log the field changes so auditors can spot what was edited.
            await auditLogService.record({
                userId: updatedByUserId,
                action: 'PART_UPDATE',
                entity: 'PART',
                entityId: part.id,
                details: {
                    refInternalBefore: part.refInternal,
                    refInternalAfter: updated.refInternal,
                    updatedFields,
                },
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
            const newpart = await prisma.part.create({
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

            await stockMovementService.recordEntry(newpart.id, createdByUserId, data.locationId);
            // Capture the creation event together with the key attributes.
            await auditLogService.record({
                userId: createdByUserId,
                action: 'PART_CREATE',
                entity: 'PART',
                entityId: newpart.id,
                details: {
                    refInternal: newpart.refInternal,
                    categoryId: newpart.categoryId,
                    locationId: newpart.locationId,
                    condition: newpart.condition,
                    price: newpart.price.toString(),
                },
            });
            return newpart;
            
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

    static async deletePart(ref: string, deletedByUserId: number) {
        const part = await prisma.part.findFirst({ where: { refInternal: ref, deletedAt: null } });

        if (!part) {
            throw new NotFoundError('Part not found');
        }

        await prisma.part.update({
            where: { id: part.id },
            data: { deletedAt: new Date(), isVisible: false }
        });

        // Track soft deletes to know who removed an item from circulation.
        await auditLogService.record({
            userId: deletedByUserId,
            action: 'PART_DELETE',
            entity: 'PART',
            entityId: part.id,
            details: {
                refInternal: part.refInternal,
            },
        });

        // here was this line
        // await stockMovementService.recordEntry(part.id, createdByUserId, data.locationId);
        // it was meant to be on create parte
        return part;
    }
}
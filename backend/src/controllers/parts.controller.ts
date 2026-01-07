import { Request, Response } from 'express';
import { z } from 'zod';
import { PartCondition } from '@prisma/client';
import { PartsService, NotFoundError, ConflictError, BadRequestError } from '../services/parts.service.js';
import { Logger } from '../utils/logger.js';

const createPartSchema = z.object({
    name: z.string().min(1),
    refInternal: z.string().min(1),
    refOEM: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    price: z.number().finite().nonnegative(),
    condition: z.nativeEnum(PartCondition),
    categoryId: z.number().int().positive(),
    locationId: z.number().int().positive(),
    specifications: z
        .array(z.object({ specId: z.number().int().positive(), value: z.string().min(1) }))
        .optional(),
    subReferences: z.array(z.string().min(1)).optional(),
});

const visibilitySchema = z.object({
    isVisible: z.boolean(),
});

const updatePartSchema = createPartSchema.partial().refine(
    (val) => Object.keys(val).length > 0,
    { message: 'At least one field must be provided to update' }
);

const addImageSchema = z.object({
    isMain: z.preprocess((v) => {
        if (v === undefined) return undefined;
        if (v === 'true' || v === '1' || v === true) return true;
        if (v === 'false' || v === '0' || v === false) return false;
        return v;
    }, z.boolean().optional()),
});

const sortByEnum = z.enum(['name', 'price', 'createdAt', 'updatedAt', 'refInternal']);
const sortOrderEnum = z.enum(['asc', 'desc']);

const booleanLike = z.preprocess((val) => {
    if (val === 'true' || val === '1' || val === true) return true;
    if (val === 'false' || val === '0' || val === false) return false;
    return val;
}, z.boolean());

const searchPartsSchema = z
    .object({
        text: z.string().trim().min(1).optional(),
        categoryId: z.coerce.number().int().positive().optional(),
        condition: z.nativeEnum(PartCondition).optional(),
        priceMin: z.coerce.number().nonnegative().optional(),
        priceMax: z.coerce.number().nonnegative().optional(),
        locationId: z.coerce.number().int().positive().optional(),
        isVisible: booleanLike.optional(),
        available: booleanLike.optional(),
        page: z.coerce.number().int().positive().default(1),
        pageSize: z.coerce.number().int().positive().max(100).default(20),
        sortBy: sortByEnum.default('createdAt'),
        sortOrder: sortOrderEnum.default('desc'),
    })
    .refine(
        (data) =>
            data.priceMin === undefined ||
            data.priceMax === undefined ||
            data.priceMin <= data.priceMax,
        { message: 'priceMin cannot be greater than priceMax', path: ['priceMin'] }
    );

export class PartsController {
    
    static async getAllParts(req: Request, res: Response) {
        try {
            const parts = await PartsService.getAllParts();
            res.status(200).json(parts);
        } catch (error) {
            Logger.error('Error fetching all parts', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }

    static async searchParts(req: Request, res: Response) {
        try {
            const filters = searchPartsSchema.parse(req.query);
            const result = await PartsService.searchParts(filters);
            res.status(200).json(result);
        } catch (error: any) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ message: 'Validation failed', errors: error.errors });
            }

            Logger.error('Error searching parts', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }

    static async getCategories(req: Request, res: Response) {
        try {
            const categories = await PartsService.getCategories();
            res.status(200).json(categories);
        } catch (error) {
            Logger.error('Error fetching categories', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }

    static async getSpecifications(req: Request, res: Response) {
        try {
            const specs = await PartsService.getSpecifications();
            res.status(200).json(specs);
        } catch (error) {
            Logger.error('Error fetching specifications', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }

    static async getPartById(req: Request, res: Response) {
        try {
            const { ref } = req.params; // podiamos ter feito apenas const ref  = req.params.ref; {} faz destructuring
            const part = await PartsService.getPartById(ref);
            if (part) {
                res.status(200).json(part);
            } else {
                res.status(404).json({ message: 'Part not found' });
            }
        } catch (error) {
            Logger.error('Error fetching part by ID', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }

    static async getPartHistory(req: Request, res: Response) {
        try {
            const { ref } = req.params;
            const data = await PartsService.getPartHistory(ref);
            res.status(200).json(data);
        } catch (error: any) {
            if (error instanceof NotFoundError) {
                return res.status(404).json({ message: error.message });
            }

            Logger.error('Error fetching part history', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }


    static async createPart(req: Request, res: Response) {
        try {
            const user = req.user;
            if (!user) return res.status(401).json({ message: 'Not authenticated' });

            Logger.debug('Creating part with data:', req.body);

            const data = createPartSchema.parse(req.body);
            const part = await PartsService.createPart(data, user.id);
            
            Logger.info(`User ${user.username} created part ${part.refInternal} (reqId=${req.headers['x-request-id'] || 'n/a'})`);
            res.status(201).json(part);
        } catch (error: any) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ message: 'Validation failed', errors: error.errors });
            }

            if (error instanceof NotFoundError) {
                return res.status(404).json({ message: error.message });
            }

            if (error instanceof ConflictError) {
                return res.status(409).json({ message: error.message });
            }

            if (error instanceof BadRequestError) {
                return res.status(400).json({ message: error.message });
            }

            Logger.error('Error creating part', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    } 

    static async updatePart(req: Request, res: Response) {
        try {
            const user = req.user;
            if (!user) return res.status(401).json({ message: 'Not authenticated' });

            const { ref } = req.params;
            const data = updatePartSchema.parse(req.body);

            const part = await PartsService.updatePart(ref, data, user.id);
            res.status(200).json(part);
        } catch (error: any) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ message: 'Validation failed', errors: error.errors });
            }

            if (error instanceof NotFoundError) {
                return res.status(404).json({ message: error.message });
            }

            if (error instanceof ConflictError) {
                return res.status(409).json({ message: error.message });
            }

            if (error instanceof BadRequestError) {
                return res.status(400).json({ message: error.message });
            }

            Logger.error('Error updating part', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }

    static async deletePart(req: Request, res: Response) {
        try {
            const user = req.user;
            if (!user) return res.status(401).json({ message: 'Not authenticated' });

            const { ref } = req.params;
            await PartsService.deletePart(ref, user.id);
            res.status(204).send();
        } catch (error) {
            if (error instanceof NotFoundError) {
                return res.status(404).json({ message: error.message });
            }

            Logger.error('Error deleting part', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }

    static async setVisibility(req: Request, res: Response) {
        try {
            const user = req.user;
            if (!user) return res.status(401).json({ message: 'Not authenticated' });

            const { ref } = req.params;
            const { isVisible } = visibilitySchema.parse(req.body);

            const part = await PartsService.setVisibility(ref, isVisible, user.id);
            res.status(200).json(part);
        } catch (error: any) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ message: 'Validation failed', errors: error.errors });
            }

            if (error instanceof NotFoundError) {
                return res.status(404).json({ message: error.message });
            }

            Logger.error('Error updating part visibility', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }

    static async addImage(req: Request, res: Response) {
        try {
            const { ref } = req.params;
            const validationError = (req as any).fileValidationError as string | undefined;
            const validationStatus = (req as any).fileValidationStatus as number | undefined;
            if (validationError) {
                return res.status(validationStatus ?? 400).json({ message: validationError });
            }
            const payload = addImageSchema.parse(req.body);
            const file = req.file;

            if (!file) {
                return res.status(400).json({ message: 'Image file is required (field name: image)' });
            }

            const url = `/uploads/parts/${ref}/${file.filename}`;
            const part = await PartsService.addImage(ref, { url, isMain: payload.isMain });
            res.status(201).json(part);
        } catch (error: any) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ message: 'Validation failed', errors: error.errors });
            }

            if (error instanceof NotFoundError) {
                return res.status(404).json({ message: error.message });
            }

            Logger.error('Error adding image to part', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }

    static async deleteImage(req: Request, res: Response) {
        try {
            const { ref, imageId } = req.params;
            const id = Number(imageId);
            if (!Number.isInteger(id) || id <= 0) {
                return res.status(400).json({ message: 'Invalid imageId' });
            }

            const part = await PartsService.deleteImage(ref, id);
            res.status(200).json(part);
        } catch (error: any) {
            if (error instanceof NotFoundError) {
                return res.status(404).json({ message: error.message });
            }

            Logger.error('Error deleting image from part', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }

    static async setMainImage(req: Request, res: Response) {
        try {
            const { ref, imageId } = req.params;
            const id = Number(imageId);
            if (!Number.isInteger(id) || id <= 0) {
                return res.status(400).json({ message: 'Invalid imageId' });
            }

            const part = await PartsService.setMainImage(ref, id);
            res.status(200).json(part);
        } catch (error: any) {
            if (error instanceof NotFoundError) {
                return res.status(404).json({ message: error.message });
            }

            Logger.error('Error setting main image for part', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
}
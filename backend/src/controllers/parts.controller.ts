import { Request, Response } from 'express';
import { z } from 'zod';
import { PartCondition } from '@prisma/client';
import { PartsService, NotFoundError, ConflictError } from '../services/parts.service.js';
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


    static async createPart(req: Request, res: Response) {
        try {
            Logger.debug('Creating part with data:', req.body);

            const data = createPartSchema.parse(req.body);
            const part = await PartsService.createPart(data);
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

            Logger.error('Error creating part', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    } 
}
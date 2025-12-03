import { Request, Response } from 'express';
import { PartsService } from '../services/parts.service.js';
import { Logger } from '../utils/logger.js';

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
            const { name, refInternal, refOEM, description, price, condition, categoryId, locationId, specifications, subReferences } = req.body;
            const part = await PartsService.createPart({ name, refInternal, refOEM, description, price, condition, categoryId, locationId, specifications, subReferences });
            res.status(201).json(part);
        } catch (error) {
            Logger.error('Error creating part', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    } 
}
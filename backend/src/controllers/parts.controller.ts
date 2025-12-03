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
            
            // 1. Desestruturar
            const { 
                name, refInternal, refOEM, description, price, condition, 
                categoryId, locationId, specifications, subReferences 
            } = req.body;

            // 2. Validação de Campos Obrigatórios
            if (!name || !refInternal || !price || !categoryId || !locationId) {
                return res.status(400).json({ 
                    message: 'Dados inválidos. Campos obrigatórios: name, refInternal, price, categoryId, locationId' 
                });
            }

            // 3. Conversão e Chamada ao Service
            const part = await PartsService.createPart({ 
                name, 
                refInternal, 
                refOEM, 
                description, 
                price: Number(price),      
                categoryId: Number(categoryId), 
                locationId: Number(locationId), 
                condition: condition || 'USED',
                specifications, 
                subReferences,
                userId: req.user?.id || 0 
            });

            Logger.info(`Peça criada com sucesso: ${part.refInternal} (ID: ${part.id})`);
            res.status(201).json(part);

        } catch (error: any) {
            Logger.error('Error creating part', error);

            // P2002: Unique constraint failed (Referência duplicada)
            if (error.code === 'P2002') {
                return res.status(409).json({ message: 'Essa Referência Interna já existe no sistema.' });
            }

            // Erro de Capacidade (lançado pelo nosso Service)
            if (error.message && error.message.includes('está cheia')) {
                return res.status(400).json({ message: error.message });
            }

            res.status(500).json({ message: 'Internal server error' });
        }
    }
}
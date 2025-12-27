import { Request, Response } from 'express';
import { stockMovementService } from '../services/stockMovement.service.js';
import { Logger } from '../utils/logger.js';
import { MovementType } from '@prisma/client';

export class StockMovementController {

    // ============================================
    // MOVIMENTOS
    // ============================================

    /**
     * POST /stock-movements/entry
     * Regista entrada de peça no armazém (WAREHOUSE, ADMIN)
     */
    static async recordEntry(req: Request, res: Response) {
        try {
            const user = req.user;
            if (!user) return res.status(401).json({ message: 'Not authenticated' });

            const { partId, locationId } = req.body;

            if (!partId || typeof partId !== 'number') {
                return res.status(400).json({ message: 'partId is required and must be a number' });
            }

            if (!locationId || typeof locationId !== 'number') {
                return res.status(400).json({ message: 'locationId is required and must be a number' });
            }

            const movement = await stockMovementService.recordEntry(partId, user.id, locationId);
            
            Logger.info(`User ${user.username} recorded ENTRY for part ${partId} to location ${locationId} (reqId=${req.headers['x-request-id'] || 'n/a'})`);
            return res.status(201).json(movement);

        } catch (error: any) {
            Logger.error(`Record entry failed (userId=${req.user?.id}, reqId=${req.headers['x-request-id'] || 'n/a'})`, error);

            if (error.message.includes('Localização')) {
                return res.status(400).json({ message: error.message });
            }

            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    /**
     * POST /stock-movements/exit
     * Regista saída de peça do armazém (WAREHOUSE, ADMIN)
     */
    static async recordExit(req: Request, res: Response) {
        try {
            const user = req.user;
            if (!user) return res.status(401).json({ message: 'Not authenticated' });

            const { partId } = req.body;

            if (!partId || typeof partId !== 'number') {
                return res.status(400).json({ message: 'partId is required and must be a number' });
            }

            const movement = await stockMovementService.recordExit(partId, user.id);
            
            Logger.info(`User ${user.username} recorded EXIT for part ${partId} (reqId=${req.headers['x-request-id'] || 'n/a'})`);
            return res.status(201).json(movement);

        } catch (error: any) {
            Logger.error(`Record exit failed (userId=${req.user?.id}, reqId=${req.headers['x-request-id'] || 'n/a'})`, error);

            if (error.message === 'Peça não encontrada') {
                return res.status(404).json({ message: 'Part not found' });
            }

            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    /**
     * POST /stock-movements/transfer
     * Transfere peça entre localizações (WAREHOUSE, ADMIN)
     */
    static async recordTransfer(req: Request, res: Response) {
        try {
            const user = req.user;
            if (!user) return res.status(401).json({ message: 'Not authenticated' });

            const { partId, fromLocationId, toLocationId } = req.body;

            if (!partId || typeof partId !== 'number') {
                return res.status(400).json({ message: 'partId is required and must be a number' });
            }

            if (!fromLocationId || typeof fromLocationId !== 'number') {
                return res.status(400).json({ message: 'fromLocationId is required and must be a number' });
            }

            if (!toLocationId || typeof toLocationId !== 'number') {
                return res.status(400).json({ message: 'toLocationId is required and must be a number' });
            }

            const movement = await stockMovementService.recordTransfer({
                partId,
                userId: user.id,
                fromLocationId,
                toLocationId
            });
            
            Logger.info(`User ${user.username} recorded TRANSFER for part ${partId} from ${fromLocationId} to ${toLocationId} (reqId=${req.headers['x-request-id'] || 'n/a'})`);
            return res.status(201).json(movement);

        } catch (error: any) {
            Logger.error(`Record transfer failed (userId=${req.user?.id}, reqId=${req.headers['x-request-id'] || 'n/a'})`, error);

            if (error.message.includes('Localização') || error.message.includes('Peça não está')) {
                return res.status(400).json({ message: error.message });
            }

            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    /**
     * POST /stock-movements/return
     * Regista devolução de peça (WAREHOUSE, ADMIN)
     */
    static async recordReturn(req: Request, res: Response) {
        try {
            const user = req.user;
            if (!user) return res.status(401).json({ message: 'Not authenticated' });

            const { partId, toLocationId, isDamaged } = req.body;

            if (!partId || typeof partId !== 'number') {
                return res.status(400).json({ message: 'partId is required and must be a number' });
            }

            // toLocationId obrigatório apenas se não for danificada
            if (!isDamaged && (!toLocationId || typeof toLocationId !== 'number')) {
                return res.status(400).json({ message: 'toLocationId is required when isDamaged is false' });
            }

            const movement = await stockMovementService.recordReturn({
                partId,
                userId: user.id,
                toLocationId,
                isDamaged: isDamaged === true
            });
            
            Logger.info(`User ${user.username} recorded RETURN for part ${partId} (damaged=${isDamaged}, location=${toLocationId || 'none'}) (reqId=${req.headers['x-request-id'] || 'n/a'})`);
            return res.status(201).json(movement);

        } catch (error: any) {
            Logger.error(`Record return failed (userId=${req.user?.id}, reqId=${req.headers['x-request-id'] || 'n/a'})`, error);

            if (error.message.includes('Localização')) {
                return res.status(400).json({ message: error.message });
            }

            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    /**
     * POST /stock-movements/adjustment
     * Ajuste manual de localização (ADMIN apenas)
     */
    static async recordAdjustment(req: Request, res: Response) {
        try {
            const user = req.user;
            if (!user) return res.status(401).json({ message: 'Not authenticated' });

            const { partId, newLocationId } = req.body;

            if (!partId || typeof partId !== 'number') {
                return res.status(400).json({ message: 'partId is required and must be a number' });
            }

            // newLocationId pode ser null (remover peça de localização)
            if (newLocationId !== null && newLocationId !== undefined && typeof newLocationId !== 'number') {
                return res.status(400).json({ message: 'newLocationId must be a number or null' });
            }

            const movement = await stockMovementService.recordAdjustment(
                partId,
                user.id,
                newLocationId ?? null
            );
            
            Logger.info(`User ${user.username} recorded ADJUSTMENT for part ${partId} to location ${newLocationId ?? 'null'} (reqId=${req.headers['x-request-id'] || 'n/a'})`);
            return res.status(201).json(movement);

        } catch (error: any) {
            Logger.error(`Record adjustment failed (userId=${req.user?.id}, reqId=${req.headers['x-request-id'] || 'n/a'})`, error);

            if (error.message === 'Peça não encontrada') {
                return res.status(404).json({ message: 'Part not found' });
            }

            if (error.message.includes('Localização')) {
                return res.status(400).json({ message: error.message });
            }

            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    // ============================================
    // CONSULTAS
    // ============================================

    /**
     * GET /stock-movements/part/:partId
     * Histórico de movimentos de uma peça
     */
    static async getPartMovements(req: Request, res: Response) {
        try {
            const user = req.user;
            if (!user) return res.status(401).json({ message: 'Not authenticated' });

            const partId = parseInt(req.params.partId);
            if (isNaN(partId)) {
                return res.status(400).json({ message: 'Invalid partId' });
            }

            const movements = await stockMovementService.getPartMovements(partId);
            
            Logger.info(`User ${user.username} viewed movements for part ${partId} (count=${movements.length}, reqId=${req.headers['x-request-id'] || 'n/a'})`);
            return res.status(200).json(movements);

        } catch (error: any) {
            Logger.error(`Get part movements failed (userId=${req.user?.id}, reqId=${req.headers['x-request-id'] || 'n/a'})`, error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    /**
     * GET /stock-movements/recent
     * Movimentos recentes (para dashboard)
     */
    static async getRecentMovements(req: Request, res: Response) {
        try {
            const user = req.user;
            if (!user) return res.status(401).json({ message: 'Not authenticated' });

            const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
            if (isNaN(limit) || limit < 1 || limit > 200) {
                return res.status(400).json({ message: 'limit must be between 1 and 200' });
            }

            const movements = await stockMovementService.getRecentMovements(limit);
            
            Logger.info(`User ${user.username} viewed recent movements (count=${movements.length}, reqId=${req.headers['x-request-id'] || 'n/a'})`);
            return res.status(200).json(movements);

        } catch (error: any) {
            Logger.error(`Get recent movements failed (userId=${req.user?.id}, reqId=${req.headers['x-request-id'] || 'n/a'})`, error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    /**
     * GET /stock-movements/locations
     * Lista localizações disponíveis (para UI de seleção)
     */
    static async getAvailableLocations(req: Request, res: Response) {
        try {
            const user = req.user;
            if (!user) return res.status(401).json({ message: 'Not authenticated' });

            const warehouseId = req.query.warehouseId 
                ? parseInt(req.query.warehouseId as string) 
                : undefined;

            if (req.query.warehouseId && isNaN(warehouseId!)) {
                return res.status(400).json({ message: 'Invalid warehouseId' });
            }

            const locations = await stockMovementService.getAvailableLocations(warehouseId);
            
            Logger.info(`User ${user.username} listed available locations (count=${locations.length}, warehouseId=${warehouseId || 'all'}, reqId=${req.headers['x-request-id'] || 'n/a'})`);
            return res.status(200).json(locations);

        } catch (error: any) {
            Logger.error(`Get available locations failed (userId=${req.user?.id}, reqId=${req.headers['x-request-id'] || 'n/a'})`, error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }
}

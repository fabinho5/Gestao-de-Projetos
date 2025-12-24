import { Request, Response } from 'express';
import { FavoritesService } from '../services/favorites.service.js';
import { Logger } from '../utils/logger.js';

export class FavoritesController {

    /**
     * GET /favorites
     * Lista todos os favoritos do utilizador autenticado
     */
    static async getUserFavorites(req: Request, res: Response) {
        try {
            const user = req.user;
            if (!user) return res.status(401).json({ message: 'Not authenticated' });

            const favorites = await FavoritesService.getUserFavorites(user.id);
            
            Logger.info(`User ${user.username} listed favorites (count=${favorites.length}, reqId=${req.headers['x-request-id'] || 'n/a'})`);
            return res.status(200).json(favorites);

        } catch (error: any) {
            Logger.error(`List favorites failed (userId=${req.user?.id}, reqId=${req.headers['x-request-id'] || 'n/a'})`, error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    /**
     * POST /favorites/:partId
     * Adiciona uma peça aos favoritos
     */
    static async addFavorite(req: Request, res: Response) {
        try {
            const user = req.user;
            if (!user) return res.status(401).json({ message: 'Not authenticated' });

            const partId = parseInt(req.params.partId);
            
            if (isNaN(partId) || partId < 1) {
                return res.status(400).json({ message: 'Invalid part ID' });
            }

            const result = await FavoritesService.addFavorite(user.id, partId);
            
            Logger.info(`User ${user.username} added part ${partId} to favorites (reqId=${req.headers['x-request-id'] || 'n/a'})`);
            return res.status(201).json({ message: 'Added to favorites', partId: result.partId });

        } catch (error: any) {
            Logger.error(`Add favorite failed (userId=${req.user?.id}, reqId=${req.headers['x-request-id'] || 'n/a'})`, error);

            if (error.message === 'Part not found') {
                return res.status(404).json({ message: 'Part not found' });
            }

            if (error.message === 'Part already in favorites') {
                return res.status(409).json({ message: 'Part already in favorites' });
            }

            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    /**
     * DELETE /favorites/:partId
     * Remove uma peça dos favoritos
     */
    static async removeFavorite(req: Request, res: Response) {
        try {
            const user = req.user;
            if (!user) return res.status(401).json({ message: 'Not authenticated' });

            const partId = parseInt(req.params.partId);
            
            if (isNaN(partId) || partId < 1) {
                return res.status(400).json({ message: 'Invalid part ID' });
            }

            await FavoritesService.removeFavorite(user.id, partId);
            
            Logger.info(`User ${user.username} removed part ${partId} from favorites (reqId=${req.headers['x-request-id'] || 'n/a'})`);
            return res.status(200).json({ message: 'Removed from favorites' });

        } catch (error: any) {
            Logger.error(`Remove favorite failed (userId=${req.user?.id}, reqId=${req.headers['x-request-id'] || 'n/a'})`, error);

            if (error.message === 'Favorite not found') {
                return res.status(404).json({ message: 'Favorite not found' });
            }

            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    /**
     * GET /favorites/:partId/check
     * Verifica se uma peça está nos favoritos
     */
    static async checkFavorite(req: Request, res: Response) {
        try {
            const user = req.user;
            if (!user) return res.status(401).json({ message: 'Not authenticated' });

            const partId = parseInt(req.params.partId);
            
            if (isNaN(partId) || partId < 1) {
                return res.status(400).json({ message: 'Invalid part ID' });
            }

            const isFavorite = await FavoritesService.isFavorite(user.id, partId);
            
            return res.status(200).json({ partId, isFavorite });

        } catch (error: any) {
            Logger.error(`Check favorite failed (userId=${req.user?.id}, reqId=${req.headers['x-request-id'] || 'n/a'})`, error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }
}

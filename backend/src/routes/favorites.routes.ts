import { Router } from 'express';
import { FavoritesController } from '../controllers/favorites.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

// Todas as rotas requerem autenticação (qualquer role pode ter favoritos)
router.get('/', authenticate, FavoritesController.getUserFavorites);
router.post('/:partId', authenticate, FavoritesController.addFavorite);
router.delete('/:partId', authenticate, FavoritesController.removeFavorite);
router.get('/:partId/check', authenticate, FavoritesController.checkFavorite);

export { router as favoritesRouter };

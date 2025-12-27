import { prisma } from '../lib/prisma.js';

export class FavoritesService {

    /**
     * Obtém todos os favoritos de um utilizador
     */
    static async getUserFavorites(userId: number) {
        const favorites = await prisma.userFavorite.findMany({
            where: { userId },
            include: {
                part: {
                    include: {
                        category: true,
                        location: true,
                        images: true
                    }
                }
            }
        });

        // Retorna apenas as peças (sem o wrapper do favorito)
        return favorites.map(fav => fav.part);
    }

    /**
     * Adiciona uma peça aos favoritos do utilizador
     */
    static async addFavorite(userId: number, partId: number) {
        // Verificar se a peça existe
        const part = await prisma.part.findUnique({ where: { id: partId } });
        if (!part) {
            throw new Error("Part not found");
        }

        // Verificar se já está nos favoritos
        const existing = await prisma.userFavorite.findUnique({
            where: {
                userId_partId: { userId, partId }
            }
        });

        if (existing) {
            throw new Error("Part already in favorites");
        }

        // Adicionar aos favoritos
        await prisma.userFavorite.create({
            data: { userId, partId }
        });

        return { userId, partId };
    }

    /**
     * Remove uma peça dos favoritos do utilizador
     */
    static async removeFavorite(userId: number, partId: number) {
        // Verificar se existe nos favoritos
        const existing = await prisma.userFavorite.findUnique({
            where: {
                userId_partId: { userId, partId }
            }
        });

        if (!existing) {
            throw new Error("Favorite not found");
        }

        // Remover dos favoritos
        await prisma.userFavorite.delete({
            where: {
                userId_partId: { userId, partId }
            }
        });
    }

    /**
     * Verifica se uma peça está nos favoritos do utilizador
     */
    static async isFavorite(userId: number, partId: number): Promise<boolean> {
        const favorite = await prisma.userFavorite.findUnique({
            where: {
                userId_partId: { userId, partId }
            }
        });

        return !!favorite;
    }
}

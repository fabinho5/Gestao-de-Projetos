import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export interface ApiError {
    message: string;
    status?: number;
}

export interface FavoriteResult {
    success: boolean;
    message: string;
}

/**
 * Obtém todos os favoritos do utilizador
 */
export const getUserFavorites = async (): Promise<any[]> => {
    try {
        const token = await AsyncStorage.getItem('userToken');
        
        if (!token) {
            throw { message: 'Não autenticado', status: 401 } as ApiError;
        }

        const response = await fetch(`${API_URL}/favorites`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw { 
                message: errorData.message || 'Erro ao carregar favoritos', 
                status: response.status 
            } as ApiError;
        }

        const favorites = await response.json();
        return favorites;
    } catch (error: any) {
        if (error.message && error.status) {
            throw error as ApiError;
        }
        throw { 
            message: 'Erro de conexão ao carregar favoritos', 
            status: 500 
        } as ApiError;
    }
};

/**
 * Adiciona uma peça aos favoritos
 */
export const addFavorite = async (partId: number): Promise<void> => {
    try {
        const token = await AsyncStorage.getItem('userToken');
        
        if (!token) {
            throw { message: 'Não autenticado', status: 401 } as ApiError;
        }

        const response = await fetch(`${API_URL}/favorites/${partId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw { 
                message: errorData.message || 'Erro ao adicionar favorito', 
                status: response.status 
            } as ApiError;
        }
    } catch (error: any) {
        if (error.message && error.status) {
            throw error as ApiError;
        }
        throw { 
            message: 'Erro de conexão ao adicionar favorito', 
            status: 500 
        } as ApiError;
    }
};

/**
 * Remove uma peça dos favoritos
 */
export const removeFavorite = async (partId: number): Promise<void> => {
    try {
        const token = await AsyncStorage.getItem('userToken');
        
        if (!token) {
            throw { message: 'Não autenticado', status: 401 } as ApiError;
        }

        const response = await fetch(`${API_URL}/favorites/${partId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw { 
                message: errorData.message || 'Erro ao remover favorito', 
                status: response.status 
            } as ApiError;
        }
    } catch (error: any) {
        if (error.message && error.status) {
            throw error as ApiError;
        }
        throw { 
            message: 'Erro de conexão ao remover favorito', 
            status: 500 
        } as ApiError;
    }
};

/**
 * Verifica se uma peça está nos favoritos
 */
export const checkFavorite = async (partId: number): Promise<boolean> => {
    try {
        const token = await AsyncStorage.getItem('userToken');
        
        if (!token) {
            throw { message: 'Não autenticado', status: 401 } as ApiError;
        }

        const response = await fetch(`${API_URL}/favorites/${partId}/check`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw { 
                message: errorData.message || 'Erro ao verificar favorito', 
                status: response.status 
            } as ApiError;
        }

        const data = await response.json();
        return data.isFavorite;
    } catch (error: any) {
        if (error.message && error.status) {
            throw error as ApiError;
        }
        throw { 
            message: 'Erro de conexão ao verificar favorito', 
            status: 500 
        } as ApiError;
    }
};
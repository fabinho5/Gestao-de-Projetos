import AsyncStorage from '@react-native-async-storage/async-storage';

// Configuração da API
const API_URL = 'http://localhost:3002';

export interface Category {
    id: number;
    name: string;
}

export interface Location {
    id: number;
    fullCode: string;
    shelf: string;
    position: string;
    capacity: number;
}

export interface PartImage {
    id: number;
    url: string;
    partId: number;
}

export interface Specification {
    id: number;
    specId: number;
    value: string;
    spec: {
        id: number;
        name: string;
    };
}

export interface SubReference {
    id: number;
    value: string;
    partId: number;
}

export interface Part {
    id: number;
    name: string;
    refInternal: string;
    refOEM?: string | null;
    description?: string | null;
    price: number;
    condition: 'NEW' | 'USED' | 'REFURBISHED';
    categoryId: number;
    locationId: number;
    createdAt: string;
    updatedAt: string;
    category: Category;
    location: Location;
    images: PartImage[];
    specifications: Specification[];
    subReferences?: SubReference[];
}

export interface PaginatedParts {
    parts: Part[];
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
}

export interface ApiError {
    message: string;
    statusCode?: number;
}

const getToken = async (): Promise<string | null> => {
    try {
        return await AsyncStorage.getItem('userToken');
    } catch (error) {
        console.error('Erro ao obter token:', error);
        return null;
    }
};

export const getAllParts = async (): Promise<Part[]> => {
    try {
        console.log('📄 Carregando peças...');
        
        const token = await getToken();

        if (!token) {
            throw {
                message: 'Token não encontrado. Faça login novamente.',
                statusCode: 401,
            } as ApiError;
        }

        const response = await fetch(`${API_URL}/parts`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            if (response.status === 401) {
                throw {
                    message: 'Sessão expirada. Faça login novamente.',
                    statusCode: 401,
                } as ApiError;
            }
            
            throw {
                message: 'Erro ao carregar peças',
                statusCode: response.status,
            } as ApiError;
        }

        const data = await response.json();
        console.log('✅ Peças carregadas com sucesso:', data.length);
        
        return data;
    } catch (error) {
        if ((error as ApiError).message) {
            throw error;
        }
        
        console.error('❌ Erro de conexão:', error);
        throw {
            message: 'Erro de conexão. Verifique se o backend está rodando.',
            statusCode: 0,
        } as ApiError;
    }
};

export const getPartByRef = async (ref: string): Promise<Part> => {
    try {
        console.log(`📄 Carregando peça ${ref}...`);
        
        const token = await getToken();

        if (!token) {
            throw {
                message: 'Token não encontrado. Faça login novamente.',
                statusCode: 401,
            } as ApiError;
        }

        const response = await fetch(`${API_URL}/parts/${ref}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            if (response.status === 404) {
                throw {
                    message: 'Peça não encontrada',
                    statusCode: 404,
                } as ApiError;
            }
            
            if (response.status === 401) {
                throw {
                    message: 'Sessão expirada. Faça login novamente.',
                    statusCode: 401,
                } as ApiError;
            }
            
            throw {
                message: 'Erro ao carregar peça',
                statusCode: response.status,
            } as ApiError;
        }

        const data = await response.json();
        console.log('✅ Peça carregada com sucesso');
        
        return data;
    } catch (error) {
        if ((error as ApiError).message) {
            throw error;
        }
        
        console.error('❌ Erro de conexão:', error);
        throw {
            message: 'Erro de conexão',
            statusCode: 0,
        } as ApiError;
    }
};

export const paginateParts = (
    parts: Part[],
    searchQuery: string = '',
    page: number = 1,
    itemsPerPage: number = 20
): PaginatedParts => {
    // Filtrar peças baseado na pesquisa
    const filteredParts = searchQuery.trim() === '' 
        ? parts 
        : parts.filter(part => 
            part.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            part.refInternal.toLowerCase().includes(searchQuery.toLowerCase()) ||
            part.refOEM?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            part.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            part.category.name.toLowerCase().includes(searchQuery.toLowerCase())
        );

    const totalItems = filteredParts.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedParts = filteredParts.slice(startIndex, endIndex);

    return {
        parts: paginatedParts,
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage,
    };
};

export const getConditionName = (condition: string): string => {
    const conditions: Record<string, string> = {
        NEW: 'Nova',
        USED: 'Usada',
        REFURBISHED: 'Recondicionada',
    };
    return conditions[condition] || condition;
};

export const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('pt-PT', {
        style: 'currency',
        currency: 'EUR',
    }).format(price);
};

export const formatDate = (dateString: string): string => {
    try {
        return new Date(dateString).toLocaleDateString('pt-PT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    } catch (error) {
        return 'Data inválida';
    }
};
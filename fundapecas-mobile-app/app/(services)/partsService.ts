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
    _count: {
        parts: number;
    };
}

export interface PartImage {
    id: number;
    url: string;
    partId: number;
}

export interface Specification {
    id: number;
    name: string;
}

export interface PartSpecification {
    id: number;
    specId: number;
    value: string;
    spec: Specification;
}

export interface SubReference {
    id: number;
    value: string;
    partId: number;
}

export type PartCondition = 'NEW' | 'USED' | 'REFURBISHED';

export interface Part {
    id: number;
    name: string;
    refInternal: string;
    refOEM?: string | null;
    description?: string | null;
    price: number;
    condition: PartCondition;
    categoryId: number;
    locationId: number;
    createdAt: string;
    updatedAt: string;
    category: Category;
    location: Location;
    images: PartImage[];
    specifications: PartSpecification[];
    subReferences?: SubReference[];
}

export interface PaginatedParts {
    parts: Part[];
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
}

export interface CreatePartData {
    name: string;
    refInternal: string;
    refOEM?: string | null;
    description?: string | null;
    price: number;
    condition: PartCondition;
    categoryId: number;
    locationId: number;
    specifications?: { specId: number; value: string }[];
    subReferences?: string[];
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


export const deletePart = async (ref: string): Promise<void> => {
    try {
        console.log(`🗑️ Eliminando peça ${ref}...`);
        
        const token = await getToken();

        if (!token) {
            throw {
                message: 'Token não encontrado. Faça login novamente.',
                statusCode: 401,
            } as ApiError;
        }

        const response = await fetch(`${API_URL}/parts/${ref}`, {
            method: 'DELETE',
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

            if (response.status === 403) {
                throw {
                    message: 'Não tem permissão para eliminar peças',
                    statusCode: 403,
                } as ApiError;
            }
            
            throw {
                message: 'Erro ao eliminar peça',
                statusCode: response.status,
            } as ApiError;
        }

        console.log('✅ Peça eliminada com sucesso');
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

// ==================== PARTS ====================

export const getPartById = async (id: string | number): Promise<Part> => {
    try {
        console.log(`📄 Carregando peça ID ${id}...`);

        const token = await getToken();

        if (!token) {
            throw {
                message: 'Token não encontrado. Faça login novamente.',
                statusCode: 401,
            } as ApiError;
        }

        const response = await fetch(`${API_URL}/parts/${id}`, {
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

        throw {
            message: 'Erro de conexão. Verifique se o backend está rodando.',
            statusCode: 0,
        } as ApiError;
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

export const createPart = async (data: CreatePartData): Promise<Part> => {
    try {
        console.log('🆕 Criando nova peça...');
        
        const token = await getToken();

        if (!token) {
            throw {
                message: 'Token não encontrado. Faça login novamente.',
                statusCode: 401,
            } as ApiError;
        }

        const response = await fetch(`${API_URL}/parts`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            if (response.status === 401) {
                throw {
                    message: 'Sessão expirada. Faça login novamente.',
                    statusCode: 401,
                } as ApiError;
            }

            if (response.status === 400) {
                const errorData = await response.json();
                throw {
                    message: errorData.message || 'Dados inválidos',
                    statusCode: 400,
                } as ApiError;
            }

            if (response.status === 404) {
                const errorData = await response.json();
                throw {
                    message: errorData.message || 'Categoria ou localização não encontrada',
                    statusCode: 404,
                } as ApiError;
            }

            if (response.status === 409) {
                const errorData = await response.json();
                throw {
                    message: errorData.message || 'Localização sem capacidade disponível',
                    statusCode: 409,
                } as ApiError;
            }
            
            throw {
                message: 'Erro ao criar peça',
                statusCode: response.status,
            } as ApiError;
        }

        const part = await response.json();
        console.log('✅ Peça criada com sucesso:', part.refInternal);
        
        return part;
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

// ==================== CATEGORIES ====================

export const getCategories = async (): Promise<Category[]> => {
    try {
        console.log('📂 Carregando categorias...');
        console.log('🔗 URL:', `${API_URL}/parts/categories/list`);
        
        const token = await getToken();
        console.log('🔑 Token obtido:', token ? 'Sim' : 'Não');

        if (!token) {
            throw {
                message: 'Token não encontrado. Faça login novamente.',
                statusCode: 401,
            } as ApiError;
        }

        const response = await fetch(`${API_URL}/parts/categories/list`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        console.log('📡 Status da resposta:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Erro na resposta:', errorText);
            
            if (response.status === 401) {
                throw {
                    message: 'Sessão expirada. Faça login novamente.',
                    statusCode: 401,
                } as ApiError;
            }
            
            if (response.status === 404) {
                throw {
                    message: 'Endpoint de categorias não encontrado. Verifique a rota no backend.',
                    statusCode: 404,
                } as ApiError;
            }
            
            throw {
                message: `Erro ao carregar categorias (${response.status})`,
                statusCode: response.status,
            } as ApiError;
        }

        const data = await response.json();
        console.log('✅ Categorias carregadas:', data.length);
        console.log('📋 Categorias:', data);
        
        return data;
    } catch (error) {
        console.error('❌ Erro completo:', error);
        
        if ((error as ApiError).message) {
            throw error;
        }
        
        throw {
            message: 'Erro de conexão. Verifique se o backend está rodando.',
            statusCode: 0,
        } as ApiError;
    }
};

// ==================== LOCATIONS ====================

export const getLocations = async (): Promise<Location[]> => {
    try {
        console.log('📍 Carregando localizações...');
        console.log('🔗 URL:', `${API_URL}/parts/locations/list`);
        
        const token = await getToken();

        if (!token) {
            throw {
                message: 'Token não encontrado. Faça login novamente.',
                statusCode: 401,
            } as ApiError;
        }

        const response = await fetch(`${API_URL}/parts/locations/list`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        console.log('📡 Status da resposta:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Erro na resposta:', errorText);
            
            if (response.status === 401) {
                throw {
                    message: 'Sessão expirada. Faça login novamente.',
                    statusCode: 401,
                } as ApiError;
            }
            
            if (response.status === 404) {
                throw {
                    message: 'Endpoint de localizações não encontrado. Verifique a rota no backend.',
                    statusCode: 404,
                } as ApiError;
            }
            
            throw {
                message: `Erro ao carregar localizações (${response.status})`,
                statusCode: response.status,
            } as ApiError;
        }

        const data = await response.json();
        console.log('✅ Localizações carregadas:', data.length);
        
        return data;
    } catch (error) {
        console.error('❌ Erro completo:', error);
        
        if ((error as ApiError).message) {
            throw error;
        }
        
        throw {
            message: 'Erro de conexão',
            statusCode: 0,
        } as ApiError;
    }
};

// ==================== SPECIFICATIONS ====================

export const getSpecifications = async (): Promise<Specification[]> => {
    try {
        console.log('📋 Carregando especificações...');
        console.log('🔗 URL:', `${API_URL}/parts/specifications/list`);
        
        const token = await getToken();

        if (!token) {
            throw {
                message: 'Token não encontrado. Faça login novamente.',
                statusCode: 401,
            } as ApiError;
        }

        const response = await fetch(`${API_URL}/parts/specifications/list`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        console.log('📡 Status da resposta:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Erro na resposta:', errorText);
            
            if (response.status === 401) {
                throw {
                    message: 'Sessão expirada. Faça login novamente.',
                    statusCode: 401,
                } as ApiError;
            }
            
            if (response.status === 404) {
                throw {
                    message: 'Endpoint de especificações não encontrado. Verifique a rota no backend.',
                    statusCode: 404,
                } as ApiError;
            }
            
            throw {
                message: `Erro ao carregar especificações (${response.status})`,
                statusCode: response.status,
            } as ApiError;
        }

        const data = await response.json();
        console.log('✅ Especificações carregadas:', data.length);
        
        return data;
    } catch (error) {
        console.error('❌ Erro completo:', error);
        
        if ((error as ApiError).message) {
            throw error;
        }
        
        throw {
            message: 'Erro de conexão',
            statusCode: 0,
        } as ApiError;
    }
};

// ==================== UTILITY FUNCTIONS ====================

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
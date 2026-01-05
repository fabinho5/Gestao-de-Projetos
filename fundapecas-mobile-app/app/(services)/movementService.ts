import AsyncStorage from '@react-native-async-storage/async-storage';

// Configuração da API
const API_URL = process.env.EXPO_PUBLIC_API_URL;

// ==================== TIPOS ====================

export type MovementType = 'ENTRY' | 'EXIT' | 'TRANSFER' | 'RETURN' | 'ADJUSTMENT';

export interface StockMovement {
    id: number;
    partId: number;
    userId: number;
    type: MovementType;
    sourceLocId: number | null;
    destLocId: number | null;
    timestamp: string;
    part?: {
        id: number;
        name: string;
        refInternal: string;
    };
    user?: {
        id: number;
        username: string;
        fullName: string | null;
    };
    sourceLoc?: LocationDetail | null;
    destLoc?: LocationDetail | null;
}

export interface LocationDetail {
    id: number;
    fullCode: string;
    rack: string;
    shelf: string;
    pallet: string;
    capacity: number;
    warehouse: {
        id: number;
        code: string;
        name: string;
    };
}

export interface AvailableLocation {
    id: number;
    fullCode: string;
    rack: string;
    shelf: string;
    pallet: string;
    warehouse: {
        id: number;
        code: string;
        name: string;
    };
    capacity: number;
    currentParts: number;
    availableSpace: number;
    hasSpace: boolean;
}

export interface RecordEntryData {
    partId: number;
    locationId: number;
}

export interface RecordExitData {
    partId: number;
}

export interface RecordTransferData {
    partId: number;
    fromLocationId: number;
    toLocationId: number;
}

export interface RecordReturnData {
    partId: number;
    toLocationId?: number;
    isDamaged?: boolean;
}

export interface RecordAdjustmentData {
    partId: number;
    newLocationId: number | null;
}

export interface ApiError {
    message: string;
    statusCode?: number;
}

// ==================== HELPERS ====================

const getToken = async (): Promise<string | null> => {
    try {
        return await AsyncStorage.getItem('userToken');
    } catch (error) {
        console.error('Erro ao obter token:', error);
        return null;
    }
};

// ==================== MOVIMENTOS ====================

/**
 * Regista entrada de peça no armazém
 */
export const recordEntry = async (data: RecordEntryData): Promise<StockMovement> => {
    try {
        console.log('📦 Registando entrada...', data);
        
        const token = await getToken();

        if (!token) {
            throw {
                message: 'Token não encontrado. Faça login novamente.',
                statusCode: 401,
            } as ApiError;
        }

        const response = await fetch(`${API_URL}/stock-movements/entry`, {
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
            
            throw {
                message: 'Erro ao registar entrada',
                statusCode: response.status,
            } as ApiError;
        }

        const movement = await response.json();
        console.log('✅ Entrada registada com sucesso');
        
        return movement;
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

/**
 * Regista saída de peça do armazém
 */
export const recordExit = async (data: RecordExitData): Promise<StockMovement> => {
    try {
        console.log('📤 Registando saída...', data);
        
        const token = await getToken();

        if (!token) {
            throw {
                message: 'Token não encontrado. Faça login novamente.',
                statusCode: 401,
            } as ApiError;
        }

        const response = await fetch(`${API_URL}/stock-movements/exit`, {
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

            if (response.status === 404) {
                throw {
                    message: 'Peça não encontrada',
                    statusCode: 404,
                } as ApiError;
            }
            
            throw {
                message: 'Erro ao registar saída',
                statusCode: response.status,
            } as ApiError;
        }

        const movement = await response.json();
        console.log('✅ Saída registada com sucesso');
        
        return movement;
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

/**
 * Regista transferência entre localizações
 */
export const recordTransfer = async (data: RecordTransferData): Promise<StockMovement> => {
    try {
        console.log('🔄 Registando transferência...', data);
        
        const token = await getToken();

        if (!token) {
            throw {
                message: 'Token não encontrado. Faça login novamente.',
                statusCode: 401,
            } as ApiError;
        }

        const response = await fetch(`${API_URL}/stock-movements/transfer`, {
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
            
            throw {
                message: 'Erro ao registar transferência',
                statusCode: response.status,
            } as ApiError;
        }

        const movement = await response.json();
        console.log('✅ Transferência registada com sucesso');
        
        return movement;
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

/**
 * Regista devolução de peça
 */
export const recordReturn = async (data: RecordReturnData): Promise<StockMovement> => {
    try {
        console.log('↩️ Registando devolução...', data);
        
        const token = await getToken();

        if (!token) {
            throw {
                message: 'Token não encontrado. Faça login novamente.',
                statusCode: 401,
            } as ApiError;
        }

        const response = await fetch(`${API_URL}/stock-movements/return`, {
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
            
            throw {
                message: 'Erro ao registar devolução',
                statusCode: response.status,
            } as ApiError;
        }

        const movement = await response.json();
        console.log('✅ Devolução registada com sucesso');
        
        return movement;
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

/**
 * Regista ajuste manual (ADMIN apenas)
 */
export const recordAdjustment = async (data: RecordAdjustmentData): Promise<StockMovement> => {
    try {
        console.log('⚙️ Registando ajuste...', data);
        
        const token = await getToken();

        if (!token) {
            throw {
                message: 'Token não encontrado. Faça login novamente.',
                statusCode: 401,
            } as ApiError;
        }

        const response = await fetch(`${API_URL}/stock-movements/adjustment`, {
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

            if (response.status === 404) {
                throw {
                    message: 'Peça não encontrada',
                    statusCode: 404,
                } as ApiError;
            }

            if (response.status === 400) {
                const errorData = await response.json();
                throw {
                    message: errorData.message || 'Dados inválidos',
                    statusCode: 400,
                } as ApiError;
            }
            
            throw {
                message: 'Erro ao registar ajuste',
                statusCode: response.status,
            } as ApiError;
        }

        const movement = await response.json();
        console.log('✅ Ajuste registado com sucesso');
        
        return movement;
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

// ==================== CONSULTAS ====================

/**
 * Obtém histórico de movimentos de uma peça
 */
export const getPartMovements = async (partId: number): Promise<StockMovement[]> => {
    try {
        console.log(`📋 Carregando movimentos da peça ${partId}...`);
        
        const token = await getToken();

        if (!token) {
            throw {
                message: 'Token não encontrado. Faça login novamente.',
                statusCode: 401,
            } as ApiError;
        }

        const response = await fetch(`${API_URL}/stock-movements/part/${partId}`, {
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
                message: 'Erro ao carregar movimentos',
                statusCode: response.status,
            } as ApiError;
        }

        const movements = await response.json();
        console.log('✅ Movimentos carregados:', movements.length);
        
        return movements;
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

/**
 * Obtém movimentos recentes (para dashboard)
 */
export const getRecentMovements = async (limit: number = 50): Promise<StockMovement[]> => {
    try {
        console.log(`📊 Carregando movimentos recentes (limit: ${limit})...`);
        
        const token = await getToken();

        if (!token) {
            throw {
                message: 'Token não encontrado. Faça login novamente.',
                statusCode: 401,
            } as ApiError;
        }

        const response = await fetch(`${API_URL}/stock-movements/recent?limit=${limit}`, {
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
                message: 'Erro ao carregar movimentos recentes',
                statusCode: response.status,
            } as ApiError;
        }

        const movements = await response.json();
        console.log('✅ Movimentos recentes carregados:', movements.length);
        
        return movements;
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

/**
 * Lista localizações disponíveis
 */
export const getAvailableLocations = async (warehouseId?: number): Promise<AvailableLocation[]> => {
    try {
        console.log('📍 Carregando localizações disponíveis...');
        
        const token = await getToken();

        if (!token) {
            throw {
                message: 'Token não encontrado. Faça login novamente.',
                statusCode: 401,
            } as ApiError;
        }

        const url = warehouseId 
            ? `${API_URL}/stock-movements/locations?warehouseId=${warehouseId}`
            : `${API_URL}/stock-movements/locations`;

        const response = await fetch(url, {
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
                message: 'Erro ao carregar localizações',
                statusCode: response.status,
            } as ApiError;
        }

        const locations = await response.json();
        console.log('✅ Localizações carregadas:', locations.length);
        
        return locations;
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

// ==================== UTILITY FUNCTIONS ====================

export const getMovementTypeName = (type: MovementType): string => {
    const types: Record<MovementType, string> = {
        ENTRY: 'Entrada',
        EXIT: 'Saída',
        TRANSFER: 'Transferência',
        RETURN: 'Devolução',
        ADJUSTMENT: 'Ajuste',
    };
    return types[type] || type;
};

export const getMovementTypeColor = (type: MovementType): string => {
    const colors: Record<MovementType, string> = {
        ENTRY: '#10b981',      // verde
        EXIT: '#ef4444',       // vermelho
        TRANSFER: '#3b82f6',   // azul
        RETURN: '#f59e0b',     // laranja
        ADJUSTMENT: '#8b5cf6', // roxo
    };
    return colors[type] || '#6b7280';
};

export const formatTimestamp = (timestamp: string): string => {
    try {
        return new Date(timestamp).toLocaleString('pt-PT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch (error) {
        return 'Data inválida';
    }
};
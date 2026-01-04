import AsyncStorage from '@react-native-async-storage/async-storage';

// Configuração da API
const API_URL = 'http://localhost:3002';

export type ReservationStatus = 
    | 'PENDING' 
    | 'IN_PREPARATION' 
    | 'READY_TO_SHIP' 
    | 'COMPLETED' 
    | 'CONFIRMED' 
    | 'CANCELLED';

export type CancelReason = 'DESIST' | 'RETURN' | 'DAMAGED_RETURN';

export interface ReservationUser {
    id: number;
    username: string;
    fullName: string;
}

export interface ReservationPart {
    id: number;
    name: string;
    refInternal: string;
    location?: {
        id: number;
        fullCode: string;
    };
}

export interface Reservation {
    id: number;
    userId: number;
    partId: number;
    assignedToId?: number | null;
    status: ReservationStatus;
    notes?: string | null;
    cancelReason?: CancelReason | null;
    returnLocationId?: number | null;
    cancelledAt?: string | null;
    createdAt: string;
    updatedAt: string;
    user: ReservationUser;
    assignedTo?: ReservationUser | null;
    part: ReservationPart;
    returnLocation?: any;
}

export interface CreateReservationData {
    partId: number;
    notes?: string;
}

export interface CancelReservationData {
    cancelReason: CancelReason;
    returnLocationId?: number;
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

// ==================== RESERVATIONS ====================

export const getAllReservations = async (filters?: {
    status?: ReservationStatus;
    userId?: number;
    assignedToId?: number;
}): Promise<Reservation[]> => {
    try {
        console.log('📦 Carregando reservas...');
        
        const token = await getToken();

        if (!token) {
            throw {
                message: 'Token não encontrado. Faça login novamente.',
                statusCode: 401,
            } as ApiError;
        }

        // Construir query params
        const params = new URLSearchParams();
        if (filters?.status) params.append('status', filters.status);
        if (filters?.userId) params.append('userId', filters.userId.toString());
        if (filters?.assignedToId) params.append('assignedToId', filters.assignedToId.toString());

        const url = `${API_URL}/reservations${params.toString() ? `?${params.toString()}` : ''}`;

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
                message: 'Erro ao carregar reservas',
                statusCode: response.status,
            } as ApiError;
        }

        const data = await response.json();
        console.log('✅ Reservas carregadas com sucesso:', data.length);
        
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

export const getPendingReservations = async (): Promise<Reservation[]> => {
    try {
        console.log('📦 Carregando reservas pendentes...');
        
        const token = await getToken();

        if (!token) {
            throw {
                message: 'Token não encontrado. Faça login novamente.',
                statusCode: 401,
            } as ApiError;
        }

        const response = await fetch(`${API_URL}/reservations/pending`, {
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
                message: 'Erro ao carregar reservas pendentes',
                statusCode: response.status,
            } as ApiError;
        }

        const data = await response.json();
        console.log('✅ Reservas pendentes carregadas:', data.length);
        
        return data;
    } catch (error) {
        if ((error as ApiError).message) {
            throw error;
        }
        
        throw {
            message: 'Erro de conexão',
            statusCode: 0,
        } as ApiError;
    }
};

export const getMyAssignedReservations = async (): Promise<Reservation[]> => {
    try {
        console.log('📦 Carregando minhas reservas...');
        
        const token = await getToken();

        if (!token) {
            throw {
                message: 'Token não encontrado. Faça login novamente.',
                statusCode: 401,
            } as ApiError;
        }

        const response = await fetch(`${API_URL}/reservations/my-assigned`, {
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
                message: 'Erro ao carregar reservas atribuídas',
                statusCode: response.status,
            } as ApiError;
        }

        const data = await response.json();
        console.log('✅ Reservas atribuídas carregadas:', data.length);
        
        return data;
    } catch (error) {
        if ((error as ApiError).message) {
            throw error;
        }
        
        throw {
            message: 'Erro de conexão',
            statusCode: 0,
        } as ApiError;
    }
};

export const getReservationById = async (id: number): Promise<Reservation> => {
    try {
        console.log(`📦 Carregando reserva ${id}...`);
        
        const token = await getToken();

        if (!token) {
            throw {
                message: 'Token não encontrado. Faça login novamente.',
                statusCode: 401,
            } as ApiError;
        }

        const response = await fetch(`${API_URL}/reservations/${id}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            if (response.status === 404) {
                throw {
                    message: 'Reserva não encontrada',
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
                message: 'Erro ao carregar reserva',
                statusCode: response.status,
            } as ApiError;
        }

        const data = await response.json();
        console.log('✅ Reserva carregada com sucesso');
        
        return data;
    } catch (error) {
        if ((error as ApiError).message) {
            throw error;
        }
        
        throw {
            message: 'Erro de conexão',
            statusCode: 0,
        } as ApiError;
    }
};

export const createReservation = async (data: CreateReservationData): Promise<Reservation> => {
    try {
        console.log('🆕 Criando nova reserva...');
        
        const token = await getToken();

        if (!token) {
            throw {
                message: 'Token não encontrado. Faça login novamente.',
                statusCode: 401,
            } as ApiError;
        }

        const response = await fetch(`${API_URL}/reservations`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorData = await response.json();
            
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

            if (response.status === 409) {
                throw {
                    message: errorData.message || 'Peça já tem uma reserva ativa',
                    statusCode: 409,
                } as ApiError;
            }
            
            throw {
                message: errorData.message || 'Erro ao criar reserva',
                statusCode: response.status,
            } as ApiError;
        }

        const reservation = await response.json();
        console.log('✅ Reserva criada com sucesso:', reservation.id);
        
        return reservation;
    } catch (error) {
        if ((error as ApiError).message) {
            throw error;
        }
        
        throw {
            message: 'Erro de conexão',
            statusCode: 0,
        } as ApiError;
    }
};

export const assignReservation = async (reservationId: number): Promise<Reservation> => {
    try {
        console.log(`📦 Atribuindo reserva ${reservationId}...`);
        
        const token = await getToken();

        if (!token) {
            throw {
                message: 'Token não encontrado. Faça login novamente.',
                statusCode: 401,
            } as ApiError;
        }

        const response = await fetch(`${API_URL}/reservations/${reservationId}/assign`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            const errorData = await response.json();
            
            if (response.status === 404) {
                throw {
                    message: 'Reserva não encontrada',
                    statusCode: 404,
                } as ApiError;
            }

            if (response.status === 409) {
                throw {
                    message: 'Reserva já atribuída a outro utilizador',
                    statusCode: 409,
                } as ApiError;
            }
            
            throw {
                message: errorData.message || 'Erro ao atribuir reserva',
                statusCode: response.status,
            } as ApiError;
        }

        const reservation = await response.json();
        console.log('✅ Reserva atribuída com sucesso');
        
        return reservation;
    } catch (error) {
        if ((error as ApiError).message) {
            throw error;
        }
        
        throw {
            message: 'Erro de conexão',
            statusCode: 0,
        } as ApiError;
    }
};

export const updateReservationStatus = async (
    reservationId: number, 
    status: ReservationStatus
): Promise<Reservation> => {
    try {
        console.log(`📦 Atualizando status da reserva ${reservationId}...`);
        
        const token = await getToken();

        if (!token) {
            throw {
                message: 'Token não encontrado. Faça login novamente.',
                statusCode: 401,
            } as ApiError;
        }

        const response = await fetch(`${API_URL}/reservations/${reservationId}/status`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            
            if (response.status === 404) {
                throw {
                    message: 'Reserva não encontrada',
                    statusCode: 404,
                } as ApiError;
            }

            if (response.status === 403) {
                throw {
                    message: 'Sem permissão para atualizar esta reserva',
                    statusCode: 403,
                } as ApiError;
            }
            
            throw {
                message: errorData.message || 'Erro ao atualizar status',
                statusCode: response.status,
            } as ApiError;
        }

        const reservation = await response.json();
        console.log('✅ Status atualizado com sucesso');
        
        return reservation;
    } catch (error) {
        if ((error as ApiError).message) {
            throw error;
        }
        
        throw {
            message: 'Erro de conexão',
            statusCode: 0,
        } as ApiError;
    }
};

export const cancelReservation = async (
    reservationId: number,
    data: CancelReservationData
): Promise<Reservation> => {
    try {
        console.log(`📦 Cancelando reserva ${reservationId}...`);
        
        const token = await getToken();

        if (!token) {
            throw {
                message: 'Token não encontrado. Faça login novamente.',
                statusCode: 401,
            } as ApiError;
        }

        const response = await fetch(`${API_URL}/reservations/${reservationId}/cancel`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorData = await response.json();
            
            if (response.status === 404) {
                throw {
                    message: 'Reserva não encontrada',
                    statusCode: 404,
                } as ApiError;
            }
            
            throw {
                message: errorData.message || 'Erro ao cancelar reserva',
                statusCode: response.status,
            } as ApiError;
        }

        const reservation = await response.json();
        console.log('✅ Reserva cancelada com sucesso');
        
        return reservation;
    } catch (error) {
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

export const getStatusColor = (status: ReservationStatus): string => {
    const colors: Record<ReservationStatus, string> = {
        PENDING: '#f59e0b',
        IN_PREPARATION: '#3b82f6',
        READY_TO_SHIP: '#8b5cf6',
        COMPLETED: '#10b981',
        CONFIRMED: '#059669',
        CANCELLED: '#ef4444',
    };
    return colors[status] || '#6b7280';
};

export const getStatusName = (status: ReservationStatus): string => {
    const names: Record<ReservationStatus, string> = {
        PENDING: 'Pendente',
        IN_PREPARATION: 'Em Preparação',
        READY_TO_SHIP: 'Pronto para Envio',
        COMPLETED: 'Concluído',
        CONFIRMED: 'Confirmado',
        CANCELLED: 'Cancelado',
    };
    return names[status] || status;
};

export const formatDate = (dateString: string): string => {
    try {
        return new Date(dateString).toLocaleDateString('pt-PT', {
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
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configuração da API
const API_URL = process.env.EXPO_PUBLIC_API_URL;

// ============================================
// TIPOS E INTERFACES
// ============================================

export interface UserProfile {
    id: string;
    username: string;
    email: string;
    fullName: string;
    role: string;
    createdAt: string;
}

export interface ChangePasswordRequest {
    oldPassword: string;
    newPassword: string;
}

export interface ApiError {
    message: string;
    statusCode?: number;
}

// ============================================
// HELPERS
// ============================================

/**
 * Obtém o token guardado no AsyncStorage
 */
const getToken = async (): Promise<string | null> => {
    try {
        return await AsyncStorage.getItem('userToken');
    } catch (error) {
        console.error('Erro ao obter token:', error);
        return null;
    }
};

/**
 * Remove o token do AsyncStorage
 */
const removeToken = async (): Promise<void> => {
    try {
        await AsyncStorage.removeItem('userToken');
        console.log('Token removido');
    } catch (error) {
        console.error('Erro ao remover token:', error);
    }
};

// ============================================
// VALIDAÇÕES DE PASSWORD
// ============================================

/**
 * Valida se a password cumpre os requisitos de segurança
 */
export const validatePassword = (password: string): { valid: boolean; message?: string } => {
    if (password.length < 6) {
        return {
            valid: false,
            message: 'A password deve ter no mínimo 6 caracteres',
        };
    }

    if (!/[a-z]/.test(password)) {
        return {
            valid: false,
            message: 'Password deve conter pelo menos uma letra minúscula',
        };
    }

    if (!/[A-Z]/.test(password)) {
        return {
            valid: false,
            message: 'Password deve conter pelo menos uma letra maiúscula',
        };
    }

    if (!/[0-9]/.test(password)) {
        return {
            valid: false,
            message: 'Password deve conter pelo menos um número',
        };
    }

    return { valid: true };
};

/**
 * Valida se as passwords coincidem
 */
export const validatePasswordMatch = (
    password: string, 
    confirmPassword: string
): { valid: boolean; message?: string } => {
    if (password !== confirmPassword) {
        return {
            valid: false,
            message: 'As passwords não coincidem',
        };
    }
    return { valid: true };
};

/**
 * Valida se todos os campos de alteração de password estão preenchidos
 */
export const validatePasswordFields = (
    oldPassword: string,
    newPassword: string,
    confirmPassword: string
): { valid: boolean; message?: string } => {
    if (!oldPassword || !newPassword || !confirmPassword) {
        return {
            valid: false,
            message: 'Preencha todos os campos',
        };
    }
    return { valid: true };
};

// ============================================
// SERVIÇO DE PERFIL
// ============================================

/**
 * Obtém o perfil do utilizador autenticado
 * @returns UserProfile com os dados do utilizador
 * @throws ApiError se houver erro ao carregar o perfil
 */
export const getProfile = async (): Promise<UserProfile> => {
    try {
        console.log('🔄 Carregando perfil...');
        
        const token = await getToken();

        if (!token) {
            throw {
                message: 'Token não encontrado. Faça login novamente.',
                statusCode: 401,
            } as ApiError;
        }

        const response = await fetch(`${API_URL}/auth/me`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            if (response.status === 401) {
                // Token inválido/expirado
                await removeToken();
                throw {
                    message: 'Sessão expirada. Faça login novamente.',
                    statusCode: 401,
                } as ApiError;
            }
            
            throw {
                message: 'Erro ao carregar perfil',
                statusCode: response.status,
            } as ApiError;
        }

        const data = await response.json();
        console.log('✅ Perfil carregado com sucesso');
        
        return data;
    } catch (error) {
        // Se já for um ApiError, re-throw
        if ((error as ApiError).message) {
            throw error;
        }
        
        // Caso contrário, é um erro de rede/conexão
        console.error('❌ Erro de conexão:', error);
        throw {
            message: 'Erro de conexão. Verifique se o backend está rodando.',
            statusCode: 0,
        } as ApiError;
    }
};

/**
 * Altera a password do utilizador
 * @param passwords - Password antiga e nova password
 * @throws ApiError se houver erro ao alterar a password
 */
export const changePassword = async (passwords: ChangePasswordRequest): Promise<void> => {
    try {
        console.log('🔄 Alterando password...');
        
        const token = await getToken();

        if (!token) {
            throw {
                message: 'Token não encontrado. Faça login novamente.',
                statusCode: 401,
            } as ApiError;
        }

        const response = await fetch(`${API_URL}/auth/change-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(passwords),
        });

        if (!response.ok) {
            const data = await response.json();
            throw {
                message: data.message || 'Erro ao alterar password',
                statusCode: response.status,
            } as ApiError;
        }

        console.log('✅ Password alterada com sucesso');
        
        // Remove token após alterar password (forçar novo login)
        await removeToken();
    } catch (error) {
        // Se já for um ApiError, re-throw
        if ((error as ApiError).message) {
            throw error;
        }
        
        // Caso contrário, é um erro de rede/conexão
        console.error('❌ Erro de conexão:', error);
        throw {
            message: 'Erro de conexão',
            statusCode: 0,
        } as ApiError;
    }
};

/**
 * Atualiza informações do perfil (futuro)
 * Esta função pode ser expandida para permitir editar nome, email, etc.
 */
export const updateProfile = async (updates: Partial<UserProfile>): Promise<UserProfile> => {
    try {
        console.log('🔄 Atualizando perfil...');
        
        const token = await getToken();

        if (!token) {
            throw {
                message: 'Token não encontrado. Faça login novamente.',
                statusCode: 401,
            } as ApiError;
        }

        const response = await fetch(`${API_URL}/auth/profile`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(updates),
        });

        if (!response.ok) {
            const data = await response.json();
            throw {
                message: data.message || 'Erro ao atualizar perfil',
                statusCode: response.status,
            } as ApiError;
        }

        const data = await response.json();
        console.log('✅ Perfil atualizado com sucesso');
        
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

// ============================================
// HELPERS DE FORMATAÇÃO
// ============================================

/**
 * Converte o role do utilizador para nome em português
 */
export const getRoleName = (role: string): string => {
    const roles: Record<string, string> = {
        ADMIN: 'Administrador',
        SALES: 'Vendas',
        WAREHOUSE: 'Armazém',
        CLIENT: 'Cliente',
    };
    return roles[role] || role;
};

/**
 * Formata data para formato português
 */
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

/**
 * Formata data e hora para formato português
 */
export const formatDateTime = (dateString: string): string => {
    try {
        return new Date(dateString).toLocaleString('pt-PT', {
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
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configuração da API
const API_URL = 'http://localhost:3002';

// ============================================
// TIPOS E INTERFACES
// ============================================

export interface LoginRequest {
    username: string;
    password: string;
}

export interface LoginResponse {
    token: string;
    user: {
        id: string;
        username: string;
        email: string;
        fullName: string;
        role: string;
    };
}

export interface ApiError {
    message: string;
    statusCode?: number;
}

// ============================================
// HELPERS PARA GESTÃO DE TOKEN
// ============================================

/**
 * Obtém o token guardado no AsyncStorage
 */
export const getToken = async (): Promise<string | null> => {
    try {
        const token = await AsyncStorage.getItem('userToken');
        console.log('Token obtido:', token ? 'Existe' : 'Não existe');
        return token;
    } catch (error) {
        console.error('Erro ao obter token:', error);
        return null;
    }
};

/**
 * Guarda o token no AsyncStorage
 */
export const saveToken = async (token: string): Promise<void> => {
    try {
        await AsyncStorage.setItem('userToken', token);
        console.log('✅ Token guardado com sucesso');
    } catch (error) {
        console.error('❌ Erro ao guardar token:', error);
        throw new Error('Não foi possível guardar o token');
    }
};

/**
 * Remove o token do AsyncStorage
 */
export const removeToken = async (): Promise<void> => {
    try {
        await AsyncStorage.removeItem('userToken');
        console.log('✅ Token removido com sucesso');
    } catch (error) {
        console.error('❌ Erro ao remover token:', error);
        throw new Error('Não foi possível remover o token');
    }
};

// ============================================
// VALIDAÇÕES
// ============================================

/**
 * Valida se os campos de login estão preenchidos
 */
export const validateLoginFields = (
    username: string, 
    password: string
): { valid: boolean; message?: string } => {
    if (!username || !password) {
        return {
            valid: false,
            message: 'Por favor preencha todos os campos.',
        };
    }
    
    if (username.trim().length === 0) {
        return {
            valid: false,
            message: 'Username não pode estar vazio',
        };
    }
    
    if (password.length === 0) {
        return {
            valid: false,
            message: 'Password não pode estar vazia',
        };
    }
    
    return { valid: true };
};

// ============================================
// SERVIÇO DE AUTENTICAÇÃO
// ============================================

/**
 * Faz login do utilizador
 * @param credentials - Username e password
 * @returns LoginResponse com token e dados do utilizador
 * @throws ApiError se houver erro no login
 */
export const login = async (credentials: LoginRequest): Promise<LoginResponse> => {
    try {
        console.log('🔄 Tentando fazer login...');
        
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(credentials),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('❌ Erro no login:', data);
            throw {
                message: data.message || 'Credenciais inválidas',
                statusCode: response.status,
            } as ApiError;
        }

        // Verificar se existe token na resposta
        const token = data.token || data.accessToken || data.access_token;
        
        if (!token) {
            console.error('❌ Token não encontrado na resposta:', data);
            throw {
                message: 'Token não recebido do servidor',
                statusCode: 500,
            } as ApiError;
        }

        // Guardar token no AsyncStorage
        await saveToken(token);

        console.log('✅ Login realizado com sucesso');
        console.log('👤 Utilizador:', data.user?.username);

        return {
            token,
            user: data.user,
        };
    } catch (error) {
        // Se já for um ApiError, re-throw
        if ((error as ApiError).message) {
            throw error;
        }
        
        // Caso contrário, é um erro de rede/conexão
        console.error('❌ Erro de conexão:', error);
        throw {
            message: 'Erro de conexão. Verifique se o servidor está ativo.',
            statusCode: 0,
        } as ApiError;
    }
};

/**
 * Faz logout do utilizador (remove token local)
 */
export const logout = async (): Promise<void> => {
    try {
        console.log('🔄 Fazendo logout...');
        await removeToken();
        console.log('✅ Logout realizado com sucesso');
    } catch (error) {
        console.error('❌ Erro ao fazer logout:', error);
        throw error;
    }
};

/**
 * Verifica se o utilizador está autenticado
 * @returns true se existe token guardado
 */
export const isAuthenticated = async (): Promise<boolean> => {
    const token = await getToken();
    return token !== null;
};

/**
 * Verifica se o token é válido fazendo uma chamada ao backend
 * @returns true se o token é válido
 */
export const validateToken = async (): Promise<boolean> => {
    try {
        const token = await getToken();
        
        if (!token) {
            return false;
        }

        const response = await fetch(`${API_URL}/auth/me`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (response.status === 401) {
            // Token inválido/expirado
            await removeToken();
            return false;
        }

        return response.ok;
    } catch (error) {
        console.error('Erro ao validar token:', error);
        return false;
    }
};
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configuração da API
const API_URL = 'http://localhost:3002';

// ============================================
// TIPOS E INTERFACES
// ============================================

export interface LoginCredentials {
    username: string;
    password: string;
}

export interface LoginResponse {
    accessToken: string;
    refreshToken: string;
    user?: {
        id: number;
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
// VALIDAÇÕES
// ============================================

export const validateLoginFields = (
    username: string,
    password: string
): { valid: boolean; message?: string } => {
    if (!username || !password) {
        return {
            valid: false,
            message: 'Preenche todos os campos.',
        };
    }
    
    if (username.length < 3) {
        return {
            valid: false,
            message: 'Username deve ter pelo menos 3 caracteres.',
        };
    }

    return { valid: true };
};

// ============================================
// SERVIÇO DE AUTENTICAÇÃO
// ============================================

/**
 * Realiza o login do utilizador
 * @param credentials - Username e password
 * @returns LoginResponse com tokens e dados do utilizador
 * @throws ApiError se houver erro no login
 */
export const login = async (credentials: LoginCredentials): Promise<LoginResponse> => {
    try {
        console.log('🔐 Tentando fazer login...');

        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(credentials),
        });

        // Tenta ler o corpo da resposta como texto primeiro
        const responseText = await response.text();
        
        if (!response.ok) {
            // Tenta fazer parse como JSON
            let errorData;
            try {
                errorData = JSON.parse(responseText);
            } catch {
                // Se não for JSON, usa o texto direto
                console.error('❌ Resposta não-JSON:', responseText);
                
                // Verifica se é rate limiting
                if (responseText.toLowerCase().includes('too many')) {
                    throw {
                        message: 'Demasiadas tentativas. Aguarda alguns minutos.',
                        statusCode: 429,
                    } as ApiError;
                }
                
                throw {
                    message: responseText || 'Erro ao fazer login',
                    statusCode: response.status,
                } as ApiError;
            }

            // Se conseguiu fazer parse do JSON
            throw {
                message: errorData.message || 'Credenciais inválidas',
                statusCode: response.status,
            } as ApiError;
        }

        // Parse do JSON de sucesso
        const data = JSON.parse(responseText);
        
        // Guarda o token no AsyncStorage
        if (data.accessToken) {
            await AsyncStorage.setItem('userToken', data.accessToken);
            console.log('✅ Token guardado com sucesso');
        }

        console.log('✅ Login bem-sucedido');
        return data;
    } catch (error) {
        // Se já é um ApiError, re-throw
        if ((error as ApiError).message) {
            throw error;
        }

        // Erro de rede/conexão
        console.error('❌ Erro de conexão:', error);
        throw {
            message: 'Erro de conexão. Verifica se o backend está ativo.',
            statusCode: 0,
        } as ApiError;
    }
};

/**
 * Faz logout do utilizador
 */
export const logout = async (): Promise<void> => {
    try {
        await AsyncStorage.removeItem('userToken');
        console.log('✅ Logout bem-sucedido');
    } catch (error) {
        console.error('❌ Erro ao fazer logout:', error);
    }
};

/**
 * Verifica se o utilizador está autenticado
 */
export const isAuthenticated = async (): Promise<boolean> => {
    try {
        const token = await AsyncStorage.getItem('userToken');
        return !!token;
    } catch (error) {
        console.error('❌ Erro ao verificar autenticação:', error);
        return false;
    }
};

/**
 * Obtém o token guardado
 */
export const getToken = async (): Promise<string | null> => {
    try {
        return await AsyncStorage.getItem('userToken');
    } catch (error) {
        console.error('❌ Erro ao obter token:', error);
        return null;
    }
};
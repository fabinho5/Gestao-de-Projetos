// Validadores de input para o auth
// Retornam null se válido, ou mensagem de erro se inválido

export const validators = {

    username: (value: any): string | null => {
        if (!value || typeof value !== 'string') {
            return 'Username is required';
        }
        
        const trimmed = value.trim();
        
        if (trimmed.length < 3 || trimmed.length > 30) {
            return 'Username must be between 3 and 30 characters';
        }
        
        if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
            return 'Username can only contain letters, numbers and underscores';
        }
        
        return null;
    },

    password: (value: any): string | null => {
        if (!value || typeof value !== 'string') {
            return 'Password is required';
        }
        
        if (value.length < 6 || value.length > 100) {
            return 'Password must be between 6 and 100 characters';
        }
        
        if (!/[a-z]/.test(value)) {
            return 'Password must contain at least one lowercase letter';
        }
        
        if (!/[A-Z]/.test(value)) {
            return 'Password must contain at least one uppercase letter';
        }
        
        if (!/[0-9]/.test(value)) {
            return 'Password must contain at least one number';
        }
        
        return null;
    },

    // Para login não aplicamos regras de força (pode ser password antiga)
    passwordLogin: (value: any): string | null => {
        if (!value || typeof value !== 'string') {
            return 'Password is required';
        }
        
        if (value.length > 100) {
            return 'Password too long';
        }
        
        return null;
    },

    email: (value: any): string | null => {
        // Email é opcional, se não vier ou for vazio, é válido
        if (!value || value === '') {
            return null;
        }
        
        if (typeof value !== 'string') {
            return 'Email must be a string';
        }
        
        const trimmed = value.trim();
        
        if (trimmed.length > 255) {
            return 'Email must be less than 255 characters';
        }
        
        // Regex simples mas eficaz para email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmed)) {
            return 'Invalid email format';
        }
        
        return null;
    },

    fullName: (value: any): string | null => {
        if (!value || typeof value !== 'string') {
            return 'Full name is required';
        }
        
        const trimmed = value.trim();
        
        if (trimmed.length < 2 || trimmed.length > 100) {
            return 'Full name must be between 2 and 100 characters';
        }
        
        return null;
    },

    refreshToken: (value: any): string | null => {
        if (!value || typeof value !== 'string') {
            return 'Refresh token is required';
        }
        
        if (value.length > 1000) {
            return 'Invalid refresh token';
        }
        
        return null;
    },

    userId: (value: any): string | null => {
        if (value === undefined || value === null) {
            return 'userId is required';
        }
        
        if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
            return 'userId must be a positive integer';
        }
        
        return null;
    }
};

// Helper para validar múltiplos campos de uma vez
// Retorna o primeiro erro encontrado ou null se todos válidos
export function validateFields(validations: Array<{ field: string; error: string | null }>): string | null {
    for (const v of validations) {
        if (v.error) {
            return v.error;
        }
    }
    return null;
}

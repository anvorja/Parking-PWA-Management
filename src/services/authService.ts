import { get, set, del } from 'idb-keyval';

const API_URL = import.meta.env.VITE_API_URL || '';
const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

export interface LoginRequest {
    username: string;
    password: string;
}

export interface AuthenticatedUser {
    id: number;
    nombreCompleto: string;
    nombreUsuario: string;
    rol: string;
}

export interface LoginResponse {
    token: string;
    type: string;
    usuario: AuthenticatedUser;
}

export const authService = {
    login: async (request: LoginRequest): Promise<LoginResponse> => {
        try {
            const response = await fetch(`${API_URL}/api/v1/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(request),
            });

            if (!response.ok) {
                throw new Error('Credenciales inválidas o error en el servidor');
            }

            const data: LoginResponse = await response.json();

            // Save offline
            await set(TOKEN_KEY, data.token);
            await set(USER_KEY, data.usuario);

            return data;
        } catch (error) {
            console.error("Login error:", error);
            throw error;
        }
    },

    logout: async (): Promise<void> => {
        await del(TOKEN_KEY);
        await del(USER_KEY);
    },

    getToken: async (): Promise<string | undefined> => {
        return await get(TOKEN_KEY);
    },

    getUser: async (): Promise<AuthenticatedUser | undefined> => {
        return await get(USER_KEY);
    },

    isAuthenticated: async (): Promise<boolean> => {
        const token = await get(TOKEN_KEY);
        return !!token;
    }
};

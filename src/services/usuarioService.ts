import { get, set } from 'idb-keyval';
import { authService } from './authService';

const API_URL = import.meta.env.VITE_API_URL || '';
const USUARIOS_CACHE_KEY = 'usuarios_cache';

export interface UsuarioListItemResponse {
    id: number;
    nombreCompleto: string;
    nombreUsuario: string;
    rol: string;
}

export interface CrearUsuarioRequest {
    nombreCompleto: string;
    nombreUsuario: string;
    contrasena: string;
    confirmacionContrasena: string;
    rol: string;
}

export interface EditarUsuarioRequest {
    nombreCompleto: string;
    nombreUsuario: string;
    contrasena?: string;
    confirmacionContrasena?: string;
    rol: string;
}

export interface CrearUsuarioResponse {
    mensaje: string;
    usuario: UsuarioListItemResponse;
}

export const usuarioService = {
    getUsuarios: async (): Promise<UsuarioListItemResponse[]> => {
        try {
            const token = await authService.getToken();

            const response = await fetch(`${API_URL}/api/v1/usuarios`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Error al obtener la lista de usuarios');
            }

            const data: UsuarioListItemResponse[] = await response.json();

            // Guardar en caché para el modo offline-first
            await set(USUARIOS_CACHE_KEY, data);

            return data;
        } catch (error) {
            console.error('Error fetching users from network, trying cache:', error);
            // Intentar recuperar de caché si falla la red (Offline-first)
            const cachedData = await get<UsuarioListItemResponse[]>(USUARIOS_CACHE_KEY);
            if (cachedData) {
                return cachedData;
            }
            throw error;
        }
    },

    crearUsuario: async (request: CrearUsuarioRequest): Promise<CrearUsuarioResponse> => {
        const token = await authService.getToken();
        const response = await fetch(`${API_URL}/api/v1/usuarios`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(request),
        });

        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`Error al crear el usuario: ${errBody}`);
        }

        return await response.json();
    },

    editarUsuario: async (id: number, request: EditarUsuarioRequest): Promise<UsuarioListItemResponse> => {
        const token = await authService.getToken();
        const response = await fetch(`${API_URL}/api/v1/usuarios/${id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(request),
        });

        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`Error al editar el usuario: ${errBody}`);
        }

        return await response.json();
    },

    eliminarUsuario: async (id: number): Promise<void> => {
        const token = await authService.getToken();
        const response = await fetch(`${API_URL}/api/v1/usuarios/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`Error al eliminar el usuario: ${errBody}`);
        }
    }
};

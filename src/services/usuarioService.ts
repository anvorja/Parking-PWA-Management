// src/services/usuarioService.ts
import { get, set } from 'idb-keyval';
import { fetchConAuth } from './authService';
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

async function handleResponseError(response: Response, defaultMessage: string) {
    let errorMessage = defaultMessage;
    try {
        const text = await response.text();
        if (text) {
            try {
                const json = JSON.parse(text);
                if (json.error && json.error.message) {
                    errorMessage = json.error.message;
                } else if (json.mensaje) {
                    errorMessage = json.mensaje;
                } else if (json.message) {
                    errorMessage = json.message;
                } else {
                    errorMessage = text;
                }
            } catch {
                errorMessage = text;
            }
        }
    } catch {
        // Ignorar fallo al leer cuerpo
    }
    throw new Error(errorMessage);
}

export const usuarioService = {
    getUsuarios: async (): Promise<UsuarioListItemResponse[]> => {
        try {
            const response = await fetchConAuth('/api/v1/usuarios');

            if (!response.ok) {
                await handleResponseError(response, 'Error al obtener la lista de usuarios');
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
        const response = await fetchConAuth('/api/v1/usuarios', {
            method: 'POST',
            body: JSON.stringify(request),
        });

        if (!response.ok) {
            await handleResponseError(response, 'Error al crear el usuario');
        }

        return await response.json();
    },

    editarUsuario: async (id: number, request: EditarUsuarioRequest): Promise<UsuarioListItemResponse> => {
        const response = await fetchConAuth(`/api/v1/usuarios/${id}`, {
            method: 'PUT',
            body: JSON.stringify(request),
        });

        if (!response.ok) {
            await handleResponseError(response, 'Error al editar el usuario');
        }

        return await response.json();
    },

    eliminarUsuario: async (id: number): Promise<void> => {
        const response = await fetchConAuth(`/api/v1/usuarios/${id}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            await handleResponseError(response, 'Error al eliminar el usuario');
        }
    }
};

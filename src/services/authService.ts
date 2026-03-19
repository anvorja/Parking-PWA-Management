// src/services/authService.ts

import { get, set, del } from 'idb-keyval'

const API_URL         = import.meta.env.VITE_API_URL || ''
const TOKEN_KEY       = 'auth_token'
const REFRESH_KEY     = 'auth_refresh_token'
const USER_KEY        = 'auth_user'

// Evento que AuthProvider escucha para redirigir al login
export const SESSION_EXPIRED_EVENT = 'parking:session-expired'

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface LoginRequest {
    username: string
    password: string
}

export interface AuthenticatedUser {
    id:             number
    nombreCompleto: string
    nombreUsuario:  string
    rol:            string
}

export interface LoginResponse {
    accessToken:  string
    refreshToken: string
    type:         string
    usuario:      AuthenticatedUser
}

export interface RefreshResponse {
    accessToken: string
    type:        string
}

// ─── Servicio ─────────────────────────────────────────────────────────────────

export const authService = {

    // ── Login ─────────────────────────────────────────────────────────────────

    login: async (request: LoginRequest): Promise<LoginResponse> => {
        const response = await fetch(`${API_URL}/api/v1/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request),
        })

        if (!response.ok) {
            throw new Error('Credenciales inválidas o error en el servidor')
        }

        const data: LoginResponse = await response.json()

        await set(TOKEN_KEY,   data.accessToken)
        await set(REFRESH_KEY, data.refreshToken)
        await set(USER_KEY,    data.usuario)

        return data
    },

    // ── Logout ────────────────────────────────────────────────────────────────
    // Notifica al backend para revocar el refresh token antes de limpiar el IDB.
    // Si no hay red o el backend falla, limpia el IDB de todas formas (best-effort).

    logout: async (): Promise<void> => {
        const refreshToken = await get<string>(REFRESH_KEY)

        if (refreshToken) {
            try {
                const accessToken = await get<string>(TOKEN_KEY)
                await fetch(`${API_URL}/api/v1/auth/logout`, {
                    method:  'POST',
                    headers: {
                        'Content-Type':  'application/json',
                        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
                    },
                    body: JSON.stringify({ refreshToken }),
                })
            } catch {
                // Fallo de red en logout — limpiamos el IDB de todas formas
                console.warn('[authService] No se pudo notificar logout al backend')
            }
        }

        await authService.limpiarSesion()
    },

    // ── Refresh ───────────────────────────────────────────────────────────────
    // Obtiene un nuevo access token usando el refresh token almacenado.
    // Devuelve el nuevo access token o null si el refresh falló.

    refreshAccessToken: async (): Promise<string | null> => {
        const refreshToken = await get<string>(REFRESH_KEY)
        if (!refreshToken) return null

        try {
            const response = await fetch(`${API_URL}/api/v1/auth/refresh`, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ refreshToken }),
            })

            if (!response.ok) {
                // Refresh token inválido o expirado → sesión terminada
                await authService.limpiarSesion()
                window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT))
                return null
            }

            const data: RefreshResponse = await response.json()
            await set(TOKEN_KEY, data.accessToken)
            return data.accessToken
        } catch {
            // Sin red — no limpiar la sesión, puede que sea temporal
            return null
        }
    },

    // ── Limpieza de sesión (sin llamada al backend) ───────────────────────────

    limpiarSesion: async (): Promise<void> => {
        await del(TOKEN_KEY)
        await del(REFRESH_KEY)
        await del(USER_KEY)
    },

    // ── Getters ───────────────────────────────────────────────────────────────

    getToken: async (): Promise<string | undefined> => {
        return get(TOKEN_KEY)
    },

    getRefreshToken: async (): Promise<string | undefined> => {
        return get(REFRESH_KEY)
    },

    getUser: async (): Promise<AuthenticatedUser | undefined> => {
        return get(USER_KEY)
    },

    isAuthenticated: async (): Promise<boolean> => {
        const token = await get(TOKEN_KEY)
        return !!token
    },
}

// ─── fetchConAuth: fetch autenticado con retry automático en 401 ──────────────
//
// Úsalo en TODOS los services (ingresoService, salidaService, etc.)
// como sustituto directo del helper fetchConAuth local de cada archivo.
// Centraliza la lógica de refresco para no duplicarla.

export async function fetchConAuth(
    path: string,
    options: RequestInit = {}
): Promise<Response> {
    const token = await authService.getToken()

    const response = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers,
        },
    })

    // Access token expirado → intentar refresh y reintentar una vez
    if (response.status === 401) {
        const nuevoToken = await authService.refreshAccessToken()

        if (!nuevoToken) {
            // Refresh falló — la sesión está terminada
            // SESSION_EXPIRED_EVENT ya fue despachado en refreshAccessToken
            return response
        }

        // Reintentar la petición original con el nuevo token
        return fetch(`${API_URL}${path}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                Authorization:  `Bearer ${nuevoToken}`,
                ...options.headers,
            },
        })
    }

    return response
}
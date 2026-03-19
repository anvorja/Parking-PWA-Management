// src/services/ubicacionService.ts
// HU-012: crear ubicación
// HU-014: listar ubicaciones activas
// HU-015: editar ubicación
// HU-016: desactivar ubicación (soft delete)

import { authService } from './authService'

const API_URL = import.meta.env.VITE_API_URL || ''

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface UbicacionResponse {
    id:                   number
    nombre:               string
    idTipoVehiculoNativo: number
    tipoVehiculoNativo:   string
    capacidad:            number
    estadoNombre:         string   // DISPONIBLE | OCUPADO | INACTIVO
    disponible:           boolean
}

export interface CrearUbicacionRequest {
    nombre:               string
    idTipoVehiculoNativo: number
    capacidad:            number
}

export interface EditarUbicacionRequest {
    nombre?:               string
    idTipoVehiculoNativo?: number
    capacidad?:            number
}

// ─── Helper ───────────────────────────────────────────────────────────────────

async function fetchConAuth(path: string, options: RequestInit = {}): Promise<Response> {
    const token = await authService.getToken()
    return fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers,
        },
    })
}

// ─── Servicio ─────────────────────────────────────────────────────────────────

export const ubicacionService = {

    async listarActivas(): Promise<UbicacionResponse[]> {
        const response = await fetchConAuth('/api/v1/ubicaciones')
        if (!response.ok) {
            const err = await response.json().catch(() => null)
            throw new Error(err?.message || `Error al obtener ubicaciones (${response.status})`)
        }
        return response.json()
    },

    async crear(data: CrearUbicacionRequest): Promise<UbicacionResponse> {
        const response = await fetchConAuth('/api/v1/ubicaciones', {
            method: 'POST',
            body: JSON.stringify(data),
        })
        if (!response.ok) {
            const err = await response.json().catch(() => null)
            throw new Error(err?.message || `Error al crear la ubicación (${response.status})`)
        }
        return response.json()
    },

    async editar(id: number, data: EditarUbicacionRequest): Promise<UbicacionResponse> {
        const response = await fetchConAuth(`/api/v1/ubicaciones/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        })
        if (!response.ok) {
            const err = await response.json().catch(() => null)
            throw new Error(err?.message || `Error al editar la ubicación (${response.status})`)
        }
        return response.json()
    },

    async desactivar(id: number): Promise<void> {
        const response = await fetchConAuth(`/api/v1/ubicaciones/${id}`, { method: 'DELETE' })
        if (!response.ok) {
            const err = await response.json().catch(() => null)
            throw new Error(err?.message || `Error al desactivar la ubicación (${response.status})`)
        }
    },
}
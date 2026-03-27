// src/services/tarifaService.ts
// HU-013 — CRUD de tarifas desde el frontend.
// Solo el ADMINISTRADOR puede crear, editar y desactivar.
// El GET es accesible para cualquier usuario autenticado (para calcular costos).

import { authService } from './authService'

const API_URL = import.meta.env.VITE_API_URL || ''

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface TarifaResponse {
    idTarifa:       number
    idTipoVehiculo: number
    tipoVehiculo:   string
    idUnidadTarifa: number
    unidadTarifa:   string
    valor:          number
    activa:         boolean
    fechaCreacion:  string
}

export interface CrearTarifaRequest {
    idTipoVehiculo: number
    idUnidadTarifa: number
    valor:          number
}

export interface EditarTarifaRequest {
    valor: number
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

export const tarifaService = {

    async listarActivas(): Promise<TarifaResponse[]> {
        const response = await fetchConAuth('/api/v1/tarifas')
        if (!response.ok) {
            const err = await response.json().catch(() => null)
            throw new Error(err?.error?.message || err?.message || `Error al obtener tarifas (${response.status})`)
        }
        return response.json()
    },

    async crear(data: CrearTarifaRequest): Promise<TarifaResponse> {
        const response = await fetchConAuth('/api/v1/tarifas', {
            method: 'POST',
            body: JSON.stringify(data),
        })
        if (!response.ok) {
            const err = await response.json().catch(() => null)
            throw new Error(err?.error?.message || err?.message || `Error al crear tarifa (${response.status})`)
        }
        return response.json()
    },

    async editar(id: number, data: EditarTarifaRequest): Promise<TarifaResponse> {
        const response = await fetchConAuth(`/api/v1/tarifas/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        })
        if (!response.ok) {
            const err = await response.json().catch(() => null)
            throw new Error(err?.error?.message || err?.message || `Error al editar tarifa (${response.status})`)
        }
        return response.json()
    },

    async desactivar(id: number): Promise<void> {
        const response = await fetchConAuth(`/api/v1/tarifas/${id}`, { method: 'DELETE' })
        if (!response.ok) {
            const err = await response.json().catch(() => null)
            throw new Error(err?.error?.message || err?.message || `Error al desactivar tarifa (${response.status})`)
        }
    },
}
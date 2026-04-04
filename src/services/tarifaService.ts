// src/services/tarifaService.ts
// HU-013 — CRUD de tarifas desde el frontend.
// Solo el ADMINISTRADOR puede crear, editar y desactivar.
// El GET es accesible para cualquier usuario autenticado (para calcular costos).

import { fetchConAuth } from './authService'

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
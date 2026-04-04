// src/services/salidaService.ts
// HU-009: salida por QR — obtener ingreso por id
// HU-010: salida manual — buscar ingreso activo por placa
// HU-011: confirmar salida — cálculo de costo en el backend

import { fetchConAuth } from './authService'

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface IngresoDetalle {
    idIngreso:        number
    uuid:             string
    placa:            string
    tipoVehiculo:     string
    idTipoVehiculo:   number
    ubicacion:        string
    estadoIngreso:    string
    fechaHoraIngreso: string
    usuarioRegistro:  string
    valorCobrado:     number | null
}

export interface SalidaResponse {
    idIngreso:       number
    placa:           string
    tipoVehiculo:    string
    ubicacion:       string
    fechaHoraIngreso: string
    fechaHoraSalida:  string
    horasCobradas:   number
    tarifaPorHora:   number
    valorCobrado:    number
    usuarioEntrega:  string
}

export interface RegistrarSalidaRequest {
    fechaHoraSalida?: string // ISO — si no se envía, el backend usa now()
}

// ─── Servicio ─────────────────────────────────────────────────────────────────

export const salidaService = {

    /** HU-009 — Obtiene el detalle de un ingreso por id interno (uso interno, no QR) */
    async obtenerPorId(id: number): Promise<IngresoDetalle> {
        const response = await fetchConAuth(`/api/ingresos/${id}`)
        if (!response.ok) {
            const err = await response.json().catch(() => null)
            throw new Error(err?.error?.message || err?.message || `Ingreso no encontrado (${response.status})`)
        }
        return response.json()
    },

    /** HU-009 — Obtiene el detalle de un ingreso por UUID público (leído del QR del tiquete) */
    async obtenerPorUuid(uuid: string): Promise<IngresoDetalle> {
        const response = await fetchConAuth(`/api/ingresos/qr/${encodeURIComponent(uuid)}`)
        if (!response.ok) {
            const err = await response.json().catch(() => null)
            throw new Error(err?.error?.message || err?.message || `Ingreso no encontrado (${response.status})`)
        }
        return response.json()
    },

    /** HU-010 — Busca el ingreso activo para una placa (salida manual) */
    async buscarActivoPorPlaca(placa: string): Promise<IngresoDetalle> {
        const response = await fetchConAuth(`/api/ingresos/activo?placa=${encodeURIComponent(placa.trim().toUpperCase())}`)
        if (!response.ok) {
            const err = await response.json().catch(() => null)
            throw new Error(err?.error?.message || err?.message || `No se encontró ingreso activo para la placa ${placa}`)
        }
        return response.json()
    },

    /** HU-011 — Confirma la salida y recibe el costo calculado */
    async confirmarSalida(
        idIngreso: number,
        request: RegistrarSalidaRequest = {}
    ): Promise<SalidaResponse> {
        const response = await fetchConAuth(`/api/ingresos/${idIngreso}/salida`, {
            method: 'POST',
            body: JSON.stringify(request),
        })
        if (!response.ok) {
            const err = await response.json().catch(() => null)
            throw new Error(err?.error?.message || err?.message || `Error al registrar la salida (${response.status})`)
        }
        return response.json()
    },
}
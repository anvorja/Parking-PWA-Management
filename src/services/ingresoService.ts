// src/services/ingresoService.ts
import { authService } from './authService'

const API_URL = import.meta.env.VITE_API_URL || ''

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface RegistrarIngresoRequest {
    placa: string
    idTipoVehiculo: number
    idUbicacion: number
    fechaHoraIngreso?: string
}

export interface EditarIngresoRequest {
    placa?: string
    idTipoVehiculo?: number
    idUbicacion?: number
    idEstadoIngreso?: number
    fechaHoraIngreso?: string
    fechaHoraSalida?: string
}

export interface IngresoVehiculoResponse {
    idIngreso: number
    placa: string
    idTipoVehiculo: number
    tipoVehiculo: string
    idUbicacion: number
    ubicacion: string
    idEstadoIngreso: number
    estadoIngreso: string
    fechaHoraIngreso: string
    fechaCreacion: string
    idUsuarioRegistro: number
    usuarioRegistro: string
    valorCobrado: number | null
}

export interface IngresoPageResponse {
    content: IngresoVehiculoResponse[]
    page: number
    size: number
    totalElements: number
    totalPages: number
}

export interface ListarIngresosParams {
    placa?: string
    estado?: string
    page?: number
    size?: number
}

export interface TipoVehiculo {
    id: number
    nombre: string
}

export interface Ubicacion {
    id: number
    nombre: string
    idTipoVehiculoNativo: number
    tipoVehiculoNativo: string
    capacidad: number
    disponible: boolean
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

// ─── Service ─────────────────────────────────────────────────────────────────

export const ingresoService = {

    // ── Registrar ingreso ──────────────────────────────────────────────────────

    async registrarIngreso(data: RegistrarIngresoRequest): Promise<IngresoVehiculoResponse> {
        const response = await fetchConAuth('/api/ingresos', {
            method: 'POST',
            body: JSON.stringify({
                ...data,
                fechaHoraIngreso: data.fechaHoraIngreso || new Date().toISOString(),
            }),
        })
        if (!response.ok) {
            const err = await response.json().catch(() => null)
            throw new Error(err?.message || `Error al registrar ingreso (${response.status})`)
        }
        return response.json()
    },

    // ── Listar ingresos — HU-018 ───────────────────────────────────────────────

    async listarIngresos(params: ListarIngresosParams = {}): Promise<IngresoPageResponse> {
        const { placa = '', estado = '', page = 0, size = 20 } = params
        const query = new URLSearchParams()
        if (placa)  query.set('placa',  placa)
        if (estado) query.set('estado', estado)
        query.set('page', String(page))
        query.set('size', String(size))

        const response = await fetchConAuth(`/api/ingresos?${query.toString()}`)
        if (!response.ok) {
            const err = await response.json().catch(() => null)
            throw new Error(err?.message || `Error al listar ingresos (${response.status})`)
        }
        return response.json()
    },

    // ── Eliminar ingreso — HU-019 (solo ADMINISTRADOR) ────────────────────────

    async eliminarIngreso(id: number): Promise<void> {
        const response = await fetchConAuth(`/api/ingresos/${id}`, { method: 'DELETE' })
        if (!response.ok) {
            const err = await response.json().catch(() => null)
            throw new Error(err?.message || `Error al eliminar el registro (${response.status})`)
        }
    },

    // ── Editar ingreso — HU-020 ────────────────────────────────────────────────

    async editarIngreso(id: number, data: EditarIngresoRequest): Promise<IngresoVehiculoResponse> {
        const response = await fetchConAuth(`/api/ingresos/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        })
        if (!response.ok) {
            const err = await response.json().catch(() => null)
            throw new Error(err?.message || `Error al editar el registro (${response.status})`)
        }
        return response.json()
    },

    // ── Datos de referencia ────────────────────────────────────────────────────

    async getUbicaciones(): Promise<Ubicacion[]> {
        const response = await fetchConAuth('/api/v1/ubicaciones')
        if (!response.ok) throw new Error(`Error al obtener ubicaciones (${response.status})`)
        return response.json()
    },

    async getTiposVehiculo(): Promise<TipoVehiculo[]> {
        const response = await fetchConAuth('/api/v1/tipos-vehiculo')
        if (!response.ok) throw new Error(`Error al obtener tipos de vehículo (${response.status})`)
        return response.json()
    },
}
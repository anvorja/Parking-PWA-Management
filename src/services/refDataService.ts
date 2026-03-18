// src/services/refDataService.ts
//
// TASK-PWA-IDB — Caché IndexedDB de datos de referencia al login.
// Cachea ubicaciones y tipos de vehículo al login (fire-and-forget).
// En modo offline, los formularios leen desde el caché local.

import { get, set } from 'idb-keyval'
import { authService } from './authService'

const API_URL = import.meta.env.VITE_API_URL || ''

// ─── Claves IndexedDB ────────────────────────────────────────────────────────

export const IDB_KEYS = {
    UBICACIONES:    'ref_ubicaciones',
    TIPOS_VEHICULO: 'ref_tipos_vehiculo',
} as const

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface UbicacionRef {
    id:                   number
    nombre:               string
    idTipoVehiculoNativo: number
    tipoVehiculoNativo:   string
    capacidad:            number
    disponible:           boolean
}

export interface TipoVehiculoRef {
    id:     number
    nombre: string
    // icono es un campo de presentación del frontend — el backend no lo devuelve.
    // Se asigna en Entrada.tsx al mapear la respuesta, por eso es opcional aquí.
    icono?: string
}

// ─── Iconos por convención de nombre ─────────────────────────────────────────
// Centralizado para que cualquier componente pueda usarlo sin duplicar lógica.

export function iconoParaTipo(nombreTipo: string): string {
    switch (nombreTipo.toUpperCase()) {
        case 'MOTO':  return 'two_wheeler'
        case 'CARRO': return 'directions_car'
        default:      return 'directions_car'
    }
}

// ─── Helper interno ──────────────────────────────────────────────────────────

async function fetchWithAuth(path: string): Promise<Response> {
    const token = await authService.getToken()
    return fetch(`${API_URL}${path}`, {
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
    })
}

// ─── Servicio ────────────────────────────────────────────────────────────────

export const refDataService = {
    /**
     * Descarga ubicaciones y tipos de vehículo del backend y los persiste en IndexedDB.
     * Se llama fire-and-forget después del login exitoso — no bloquea la navegación al Home.
     * Los tipos se guardan con el icono ya resuelto para que estén listos offline.
     */
    syncToIndexedDB: async (): Promise<void> => {
        try {
            const [ubicacionesRes, tiposRes] = await Promise.all([
                fetchWithAuth('/api/v1/ubicaciones'),
                fetchWithAuth('/api/v1/tipos-vehiculo'),
            ])

            if (ubicacionesRes.ok) {
                const ubicaciones: UbicacionRef[] = await ubicacionesRes.json()
                await set(IDB_KEYS.UBICACIONES, ubicaciones)
            }

            if (tiposRes.ok) {
                const tiposRaw: Array<{ id: number; nombre: string }> = await tiposRes.json()
                // Enriquecer con icono antes de persistir
                const tipos: TipoVehiculoRef[] = tiposRaw.map(t => ({
                    ...t,
                    icono: iconoParaTipo(t.nombre),
                }))
                await set(IDB_KEYS.TIPOS_VEHICULO, tipos)
            }
        } catch (error) {
            console.warn('[refDataService] No se pudieron sincronizar datos de referencia:', error)
        }
    },

    getUbicaciones: async (): Promise<UbicacionRef[] | null> => {
        return (await get<UbicacionRef[]>(IDB_KEYS.UBICACIONES)) ?? null
    },

    getTiposVehiculo: async (): Promise<TipoVehiculoRef[] | null> => {
        return (await get<TipoVehiculoRef[]>(IDB_KEYS.TIPOS_VEHICULO)) ?? null
    },
}
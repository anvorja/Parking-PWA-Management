// src/services/refDataService.ts
//
// TASK-PWA-IDB — Caché IndexedDB de datos de referencia al login.
// Cachea ubicaciones, tipos de vehículo y tarifas al login (fire-and-forget).
// En modo offline los formularios leen desde el caché local.
// FASE 2: se agregan tarifas para que el cálculo de costo funcione offline.

import { get, set } from 'idb-keyval'
import { fetchConAuth } from './authService'
import { TarifaResponse } from './tarifaService'

// ─── Claves IndexedDB ────────────────────────────────────────────────────────

export const IDB_KEYS = {
    UBICACIONES:    'ref_ubicaciones',
    TIPOS_VEHICULO: 'ref_tipos_vehiculo',
    TARIFAS:        'ref_tarifas',
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
    icono?: string
}

// ─── Iconos por convención de nombre ─────────────────────────────────────────

export function iconoParaTipo(nombreTipo: string): string {
    switch (nombreTipo.toUpperCase()) {
        case 'MOTO':  return 'two_wheeler'
        case 'CARRO': return 'directions_car'
        default:      return 'directions_car'
    }
}

// ─── Servicio ────────────────────────────────────────────────────────────────

export const refDataService = {

    /**
     * Descarga ubicaciones, tipos de vehículo y tarifas del backend
     * y los persiste en IndexedDB. Fire-and-forget tras login.
     */
    syncToIndexedDB: async (): Promise<void> => {
        try {
            const [ubicacionesRes, tiposRes, tarifasRes] = await Promise.all([
                fetchConAuth('/api/v1/ubicaciones'),
                fetchConAuth('/api/v1/tipos-vehiculo'),
                fetchConAuth('/api/v1/tarifas'),
            ])

            if (ubicacionesRes.ok) {
                const ubicaciones: UbicacionRef[] = await ubicacionesRes.json()
                await set(IDB_KEYS.UBICACIONES, ubicaciones)
            }

            if (tiposRes.ok) {
                const tiposRaw: Array<{ id: number; nombre: string }> = await tiposRes.json()
                const tipos: TipoVehiculoRef[] = tiposRaw.map(t => ({
                    ...t,
                    icono: iconoParaTipo(t.nombre),
                }))
                await set(IDB_KEYS.TIPOS_VEHICULO, tipos)
            }

            if (tarifasRes.ok) {
                const tarifas: TarifaResponse[] = await tarifasRes.json()
                await set(IDB_KEYS.TARIFAS, tarifas)
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

    getTarifas: async (): Promise<TarifaResponse[] | null> => {
        return (await get<TarifaResponse[]>(IDB_KEYS.TARIFAS)) ?? null
    },

    /**
     * Devuelve la tarifa activa para un tipo de vehículo dado.
     * Lee del caché IDB — funciona offline.
     * Usado en el cálculo de costo preview en la pantalla de Salida.
     */
    getTarifaPorTipo: async (idTipoVehiculo: number): Promise<TarifaResponse | null> => {
        const tarifas = await refDataService.getTarifas()
        if (!tarifas) return null
        return tarifas.find(t => t.idTipoVehiculo === idTipoVehiculo && t.activa) ?? null
    },
}
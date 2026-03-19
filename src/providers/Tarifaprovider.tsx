// src/providers/TarifaProvider.tsx
// HU-013 — Proveedor de tarifas.
// Carga tarifas activas del backend (o del caché IDB si está offline).
//
// Guardas en todas las operaciones mutantes:
//   1. Offline  → bloqueado con toast de error. Los cambios de tarifa son
//                 responsabilidad del ADMINISTRADOR desde una estación con red;
//                 encolarlos offline generaría inconsistencias con la lógica de
//                 "desactivar-anterior" que ejecuta el backend.
//   2. No-admin → toast informativo que indica que la acción es solo del admin.
//                 Segunda línea de defensa (el backend ya protege con @PreAuthorize).

import React, { useState, useEffect, useCallback, ReactNode } from 'react'
import { get, set } from 'idb-keyval'
import { TarifaContext, ToastTarifaState } from '../contexts/TarifaContext'
import {
    tarifaService,
    TarifaResponse,
    CrearTarifaRequest,
    EditarTarifaRequest,
} from '../services/tarifaService'
import { useNetworkStatus } from '../hooks/useNetworkStatus'
import { useAuth } from '../hooks/useAuth'

const IDB_KEY_TARIFAS = 'ref_tarifas'

export const TarifaProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { isOnline } = useNetworkStatus()
    const { user }     = useAuth()

    const [tarifas, setTarifas]     = useState<TarifaResponse[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving]   = useState(false)
    const [toast, setToast]         = useState<ToastTarifaState | null>(null)

    // Toast auto-dismiss
    useEffect(() => {
        if (!toast) return
        const t = setTimeout(() => setToast(null), 3500)
        return () => clearTimeout(t)
    }, [toast])

    const clearToast = useCallback(() => setToast(null), [])

    // ── Guardas reutilizables ─────────────────────────────────────────────────
    // Devuelven true si la operación debe abortarse.

    const bloqueadoOffline = useCallback((): boolean => {
        if (!isOnline) {
            setToast({
                message: 'Sin conexión — los cambios de tarifa requieren conexión a internet',
                type: 'error',
            })
            return true
        }
        return false
    }, [isOnline])

    const bloqueadoPorRol = useCallback((): boolean => {
        if (user?.rol !== 'ADMINISTRADOR') {
            setToast({
                message: 'Solo el administrador puede modificar las tarifas',
                type: 'error',
            })
            return true
        }
        return false
    }, [user])

    // ── Carga inicial ─────────────────────────────────────────────────────────
    // 1. Caché IDB primero (disponible offline).
    // 2. Si hay red, descarga del backend y actualiza el caché.

    useEffect(() => {
        const cargar = async () => {
            setIsLoading(true)
            try {
                const cached = await get<TarifaResponse[]>(IDB_KEY_TARIFAS)
                if (cached && cached.length > 0) setTarifas(cached)

                const frescas = await tarifaService.listarActivas()
                setTarifas(frescas)
                await set(IDB_KEY_TARIFAS, frescas)
            } catch {
                // Sin red: usa el caché si existe
                console.warn('[TarifaProvider] Sin conexión — usando caché IDB si existe')
            } finally {
                setIsLoading(false)
            }
        }
        void cargar()
    }, [])

    // ── Crear ─────────────────────────────────────────────────────────────────

    const crear = useCallback(async (data: CrearTarifaRequest) => {
        if (bloqueadoPorRol() || bloqueadoOffline()) return
        setIsSaving(true)
        try {
            const nueva = await tarifaService.crear(data)
            // El backend desactivó la anterior del mismo tipo+unidad.
            // Refrescar la lista completa para reflejar el cambio.
            const actualizadas = await tarifaService.listarActivas()
            setTarifas(actualizadas)
            await set(IDB_KEY_TARIFAS, actualizadas)
            setToast({
                message: `Tarifa creada: ${nueva.tipoVehiculo} $${nueva.valor.toLocaleString('es-CO')}/hora`,
                type: 'success',
            })
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Error al crear la tarifa'
            setToast({ message: msg, type: 'error' })
            throw err
        } finally {
            setIsSaving(false)
        }
    }, [bloqueadoPorRol, bloqueadoOffline])

    // ── Editar ────────────────────────────────────────────────────────────────

    const editar = useCallback(async (id: number, data: EditarTarifaRequest) => {
        if (bloqueadoPorRol() || bloqueadoOffline()) return
        setIsSaving(true)
        try {
            const actualizada = await tarifaService.editar(id, data)
            setTarifas(prev => prev.map(t => t.idTarifa === id ? actualizada : t))
            const actualizadas = await tarifaService.listarActivas()
            await set(IDB_KEY_TARIFAS, actualizadas)
            setToast({ message: 'Tarifa actualizada correctamente', type: 'success' })
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Error al editar la tarifa'
            setToast({ message: msg, type: 'error' })
            throw err
        } finally {
            setIsSaving(false)
        }
    }, [bloqueadoPorRol, bloqueadoOffline])

    // ── Desactivar ────────────────────────────────────────────────────────────

    const desactivar = useCallback(async (id: number) => {
        if (bloqueadoPorRol() || bloqueadoOffline()) return
        setIsSaving(true)
        try {
            await tarifaService.desactivar(id)
            setTarifas(prev => prev.filter(t => t.idTarifa !== id))
            const actualizadas = tarifas.filter(t => t.idTarifa !== id)
            await set(IDB_KEY_TARIFAS, actualizadas)
            setToast({ message: 'Tarifa desactivada correctamente', type: 'success' })
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Error al desactivar la tarifa'
            setToast({ message: msg, type: 'error' })
            throw err
        } finally {
            setIsSaving(false)
        }
    }, [bloqueadoPorRol, bloqueadoOffline, tarifas])

    return (
        <TarifaContext.Provider value={{
            tarifas,
            isLoading,
            crear,
            editar,
            desactivar,
            isSaving,
            toast,
            clearToast,
        }}>
            {children}
        </TarifaContext.Provider>
    )
}
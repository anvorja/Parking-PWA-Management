// src/providers/UbicacionProvider.tsx
// HU-012: crear ubicación
// HU-014: listar ubicaciones activas
// HU-015: editar ubicación
// HU-016: desactivar ubicación (soft delete)
// FASE 4 offline: cambios de ubicación se encolan si no hay red

import React, { useState, useEffect, useCallback, ReactNode } from 'react'
import { get, set } from 'idb-keyval'
import { UbicacionContext, ToastUbicacionState } from '../contexts/UbicacionContext'
import {
    ubicacionService,
    UbicacionResponse,
    CrearUbicacionRequest,
    EditarUbicacionRequest,
} from '../services/ubicacionService'
import { outboxService } from '../services/outboxService'
import { useNetworkStatus } from '../hooks/useNetworkStatus'

const IDB_KEY_UBICACIONES = 'ref_ubicaciones'

export const UbicacionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { isOnline } = useNetworkStatus()

    const [ubicaciones, setUbicaciones] = useState<UbicacionResponse[]>([])
    const [isLoading, setIsLoading]     = useState(true)
    const [isSaving, setIsSaving]       = useState(false)
    const [toast, setToast]             = useState<ToastUbicacionState | null>(null)

    useEffect(() => {
        if (!toast) return
        const t = setTimeout(() => setToast(null), 3500)
        return () => clearTimeout(t)
    }, [toast])

    const clearToast = useCallback(() => setToast(null), [])

    // ── Carga inicial ─────────────────────────────────────────────────────────
    // 1. Caché IDB primero (disponible offline)
    // 2. Si hay red, descarga del backend y actualiza el caché

    useEffect(() => {
        const cargar = async () => {
            setIsLoading(true)
            try {
                const cached = await get<UbicacionResponse[]>(IDB_KEY_UBICACIONES)
                // Descartar caché con esquema viejo (sin estadoNombre)
                const cachedValido = cached?.every(u => typeof u.estadoNombre === 'string')
                if (cachedValido && cached && cached.length > 0) setUbicaciones(cached)

                if (isOnline) {
                    const frescas = await ubicacionService.listarActivas()
                    setUbicaciones(frescas)
                    await set(IDB_KEY_UBICACIONES, frescas)
                }
            } catch {
                console.warn('[UbicacionProvider] Sin conexión — usando caché IDB')
            } finally {
                setIsLoading(false)
            }
        }
        void cargar()
    }, [isOnline])

    // ── HU-012: Crear ─────────────────────────────────────────────────────────

    const crear = useCallback(async (data: CrearUbicacionRequest) => {
        setIsSaving(true)
        try {
            if (isOnline) {
                const nueva = await ubicacionService.crear(data)
                setUbicaciones(prev => [...prev, nueva].sort((a, b) => a.nombre.localeCompare(b.nombre)))
                await set(IDB_KEY_UBICACIONES, [...ubicaciones, nueva])
                setToast({ message: `Ubicación ${nueva.nombre} creada correctamente`, type: 'success' })
            } else {
                await outboxService.enqueue('UBICACION', { ...data })
                setToast({ message: 'Sin conexión — la ubicación se creará al recuperar la red', type: 'success' })
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Error al crear la ubicación'
            setToast({ message: msg, type: 'error' })
            throw err
        } finally {
            setIsSaving(false)
        }
    }, [isOnline, ubicaciones])

    // ── HU-015: Editar ────────────────────────────────────────────────────────

    const editar = useCallback(async (id: number, data: EditarUbicacionRequest) => {
        setIsSaving(true)
        try {
            if (isOnline) {
                const actualizada = await ubicacionService.editar(id, data)
                setUbicaciones(prev => prev.map(u => u.id === id ? actualizada : u))
                const actualizadas = ubicaciones.map(u => u.id === id ? actualizada : u)
                await set(IDB_KEY_UBICACIONES, actualizadas)
                setToast({ message: 'Ubicación actualizada correctamente', type: 'success' })
            } else {
                await outboxService.enqueue('UBICACION', { id, ...data })
                setToast({ message: 'Sin conexión — el cambio se aplicará al recuperar la red', type: 'success' })
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Error al editar la ubicación'
            setToast({ message: msg, type: 'error' })
            throw err
        } finally {
            setIsSaving(false)
        }
    }, [isOnline, ubicaciones])

    // ── HU-016: Desactivar ────────────────────────────────────────────────────

    const desactivar = useCallback(async (id: number) => {
        setIsSaving(true)
        try {
            await ubicacionService.desactivar(id)
            setUbicaciones(prev => prev.filter(u => u.id !== id))
            const actualizadas = ubicaciones.filter(u => u.id !== id)
            await set(IDB_KEY_UBICACIONES, actualizadas)
            setToast({ message: 'Ubicación desactivada correctamente', type: 'success' })
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Error al desactivar la ubicación'
            setToast({ message: msg, type: 'error' })
            throw err
        } finally {
            setIsSaving(false)
        }
    }, [ubicaciones])

    return (
        <UbicacionContext.Provider value={{
            ubicaciones, isLoading,
            crear, editar, desactivar,
            isSaving, toast, clearToast,
        }}>
            {children}
        </UbicacionContext.Provider>
    )
}
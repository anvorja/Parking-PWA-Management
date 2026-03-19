// src/providers/IngresoProvider.tsx
// HU-018: scroll infinito + caché IndexedDB + offline SUB-1/2/3/4
// HU-019: eliminarIngreso — bloqueado offline (operación crítica e irreversible)
// HU-020: editarIngreso — offline: encola INGRESO_EDITAR + optimistic update
// FASE 1: registrarIngresoConOutbox — offline: encola INGRESO
//
// Escucha 'parking:sync-complete' para refrescar la lista tras sync
// Expone salidasPendientes para el badge en Ingresos.tsx

import React, { useState, useEffect, useCallback, useRef, ReactNode } from 'react'
import { get, set } from 'idb-keyval'
import { IngresoContext, ToastState } from '../contexts/IngresoContext'
import { EditarIngresoRequest, ingresoService, IngresoVehiculoResponse, RegistrarIngresoRequest } from '../services/ingresoService'
import { outboxService } from '../services/outboxService'
import { useNetworkStatus } from '../hooks/useNetworkStatus'
import { SYNC_COMPLETE_EVENT } from './AppProvider'
import { SyncResult } from '../services/syncService'

const IDB_KEY_INGRESOS = 'ingresos_activos_cache'
const CACHE_MAX         = 50
const PAGE_SIZE         = 20

export const IngresoProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { isOnline } = useNetworkStatus()

    const [ingresos, setIngresos]             = useState<IngresoVehiculoResponse[]>([])
    const [isLoading, setIsLoading]           = useState(true)
    const [isLoadingMore, setIsLoadingMore]   = useState(false)
    const [hasMore, setHasMore]               = useState(false)
    const [totalElements, setTotalElements]   = useState(0)
    const [currentPage, setCurrentPage]       = useState(0)
    const [filtroPlaca, setFiltroPlacaState]  = useState('')
    const [isDeleting, setIsDeleting]         = useState(false)
    const [isEditing, setIsEditing]           = useState(false)
    const [toast, setToast]                   = useState<ToastState | null>(null)
    const [salidasPendientes, setSalidasPendientes] = useState<Set<number>>(new Set())

    const filtroPlacaRef = useRef(filtroPlaca)
    const currentPageRef = useRef(currentPage)
    const isOnlineRef    = useRef(isOnline)
    const wasOfflineRef  = useRef(!isOnline)
    const isLoadingRef   = useRef(false)

    useEffect(() => { filtroPlacaRef.current = filtroPlaca }, [filtroPlaca])
    useEffect(() => { currentPageRef.current = currentPage }, [currentPage])
    useEffect(() => { isOnlineRef.current    = isOnline    }, [isOnline])

    // Toast auto-dismiss
    useEffect(() => {
        if (!toast) return
        const t = setTimeout(() => setToast(null), 3500)
        return () => clearTimeout(t)
    }, [toast])

    const clearToast = useCallback(() => setToast(null), [])

    // ─── Gap 3: calcular salidasPendientes desde la outbox ────────────────────

    const actualizarSalidasPendientes = useCallback(async () => {
        const todas = await outboxService.getAll()
        const ids = todas
            .filter(e => e.type === 'SALIDA')
            .map(e => {
                const payload = e.payload as { idIngreso?: number }
                return typeof payload.idIngreso === 'number' ? payload.idIngreso : null
            })
            .filter((id): id is number => id !== null)
        setSalidasPendientes(new Set(ids))
    }, [])

    useEffect(() => {
        void actualizarSalidasPendientes()
    }, [actualizarSalidasPendientes])

    useEffect(() => {
        const recalcular = () => { void actualizarSalidasPendientes() }
        window.addEventListener('focus', recalcular)
        document.addEventListener('visibilitychange', recalcular)
        return () => {
            window.removeEventListener('focus', recalcular)
            document.removeEventListener('visibilitychange', recalcular)
        }
    }, [actualizarSalidasPendientes])

    // ─── Carga desde IndexedDB (modo offline) ─────────────────────────────────

    const cargarDesdeCache = useCallback(async () => {
        setIsLoading(true)
        try {
            const cached = await get<IngresoVehiculoResponse[]>(IDB_KEY_INGRESOS)
            if (cached && cached.length > 0) {
                setIngresos(cached)
                setTotalElements(cached.length)
                setHasMore(false)
                setCurrentPage(0)
            } else {
                setIngresos([])
                setTotalElements(0)
                setHasMore(false)
            }
        } catch (err) {
            console.error('[IngresoProvider] Error leyendo caché:', err)
            setIngresos([])
        } finally {
            setIsLoading(false)
        }
    }, [])

    // ─── Carga desde backend ───────────────────────────────────────────────────
    //
    // Bug 2 fix: si hay INGRESO_EDITAR pendientes en la outbox, no recargar
    // la lista desde el backend (page=0, no append). El backend aún no tiene
    // esos cambios — pisar el optimistic update con datos viejos del backend.
    // handleSyncComplete recargará cuando la outbox esté limpia.

    const cargarPaginaBackend = useCallback(async (
        page: number,
        placa: string,
        append: boolean
    ) => {
        if (!append && page === 0) {
            const pendientes = await outboxService.getPendientes()
            const hayEdiciones = pendientes.some(e => e.type === 'INGRESO_EDITAR')
            if (hayEdiciones) return
        }

        if (isLoadingRef.current) return
        isLoadingRef.current = true

        if (append) {
            setIsLoadingMore(true)
        } else {
            setIsLoading(true)
        }

        try {
            const data = await ingresoService.listarIngresos({ placa, page, size: PAGE_SIZE })
            setIngresos(prev => append ? [...prev, ...data.content] : data.content)
            setTotalElements(data.totalElements)
            setCurrentPage(data.page)
            setHasMore(data.page < data.totalPages - 1)

            if (page === 0 && !placa) {
                const activos = data.content
                    .filter(i => i.estadoIngreso === 'INGRESADO')
                    .slice(0, CACHE_MAX)
                await set(IDB_KEY_INGRESOS, activos)
            }
        } catch (err) {
            console.error('[IngresoProvider] Error cargando desde backend:', err)
            if (!append) await cargarDesdeCache()
        } finally {
            setIsLoading(false)
            setIsLoadingMore(false)
            isLoadingRef.current = false
        }
    }, [cargarDesdeCache])

    // ─── Efecto principal de carga ─────────────────────────────────────────────

    useEffect(() => {
        if (isOnline) {
            if (wasOfflineRef.current) {
                wasOfflineRef.current = false
            }
            void cargarPaginaBackend(0, filtroPlacaRef.current, false)
        } else {
            wasOfflineRef.current = true
            void cargarDesdeCache()
        }
    }, [isOnline, cargarPaginaBackend, cargarDesdeCache])

    // ─── Gap 2: refrescar lista al completar sync ─────────────────────────────

    useEffect(() => {
        const handleSyncComplete = (event: Event) => {
            const customEvent = event as CustomEvent<SyncResult>
            const { exitosas } = customEvent.detail
            if (exitosas > 0 && isOnlineRef.current) {
                void cargarPaginaBackend(0, filtroPlacaRef.current, false)
                void actualizarSalidasPendientes()
            }
        }
        window.addEventListener(SYNC_COMPLETE_EVENT, handleSyncComplete)
        return () => {
            window.removeEventListener(SYNC_COMPLETE_EVENT, handleSyncComplete)
        }
    }, [cargarPaginaBackend, actualizarSalidasPendientes])

    // ─── API pública ───────────────────────────────────────────────────────────

    const setFiltroPlaca = useCallback((placa: string) => {
        setFiltroPlacaState(placa)
        if (isOnlineRef.current) {
            void cargarPaginaBackend(0, placa, false)
        } else {
            void get<IngresoVehiculoResponse[]>(IDB_KEY_INGRESOS).then(cached => {
                if (!cached) return
                const filtrados = placa.trim()
                    ? cached.filter(i => i.placa.toUpperCase().includes(placa.toUpperCase()))
                    : cached
                setIngresos(filtrados)
                setTotalElements(filtrados.length)
                setHasMore(false)
                setCurrentPage(0)
            })
        }
    }, [cargarPaginaBackend])

    const cargarMas = useCallback(() => {
        if (!isOnlineRef.current || !hasMore || isLoadingRef.current) return
        void cargarPaginaBackend(currentPageRef.current + 1, filtroPlacaRef.current, true)
    }, [hasMore, cargarPaginaBackend])

    const refrescar = useCallback(() => {
        if (isOnlineRef.current) {
            void cargarPaginaBackend(0, filtroPlacaRef.current, false)
        }
    }, [cargarPaginaBackend])

    // ─── HU-019: Eliminar ingreso ──────────────────────────────────────────────
    // Eliminar es una acción irreversible sobre datos que no podemos verificar
    // sin conexión. Se bloquea con mensaje claro: el operador debe esperar red.

    const eliminarIngreso = useCallback(async (id: number) => {
        if (!isOnlineRef.current) {
            setToast({ message: 'Sin conexión — la eliminación requiere conexión a internet', type: 'error' })
            return
        }
        setIsDeleting(true)
        try {
            await ingresoService.eliminarIngreso(id)
            setIngresos(prev => prev.filter(i => i.idIngreso !== id))
            setTotalElements(prev => prev - 1)
            setToast({ message: 'Registro eliminado correctamente', type: 'success' })
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Error al eliminar el registro'
            setToast({ message: msg, type: 'error' })
        } finally {
            setIsDeleting(false)
        }
    }, [])

    // ─── HU-020: Editar ingreso ────────────────────────────────────────────────
    // Online  → llama al backend, actualiza lista y caché IDB.
    // Offline → encola INGRESO_EDITAR, aplica optimistic update en placa y fecha
    //           (campos que el usuario puede editar sin validación del backend).

    const editarIngreso = useCallback(async (id: number, data: EditarIngresoRequest) => {
        setIsEditing(true)
        try {
            if (isOnlineRef.current) {
                const actualizado = await ingresoService.editarIngreso(id, data)
                setIngresos(prev => prev.map(i => i.idIngreso === id ? actualizado : i))
                setToast({ message: 'Registro actualizado correctamente', type: 'success' })
            } else {
                await outboxService.enqueue('INGRESO_EDITAR', { id, ...data })
                // Optimistic update: reflejar en la UI sin esperar al backend
                const ingresosActualizados = (await get<IngresoVehiculoResponse[]>(IDB_KEY_INGRESOS)) ?? []
                const cacheActualizado = ingresosActualizados.map(i => {
                    if (i.idIngreso !== id) return i
                    return {
                        ...i,
                        ...(data.placa            && { placa:            data.placa.toUpperCase() }),
                        ...(data.fechaHoraIngreso  && { fechaHoraIngreso: data.fechaHoraIngreso }),
                    }
                })
                await set(IDB_KEY_INGRESOS, cacheActualizado)
                setIngresos(prev => prev.map(i => {
                    if (i.idIngreso !== id) return i
                    return {
                        ...i,
                        ...(data.placa            && { placa:            data.placa.toUpperCase() }),
                        ...(data.fechaHoraIngreso  && { fechaHoraIngreso: data.fechaHoraIngreso }),
                    }
                }))
                setToast({ message: 'Sin conexión — el cambio se aplicará al recuperar la red', type: 'success' })
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Error al editar el registro'
            setToast({ message: msg, type: 'error' })
            throw err
        } finally {
            setIsEditing(false)
        }
    }, [])

    // ─── FASE 1: Outbox ingresos ───────────────────────────────────────────────
    // Entrada.tsx llama esta función en lugar de ingresoService directamente.
    // Online  → devuelve 'online' y Entrada.tsx llama al service normalmente.
    // Offline → encola INGRESO en IDB y devuelve 'encolado'.

    const registrarIngresoConOutbox = useCallback(async (
        data: RegistrarIngresoRequest
    ): Promise<'online' | 'encolado'> => {
        if (isOnlineRef.current) {
            return 'online'
        }
        await outboxService.enqueue('INGRESO', data as unknown as Record<string, unknown>)
        setToast({
            message: 'Sin conexión — el ingreso se registrará automáticamente al recuperar la red',
            type: 'success',
        })
        return 'encolado'
    }, [])

    return (
        <IngresoContext.Provider value={{
            ingresos,
            isLoading,
            isLoadingMore,
            hasMore,
            totalElements,
            isOnline,
            filtroPlaca,
            setFiltroPlaca,
            cargarMas,
            refrescar,
            eliminarIngreso,
            isDeleting,
            editarIngreso,
            isEditing,
            toast,
            clearToast,
            registrarIngresoConOutbox,
            salidasPendientes,
        }}>
            {children}
        </IngresoContext.Provider>
    )
}
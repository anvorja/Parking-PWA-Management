// src/providers/IngresoProvider.tsx
// HU-018: scroll infinito + caché IndexedDB + offline SUB-1/2/3/4
// HU-019: eliminarIngreso con optimistic update
// HU-020: editarIngreso con actualización local de la lista
// FASE 1: outbox — si no hay red al registrar un ingreso, se encola en IndexedDB
//
// Escucha el CustomEvent 'parking:sync-complete' emitido por AppProvider
// y refresca la lista desde el backend cuando el sync termina.
//
// Mantiene el Set de idIngresos que están pendientes en la outbox
// (type='SALIDA') para que Ingresos.tsx pueda mostrar el badge.

import React, { useState, useEffect, useCallback, useRef, ReactNode } from 'react'
import { get, set } from 'idb-keyval'
import { IngresoContext, ToastState } from '../contexts/IngresoContext'
import { EditarIngresoRequest, ingresoService, IngresoVehiculoResponse } from '../services/ingresoService'
import { outboxService } from '../services/outboxService'
import { useNetworkStatus } from '../hooks/useNetworkStatus'
import {SYNC_COMPLETE_EVENT} from "./AppProvider";
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
    // Gap 3: ids de ingresos que tienen una SALIDA pendiente en la outbox
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

    // Se recalcula al montar y cada vez que la outbox puede haber cambiado
    // (tras registrar una salida offline o tras un sync).

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

    // Calcular al montar
    useEffect(() => {
        void actualizarSalidasPendientes()
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

    const cargarPaginaBackend = useCallback(async (
        page: number,
        placa: string,
        append: boolean
    ) => {
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

            // SUB-1: cachear los 50 más recientes con estado INGRESADO
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

    // Cuando AppProvider termina de procesar la outbox, emite SYNC_COMPLETE_EVENT.
    // Si hubo exitosas (exitosas > 0), recargamos desde el backend para reflejar
    // los estados reales (ej: ingresos que pasaron a ENTREGADO por salidas encoladas).

    useEffect(() => {
        const handleSyncComplete = (event: Event) => {
            const customEvent = event as CustomEvent<SyncResult>
            const { exitosas } = customEvent.detail
            if (exitosas > 0 && isOnlineRef.current) {
                void cargarPaginaBackend(0, filtroPlacaRef.current, false)
                // Recalcular outbox pendientes tras sync
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

    const eliminarIngreso = useCallback(async (id: number) => {
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

    const editarIngreso = useCallback(async (id: number, data: EditarIngresoRequest) => {
        setIsEditing(true)
        try {
            const actualizado = await ingresoService.editarIngreso(id, data)
            setIngresos(prev => prev.map(i => i.idIngreso === id ? actualizado : i))
            setToast({ message: 'Registro actualizado correctamente', type: 'success' })
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Error al editar el registro'
            setToast({ message: msg, type: 'error' })
            throw err
        } finally {
            setIsEditing(false)
        }
    }, [])

    const registrarIngresoConOutbox = useCallback(async (
        payload: Record<string, unknown>
    ): Promise<'online' | 'encolado'> => {
        if (isOnlineRef.current) {
            return 'online'
        }
        await outboxService.enqueue('INGRESO', payload)
        setToast({
            message: 'Sin conexión — el ingreso se registrará automáticamente al recuperar la red',
            type: 'success',
        })
        return 'encolado'
    }, [])

    // SalidaProvider llama a outboxService.enqueue directamente, así que
    // IngresoProvider no sabe cuándo se encola una salida.
    // La solución es exponer una función que Ingresos.tsx puede llamar
    // tras navegar de vuelta desde la pantalla de Salida (ver nota abajo),
    // O simplemente recalcular al montar cada vez que el componente se activa.
    // Usamos el enfoque de recalcular en cada visibilitychange del documento
    // y en el focus de la ventana, que cubre el regreso desde Salida.

    useEffect(() => {
        const recalcular = () => { void actualizarSalidasPendientes() }
        window.addEventListener('focus', recalcular)
        document.addEventListener('visibilitychange', recalcular)
        return () => {
            window.removeEventListener('focus', recalcular)
            document.removeEventListener('visibilitychange', recalcular)
        }
    }, [actualizarSalidasPendientes])

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
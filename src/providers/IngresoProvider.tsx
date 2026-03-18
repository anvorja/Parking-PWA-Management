// src/providers/IngresoProvider.tsx
//
// HU-018 — Proveedor de estado para el módulo de ingresos.
// Scroll infinito: acumula registros en lugar de reemplazar por página.
// SUB-1: persiste 50 más recientes con estado INGRESADO en IndexedDB.
// SUB-2: sirve desde IndexedDB cuando no hay conexión.
// SUB-3: expone isOnline para el banner y deshabilitar botones.
// SUB-4: refresca automáticamente al recuperar conexión.

import React, { useState, useEffect, useCallback, useRef, ReactNode } from 'react'
import { get, set } from 'idb-keyval'
import { IngresoContext } from '../contexts/IngresoContext'
import { ingresoService, IngresoVehiculoResponse } from '../services/ingresoService'
import { useNetworkStatus } from '../hooks/useNetworkStatus'

const IDB_KEY_INGRESOS = 'ingresos_activos_cache'
const CACHE_MAX         = 50
const PAGE_SIZE         = 20

export const IngresoProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { isOnline } = useNetworkStatus()

    const [ingresos, setIngresos]           = useState<IngresoVehiculoResponse[]>([])
    const [isLoading, setIsLoading]         = useState(true)    // carga inicial
    const [isLoadingMore, setIsLoadingMore] = useState(false)   // carga página siguiente
    const [hasMore, setHasMore]             = useState(false)
    const [totalElements, setTotalElements] = useState(0)
    const [currentPage, setCurrentPage]     = useState(0)
    const [filtroPlaca, setFiltroPlacaState] = useState('')

    // Refs para leer valores actuales en callbacks sin deps reactivas
    const filtroPlacaRef = useRef(filtroPlaca)
    const currentPageRef = useRef(currentPage)
    const isOnlineRef    = useRef(isOnline)
    const wasOfflineRef  = useRef(!isOnline)
    const isLoadingRef   = useRef(false) // evita llamadas dobles simultáneas

    useEffect(() => { filtroPlacaRef.current = filtroPlaca  }, [filtroPlaca])
    useEffect(() => { currentPageRef.current = currentPage  }, [currentPage])
    useEffect(() => { isOnlineRef.current    = isOnline     }, [isOnline])

    // ─── Carga desde IndexedDB (modo offline) ───────────────────────────────────

    const cargarDesdeCache = useCallback(async () => {
        setIsLoading(true)
        try {
            const cached = await get<IngresoVehiculoResponse[]>(IDB_KEY_INGRESOS)
            if (cached && cached.length > 0) {
                setIngresos(cached)
                setTotalElements(cached.length)
                setHasMore(false) // offline no tiene paginación
                setCurrentPage(0)
            } else {
                setIngresos([])
                setTotalElements(0)
                setHasMore(false)
            }
        } catch (err) {
            console.error('[IngresoProvider] Error leyendo caché IndexedDB:', err)
            setIngresos([])
        } finally {
            setIsLoading(false)
        }
    }, [])

    // ─── Carga una página del backend ───────────────────────────────────────────
    // append=true → acumula (scroll infinito)
    // append=false → reemplaza (filtro nuevo o refresh)

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

            // SUB-1: cachear los 50 más recientes con estado INGRESADO (solo p0 sin filtro)
            if (page === 0 && !placa) {
                const activos = data.content
                    .filter(i => i.estadoIngreso === 'INGRESADO')
                    .slice(0, CACHE_MAX)
                await set(IDB_KEY_INGRESOS, activos)
            }
        } catch (err) {
            console.error('[IngresoProvider] Error cargando desde backend:', err)
            if (!append) {
                // Solo cae a caché en la carga inicial, no en cargarMas
                await cargarDesdeCache()
            }
        } finally {
            setIsLoading(false)
            setIsLoadingMore(false)
            isLoadingRef.current = false
        }
    }, [cargarDesdeCache])

    // ─── Efecto principal: reacciona a cambios de conectividad ─────────────────

    useEffect(() => {
        if (isOnline) {
            if (wasOfflineRef.current) {
                // SUB-4: volvió la conexión → refresh completo desde p0
                wasOfflineRef.current = false
                void cargarPaginaBackend(0, filtroPlacaRef.current, false)
            } else {
                void cargarPaginaBackend(0, filtroPlacaRef.current, false)
            }
        } else {
            wasOfflineRef.current = true
            void cargarDesdeCache()
        }
    }, [isOnline, cargarPaginaBackend, cargarDesdeCache])

    // ─── API pública ────────────────────────────────────────────────────────────

    const setFiltroPlaca = useCallback((placa: string) => {
        setFiltroPlacaState(placa)
        if (isOnlineRef.current) {
            // Nuevo filtro → resetear lista y cargar desde p0
            void cargarPaginaBackend(0, placa, false)
        } else {
            // Filtro offline: sobre el caché en memoria
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

    /** Carga la siguiente página y la acumula (llamado por el IntersectionObserver) */
    const cargarMas = useCallback(() => {
        if (!isOnlineRef.current || !hasMore || isLoadingRef.current) return
        const nextPage = currentPageRef.current + 1
        void cargarPaginaBackend(nextPage, filtroPlacaRef.current, true)
    }, [hasMore, cargarPaginaBackend])

    /** Recarga desde p0 reemplazando la lista — usado en pull-to-refresh o SUB-4 */
    const refrescar = useCallback(() => {
        if (isOnlineRef.current) {
            void cargarPaginaBackend(0, filtroPlacaRef.current, false)
        }
    }, [cargarPaginaBackend])

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
        }}>
            {children}
        </IngresoContext.Provider>
    )
}
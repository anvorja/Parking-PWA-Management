// src/providers/IngresoProvider.tsx
//
// HU-018 — Proveedor de estado para el módulo de ingresos.
// SUB-1: persiste 50 más recientes con estado INGRESADO en IndexedDB al cargar online.
// SUB-2: sirve desde IndexedDB cuando no hay conexión.
// SUB-3: expone isOnline para que la vista muestre el banner y deshabilite botones.
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

    const [ingresos, setIngresos]             = useState<IngresoVehiculoResponse[]>([])
    const [isLoading, setIsLoading]           = useState(true)
    const [totalElements, setTotalElements]   = useState(0)
    const [totalPages, setTotalPages]         = useState(0)
    const [currentPage, setCurrentPage]       = useState(0)
    const [filtroPlaca, setFiltroPlacaState]  = useState('')

    // Refs para leer valores actuales dentro de callbacks sin agregarlos como deps
    const filtroPlacaRef = useRef(filtroPlaca)
    const currentPageRef = useRef(currentPage)
    const isOnlineRef    = useRef(isOnline)
    const wasOfflineRef  = useRef(!isOnline)

    useEffect(() => { filtroPlacaRef.current = filtroPlaca  }, [filtroPlaca])
    useEffect(() => { currentPageRef.current = currentPage  }, [currentPage])
    useEffect(() => { isOnlineRef.current    = isOnline     }, [isOnline])

    // ─── Carga desde IndexedDB ──────────────────────────────────────────────────

    const cargarDesdeCache = useCallback(async () => {
        setIsLoading(true)
        try {
            const cached = await get<IngresoVehiculoResponse[]>(IDB_KEY_INGRESOS)
            if (cached && cached.length > 0) {
                setIngresos(cached)
                setTotalElements(cached.length)
                setTotalPages(1)
                setCurrentPage(0)
            } else {
                setIngresos([])
                setTotalElements(0)
                setTotalPages(0)
            }
        } catch (err) {
            console.error('[IngresoProvider] Error leyendo caché IndexedDB:', err)
            setIngresos([])
        } finally {
            setIsLoading(false)
        }
    }, [])

    // ─── Carga desde backend ────────────────────────────────────────────────────

    const cargarDesdeBackend = useCallback(async (page: number, placa: string) => {
        setIsLoading(true)
        try {
            const data = await ingresoService.listarIngresos({ placa, page, size: PAGE_SIZE })

            setIngresos(data.content)
            setTotalElements(data.totalElements)
            setTotalPages(data.totalPages)
            setCurrentPage(data.page)

            // SUB-1: cachear los 50 más recientes con estado INGRESADO (solo p0 sin filtro)
            if (page === 0 && !placa) {
                const activos = data.content
                    .filter(i => i.estadoIngreso === 'INGRESADO')
                    .slice(0, CACHE_MAX)
                await set(IDB_KEY_INGRESOS, activos)
            }
        } catch (err) {
            console.error('[IngresoProvider] Error cargando desde backend:', err)
            await cargarDesdeCache()
        } finally {
            setIsLoading(false)
        }
    }, [cargarDesdeCache])

    // ─── Efecto principal ───────────────────────────────────────────────────────
    // Usa `void` para llamadas async dentro de useEffect — evita el warning
    // "Promise returned from X is ignored" sin necesidad de envolver en async.

    useEffect(() => {
        if (isOnline) {
            if (wasOfflineRef.current) {
                wasOfflineRef.current = false
                void cargarDesdeBackend(0, filtroPlacaRef.current)
            } else {
                void cargarDesdeBackend(currentPageRef.current, filtroPlacaRef.current)
            }
        } else {
            wasOfflineRef.current = true
            void cargarDesdeCache()
        }
    }, [isOnline, cargarDesdeBackend, cargarDesdeCache])

    // ─── API pública ────────────────────────────────────────────────────────────

    const setFiltroPlaca = useCallback((placa: string) => {
        setFiltroPlacaState(placa)
        if (isOnlineRef.current) {
            void cargarDesdeBackend(0, placa)
        } else {
            void get<IngresoVehiculoResponse[]>(IDB_KEY_INGRESOS).then(cached => {
                if (!cached) return
                const filtrados = placa.trim()
                    ? cached.filter(i => i.placa.toUpperCase().includes(placa.toUpperCase()))
                    : cached
                setIngresos(filtrados)
                setTotalElements(filtrados.length)
                setTotalPages(1)
                setCurrentPage(0)
            })
        }
    }, [cargarDesdeBackend])

    const cargarPagina = useCallback((page: number) => {
        if (isOnlineRef.current) {
            void cargarDesdeBackend(page, filtroPlacaRef.current)
        }
    }, [cargarDesdeBackend])

    const refrescar = useCallback(() => {
        if (isOnlineRef.current) {
            void cargarDesdeBackend(0, filtroPlacaRef.current)
        }
    }, [cargarDesdeBackend])

    return (
        <IngresoContext.Provider value={{
            ingresos,
            isLoading,
            isOnline,
            totalElements,
            totalPages,
            currentPage,
            filtroPlaca,
            setFiltroPlaca,
            cargarPagina,
            refrescar,
        }}>
            {children}
        </IngresoContext.Provider>
    )
}
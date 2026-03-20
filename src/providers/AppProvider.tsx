// src/providers/AppProvider.tsx

import React, { useState, useEffect, useCallback, useRef, ReactNode } from 'react'
import { AppContext, AppContextType, EstadoRed } from '../contexts/AppContext'
import { outboxService } from '../services/outboxService'
import { syncService, SyncResult } from '../services/syncService'

const API_URL                  = import.meta.env.VITE_API_URL || ''
const HEALTH_CHECK_INTERVAL_MS = 30_000
const HEALTH_CHECK_TIMEOUT_MS  = 5_000

export const SYNC_COMPLETE_EVENT = 'parking:sync-complete'

// ─── Helper health-check ──────────────────────────────────────────────────────

async function checkBackendReachable(): Promise<boolean> {
    try {
        const controller = new AbortController()
        const timeoutId  = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS)
        const response   = await fetch(`${API_URL}/health`, {
            method: 'GET', signal: controller.signal, cache: 'no-store',
        })
        clearTimeout(timeoutId)
        return response.ok
    } catch {
        return false
    }
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isOnline, setIsOnline]                 = useState(navigator.onLine)
    const [isSincronizando, setIsSincronizando]   = useState(false)
    const [pendientesOutbox, setPendientesOutbox] = useState(0)
    const [muertasOutbox, setMuertasOutbox]       = useState(0)

    const isOnlineRef = useRef(isOnline)
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

    useEffect(() => { isOnlineRef.current = isOnline }, [isOnline])

    // ── Actualizar contadores de outbox ───────────────────────────────────────

    const actualizarContadores = useCallback(async () => {
        const [total, muertas] = await Promise.all([
            outboxService.count(),
            outboxService.getMuertas(),
        ])
        setPendientesOutbox(total)
        setMuertasOutbox(muertas.length)
    }, [])

    // ── Ejecutar sync ─────────────────────────────────────────────────────────

    const ejecutarSync = useCallback(async () => {
        if (!isOnlineRef.current || syncService.isSincronizando()) return

        const pendientes = await outboxService.getPendientes()
        if (pendientes.length === 0) {
            await actualizarContadores()
            return
        }

        setIsSincronizando(true)

        const result = await syncService.procesarOutbox((parcial: SyncResult) => {
            void actualizarContadores()
            if (import.meta.env.DEV) {
                console.debug('[AppProvider] Progreso sync:', parcial)
            }
        })

        setIsSincronizando(false)
        await actualizarContadores()

        window.dispatchEvent(
            new CustomEvent<SyncResult>(SYNC_COMPLETE_EVENT, { detail: result })
        )
    }, [actualizarContadores])

    // ── Health-check y detección de red ───────────────────────────────────────
    //   1. runHealthCheck captura eraOffline ANTES del await.
    //   2. handleOnline actualiza isOnlineRef manualmente de forma síncrona
    //      y dispara ejecutarSync directamente, sin esperar al health-check.
    //      Así el sync ocurre al instante tanto con WiFi físico como con
    //      el throttling de DevTools (Offline → No throttling).

    const runHealthCheck = useCallback(async () => {
        // Capturar ANTES del await — puede cambiar durante la espera async
        const eraOffline = !isOnlineRef.current

        const reachable = await checkBackendReachable()
        setIsOnline(reachable)

        if (reachable && eraOffline) {
            void ejecutarSync()
        }
    }, [ejecutarSync])

    useEffect(() => {
        const handleOnline = () => {
            // Actualizar el ref síncronamente ANTES de llamar ejecutarSync,
            // porque ejecutarSync lo lee y sin esto vería isOnlineRef=false
            // durante la ventana de tiempo hasta el próximo render.
            isOnlineRef.current = true
            setIsOnline(true)
            // Disparar sync de inmediato — el navegador ya confirmó red.
            void ejecutarSync()
            // Health-check confirma que el BACKEND es alcanzable (no solo la red local).
            void runHealthCheck()
        }
        const handleOffline = () => {
            isOnlineRef.current = false
            setIsOnline(false)
        }

        window.addEventListener('online',  handleOnline)
        window.addEventListener('offline', handleOffline)

        intervalRef.current = setInterval(() => { void runHealthCheck() }, HEALTH_CHECK_INTERVAL_MS)

        void runHealthCheck()
        void actualizarContadores()

        return () => {
            window.removeEventListener('online',  handleOnline)
            window.removeEventListener('offline', handleOffline)
            if (intervalRef.current) clearInterval(intervalRef.current)
        }
    }, [runHealthCheck, ejecutarSync, actualizarContadores])

    // ── Sincronización manual ─────────────────────────────────────────────────

    const sincronizarAhora = useCallback(async () => {
        if (!isOnlineRef.current) return
        await ejecutarSync()
    }, [ejecutarSync])

    // ── Estado unificado de red ───────────────────────────────────────────────

    const estadoRed: EstadoRed = (() => {
        if (!isOnline)         return 'offline'
        if (isSincronizando)   return 'sincronizando'
        if (muertasOutbox > 0) return 'error_sync'
        return 'online'
    })()

    const value: AppContextType = {
        estadoRed,
        pendientesOutbox,
        muertasOutbox,
        isSincronizando,
        sincronizarAhora,
    }

    return (
        <AppContext.Provider value={value}>
            <NetworkBanner
                estadoRed={estadoRed}
                pendientes={pendientesOutbox}
                muertas={muertasOutbox}
                onReintentar={sincronizarAhora}
            />
            {children}
        </AppContext.Provider>
    )
}

// ─── Banner global de red ─────────────────────────────────────────────────────
// El banner se renderiza en position:fixed top:0 y actualiza la CSS variable
// --network-banner-height en :root para que los headers sticky de cada página
// puedan desplazarse hacia abajo y nunca queden tapados por el banner.
// Cuando el estado es 'online' el banner no se muestra y la variable vale 0px.

const BANNER_HEIGHT_VAR = '--network-banner-height'

interface NetworkBannerProps {
    estadoRed:    EstadoRed
    pendientes:   number
    muertas:      number
    onReintentar: () => void
}

const NetworkBanner: React.FC<NetworkBannerProps> = ({
                                                         estadoRed, pendientes, muertas, onReintentar,
                                                     }) => {
    // Sincronizar CSS variable con visibilidad del banner
    useEffect(() => {
        const root = document.documentElement
        if (estadoRed === 'online') {
            root.style.setProperty(BANNER_HEIGHT_VAR, '0px')
        } else {
            // El banner tiene padding 8px*2 + font ~16px ≈ 36px
            root.style.setProperty(BANNER_HEIGHT_VAR, '37px')
        }
        return () => { root.style.setProperty(BANNER_HEIGHT_VAR, '0px') }
    }, [estadoRed])

    if (estadoRed === 'online') return null

    const configs: Record<Exclude<EstadoRed, 'online'>, {
        bg: string; borde: string; icono: string; texto: string; color: string
    }> = {
        offline: {
            bg:    '#fffbeb',
            borde: '#fcd34d',
            color: '#92400e',
            icono: 'wifi_off',
            texto: 'Sin conexión — los cambios se guardarán localmente',
        },
        sincronizando: {
            bg:    '#eff6ff',
            borde: '#93c5fd',
            color: '#1e40af',
            icono: 'sync',
            texto: `Sincronizando ${pendientes} operación${pendientes !== 1 ? 'es' : ''}...`,
        },
        error_sync: {
            bg:    '#fef2f2',
            borde: '#fecaca',
            color: '#991b1b',
            icono: 'sync_problem',
            texto: `${muertas} operación${muertas !== 1 ? 'es' : ''} no pudo${muertas !== 1 ? 'ieron' : ''} sincronizarse`,
        },
    }

    const cfg = configs[estadoRed]

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
            background: cfg.bg, borderBottom: `1px solid ${cfg.borde}`,
            padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '10px',
            // Garantiza que el banner nunca tape la safe area de iOS
            paddingTop: `calc(8px + env(safe-area-inset-top, 0px))`,
        }}>
            <span
                className="material-symbols-outlined"
                style={{
                    fontSize: '18px', color: cfg.color, flexShrink: 0,
                    animation: estadoRed === 'sincronizando' ? 'spin 1s linear infinite' : 'none',
                }}
            >
                {cfg.icono}
            </span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: cfg.color, flex: 1 }}>
                {cfg.texto}
            </span>
            {estadoRed === 'error_sync' && (
                <button
                    onClick={onReintentar}
                    style={{
                        padding: '4px 10px', borderRadius: '6px', border: 'none',
                        background: '#ef4444', color: '#fff',
                        fontSize: '11px', fontWeight: 700, cursor: 'pointer', flexShrink: 0,
                    }}
                >
                    Reintentar
                </button>
            )}
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    )
}
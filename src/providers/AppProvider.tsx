// src/providers/AppProvider.tsx
//
// FASE 1 — Provider global de estado de red y outbox.
// Se monta UNA SOLA VEZ en App.tsx, dentro de AuthProvider.
// Gestiona: detección de red, disparo de syncService, banner global de estado.

import React, { useState, useEffect, useCallback, useRef, ReactNode } from 'react'
import { AppContext, AppContextType, EstadoRed } from '../contexts/AppContext'
import { outboxService } from '../services/outboxService'
import { syncService, SyncResult } from '../services/syncService'

const API_URL                  = import.meta.env.VITE_API_URL || ''
const HEALTH_CHECK_INTERVAL_MS = 30_000
const HEALTH_CHECK_TIMEOUT_MS  = 5_000

// ─── Helper health-check ──────────────────────────────────────────────────────
// Mismo patrón que useNetworkStatus pero a nivel de provider global.
// useNetworkStatus sigue usándose en los providers de módulo para compatibilidad.

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

    const isOnlineRef   = useRef(isOnline)
    const intervalRef   = useRef<ReturnType<typeof setInterval> | null>(null)

    useEffect(() => { isOnlineRef.current = isOnline }, [isOnline])

    // ── Actualizar contadores de outbox ──────────────────────────────────────────

    const actualizarContadores = useCallback(async () => {
        const [total, muertas] = await Promise.all([
            outboxService.count(),
            outboxService.getMuertas(),
        ])
        setPendientesOutbox(total)
        setMuertasOutbox(muertas.length)
    }, [])

    // ── Ejecutar sync ────────────────────────────────────────────────────────────

    const ejecutarSync = useCallback(async () => {
        if (!isOnlineRef.current || syncService.isSincronizando()) return

        const pendientes = await outboxService.getPendientes()
        if (pendientes.length === 0) {
            await actualizarContadores()
            return
        }

        setIsSincronizando(true)

        await syncService.procesarOutbox((parcial: SyncResult) => {
            // Actualizar contadores después de cada operación procesada
            void actualizarContadores()
            // Suprimir el warning de unused — parcial se usa para logging en desarrollo
            if (import.meta.env.DEV) {
                console.debug('[AppProvider] Progreso sync:', parcial)
            }
        })

        setIsSincronizando(false)
        await actualizarContadores()
    }, [actualizarContadores])

    // ── Health-check y detección de red ──────────────────────────────────────────

    const runHealthCheck = useCallback(async () => {
        const reachable = await checkBackendReachable()
        const eraOffline = !isOnlineRef.current

        setIsOnline(reachable)

        if (reachable && eraOffline) {
            // Acaba de recuperar la conexión → disparar sync
            void ejecutarSync()
        }
    }, [ejecutarSync])

    useEffect(() => {
        const handleOnline  = () => { setIsOnline(true);  void runHealthCheck() }
        const handleOffline = () => { setIsOnline(false) }

        window.addEventListener('online',  handleOnline)
        window.addEventListener('offline', handleOffline)

        intervalRef.current = setInterval(() => { void runHealthCheck() }, HEALTH_CHECK_INTERVAL_MS)

        // Check inicial + contadores iniciales
        void runHealthCheck()
        void actualizarContadores()

        return () => {
            window.removeEventListener('online',  handleOnline)
            window.removeEventListener('offline', handleOffline)
            if (intervalRef.current) clearInterval(intervalRef.current)
        }
    }, [runHealthCheck, actualizarContadores])

    // ── Sincronización manual ────────────────────────────────────────────────────

    const sincronizarAhora = useCallback(async () => {
        if (!isOnlineRef.current) return
        await ejecutarSync()
    }, [ejecutarSync])

    // ── Estado unificado de red ───────────────────────────────────────────────────

    const estadoRed: EstadoRed = (() => {
        if (!isOnline) return 'offline'
        if (isSincronizando) return 'sincronizando'
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
            {/* Banner global de estado de red */}
            <NetworkBanner estadoRed={estadoRed} pendientes={pendientesOutbox} muertas={muertasOutbox} onReintentar={sincronizarAhora} />
            {children}
        </AppContext.Provider>
    )
}

// ─── Banner global de red ─────────────────────────────────────────────────────
// Componente interno — no se exporta ni se usa fuera de este archivo.
// Solo visible cuando el estado no es 'online'.

interface NetworkBannerProps {
    estadoRed:  EstadoRed
    pendientes: number
    muertas:    number
    onReintentar: () => void
}

const NetworkBanner: React.FC<NetworkBannerProps> = ({ estadoRed, pendientes, muertas, onReintentar }) => {
    if (estadoRed === 'online') return null

    const configs: Record<Exclude<EstadoRed, 'online'>, {
        bg: string; borde: string; icono: string; texto: string; color: string
    }> = {
        offline: {
            bg:     '#fffbeb',
            borde:  '#fcd34d',
            color:  '#92400e',
            icono:  'wifi_off',
            texto:  'Sin conexión — los cambios se guardarán localmente',
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
                        fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                    }}
                >
                    Reintentar
                </button>
            )}
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    )
}
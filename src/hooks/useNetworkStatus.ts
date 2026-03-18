// src/hooks/useNetworkStatus.ts
//
// Hook de estado de red más confiable que solo navigator.onLine.
// navigator.onLine da true si hay red local aunque no haya internet real,
// por eso se complementa con un health-check ligero al backend cada 30s.
// El backend ya tiene /health expuesto y sin autenticación.

import { useState, useEffect, useRef } from 'react'

const API_URL                  = import.meta.env.VITE_API_URL || ''
const HEALTH_CHECK_INTERVAL_MS = 30_000
const HEALTH_CHECK_TIMEOUT_MS  = 5_000

async function checkBackendReachable(): Promise<boolean> {
    try {
        const controller = new AbortController()
        const timeoutId  = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS)

        const response = await fetch(`${API_URL}/health`, {
            method: 'GET',
            signal: controller.signal,
            cache:  'no-store',
        })

        clearTimeout(timeoutId)
        return response.ok
    } catch {
        return false
    }
}

export function useNetworkStatus() {
    const [isOnline, setIsOnline] = useState(navigator.onLine)
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

    const runHealthCheck = async () => {
        const reachable = await checkBackendReachable()
        setIsOnline(reachable)
    }

    useEffect(() => {
        const handleOnline  = () => { setIsOnline(true);  void runHealthCheck() }
        const handleOffline = () => { setIsOnline(false) }

        window.addEventListener('online',  handleOnline)
        window.addEventListener('offline', handleOffline)

        intervalRef.current = setInterval(() => { void runHealthCheck() }, HEALTH_CHECK_INTERVAL_MS)

        // Check inicial
        void runHealthCheck()

        return () => {
            window.removeEventListener('online',  handleOnline)
            window.removeEventListener('offline', handleOffline)
            if (intervalRef.current) clearInterval(intervalRef.current)
        }
    }, []) // eslint-disable-line react-hooks/exhaustive-deps
    // runHealthCheck es estable (no depende de estado), el eslint-disable es intencional

    return { isOnline }
}
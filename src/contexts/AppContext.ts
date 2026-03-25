// src/contexts/AppContext.ts

// Contexto global de estado de red y outbox.

import { createContext } from 'react'

export type EstadoRed =
    | 'online'          // conectado, outbox vacía
    | 'offline'         // sin conexión
    | 'sincronizando'   // conectado, procesando outbox
    | 'error_sync'      // hay entradas muertas en la outbox

export interface AppContextType {
    /** Estado unificado de red + outbox */
    estadoRed: EstadoRed
    /** true = backend alcanzable. Fuente de verdad única de conectividad para toda la app. */
    isOnline: boolean
    /** Número de operaciones pendientes en la outbox (pendientes + muertas) */
    pendientesOutbox: number
    /** Número de entradas que superaron MAX_RETRIES y no pudieron sincronizarse */
    muertasOutbox: number
    /** true mientras el syncService está procesando la outbox */
    isSincronizando: boolean
    /** Fuerza una sincronización manual (por si el usuario quiere reintentar) */
    sincronizarAhora: () => Promise<void>
}

export const AppContext = createContext<AppContextType | undefined>(undefined)
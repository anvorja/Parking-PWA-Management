// src/services/outboxService.ts
//
// FASE 1 — Cola offline (outbox) en IndexedDB.
// Persiste operaciones que no pudieron enviarse al backend por falta de red.
// El syncService las consume en orden FIFO al recuperar la conexión.

import { get, set } from 'idb-keyval'

// ─── Clave IDB ────────────────────────────────────────────────────────────────

const OUTBOX_KEY = 'outbox_queue'

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type OutboxType = 'INGRESO' | 'SALIDA' | 'UBICACION'

export interface OutboxEntry {
    /** UUID generado localmente — identifica la operación de forma única */
    id:        string
    /** Tipo de operación — define el endpoint destino en el syncService */
    type:      OutboxType
    /** Body que se enviará al backend tal cual */
    payload:   Record<string, unknown>
    /** Epoch ms del momento en que se encoló — determina el orden FIFO */
    createdAt: number
    /** Número de intentos fallidos de sincronización */
    retries:   number
}

// ─── Límite de reintentos ─────────────────────────────────────────────────────
// Si una entrada supera este valor, se considera "muerta" y se notifica
// al usuario. No se elimina automáticamente.

export const MAX_RETRIES = 3

// ─── Helper UUID simple ───────────────────────────────────────────────────────
// crypto.randomUUID está disponible en todos los navegadores modernos y en
// el Service Worker. Es suficiente para identificar entradas de la outbox.

function generarId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID()
    }
    // Fallback para entornos sin crypto.randomUUID (tests, Safari antiguo)
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

// ─── Servicio ─────────────────────────────────────────────────────────────────

export const outboxService = {

    /**
     * Lee todas las entradas de la outbox desde IndexedDB.
     * Devuelve array vacío si no existe la clave o hay error.
     */
    getAll: async (): Promise<OutboxEntry[]> => {
        try {
            const entries = await get<OutboxEntry[]>(OUTBOX_KEY)
            return entries ?? []
        } catch (err) {
            console.error('[outboxService] Error leyendo outbox:', err)
            return []
        }
    },

    /**
     * Añade una nueva operación a la cola.
     * Genera el id y el createdAt automáticamente.
     * Devuelve la entrada creada para que el llamador pueda referenciarla.
     */
    enqueue: async (
        type: OutboxType,
        payload: Record<string, unknown>
    ): Promise<OutboxEntry> => {
        const entry: OutboxEntry = {
            id:        generarId(),
            type,
            payload,
            createdAt: Date.now(),
            retries:   0,
        }
        try {
            const current = await outboxService.getAll()
            await set(OUTBOX_KEY, [...current, entry])
        } catch (err) {
            console.error('[outboxService] Error encolando operación:', err)
        }
        return entry
    },

    /**
     * Elimina una entrada de la outbox por su id.
     * Se llama tras una sincronización exitosa.
     */
    remove: async (id: string): Promise<void> => {
        try {
            const current = await outboxService.getAll()
            await set(OUTBOX_KEY, current.filter(e => e.id !== id))
        } catch (err) {
            console.error('[outboxService] Error eliminando entrada:', err)
        }
    },

    /**
     * Incrementa el contador de reintentos de una entrada.
     * Si retries alcanza MAX_RETRIES, la entrada queda "muerta"
     * (permanece en la outbox pero el syncService no la volverá a intentar).
     */
    incrementRetries: async (id: string): Promise<OutboxEntry | null> => {
        try {
            const current = await outboxService.getAll()
            let actualizada: OutboxEntry | null = null
            const updated = current.map(e => {
                if (e.id === id) {
                    actualizada = { ...e, retries: e.retries + 1 }
                    return actualizada
                }
                return e
            })
            await set(OUTBOX_KEY, updated)
            return actualizada
        } catch (err) {
            console.error('[outboxService] Error incrementando retries:', err)
            return null
        }
    },

    /**
     * Devuelve solo las entradas que aún pueden reintentarse
     * (retries < MAX_RETRIES), ordenadas por createdAt ASC (FIFO)
     * y por tipo: INGRESO primero, luego SALIDA, luego UBICACION.
     */
    getPendientes: async (): Promise<OutboxEntry[]> => {
        const all = await outboxService.getAll()
        const ORDEN: Record<OutboxType, number> = {
            INGRESO:   0,
            SALIDA:    1,
            UBICACION: 2,
        }
        return all
            .filter(e => e.retries < MAX_RETRIES)
            .sort((a, b) => {
                const tipoA = ORDEN[a.type]
                const tipoB = ORDEN[b.type]
                if (tipoA !== tipoB) return tipoA - tipoB
                return a.createdAt - b.createdAt
            })
    },

    /**
     * Devuelve las entradas que superaron MAX_RETRIES (muertas).
     * Usadas para mostrar el banner de error al usuario.
     */
    getMuertas: async (): Promise<OutboxEntry[]> => {
        const all = await outboxService.getAll()
        return all.filter(e => e.retries >= MAX_RETRIES)
    },

    /**
     * Cuenta total de entradas en la outbox (pendientes + muertas).
     * Usado por el AppProvider para el indicador global.
     */
    count: async (): Promise<number> => {
        const all = await outboxService.getAll()
        return all.length
    },

    /**
     * Elimina completamente la outbox — solo para uso en tests o reset manual.
     */
    clear: async (): Promise<void> => {
        try {
            await set(OUTBOX_KEY, [])
        } catch (err) {
            console.error('[outboxService] Error limpiando outbox:', err)
        }
    },
}
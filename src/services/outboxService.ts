// src/services/outboxService.ts
//
// Cola offline (outbox) en IndexedDB.
// Persiste operaciones que no pudieron enviarse al backend por falta de red.
// El syncService las consume en orden FIFO al recuperar la conexión.
//
// OutboxType se extiende para cubrir todas las operaciones mutantes:
//   INGRESO          → POST   /api/ingresos
//   INGRESO_EDITAR   → PUT    /api/ingresos/{id}
//   SALIDA           → POST   /api/ingresos/{id}/salida
//   UBICACION        → POST   /api/v1/ubicaciones  (crear, sin id en payload)
//   UBICACION_EDITAR → PUT    /api/v1/ubicaciones/{id}  (con id en payload)
//   UBICACION_BORRAR → DELETE /api/v1/ubicaciones/{id}
//   UBICACION_REACTIVAR → PUT /api/v1/ubicaciones/{id}/reactivar

import { get, set } from 'idb-keyval'

// ─── Clave IDB ────────────────────────────────────────────────────────────────

const OUTBOX_KEY = 'outbox_queue'

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type OutboxType =
    | 'INGRESO'
    | 'INGRESO_EDITAR'
    | 'SALIDA'
    | 'UBICACION'
    | 'UBICACION_EDITAR'
    | 'UBICACION_BORRAR'
    | 'UBICACION_REACTIVAR'

export interface OutboxEntry {
    /** UUID generado localmente — identifica la operación de forma única */
    id:        string
    /** Tipo de operación — define el endpoint y método HTTP en el syncService */
    type:      OutboxType
    /** Body que se enviará al backend tal cual */
    payload:   Record<string, unknown>
    /** Epoch ms del momento en que se encoló — determina el orden FIFO */
    createdAt: number
    /** Número de intentos fallidos de sincronización */
    retries:   number
}

// ─── Límite de reintentos ─────────────────────────────────────────────────────

export const MAX_RETRIES = 3

// ─── Orden de procesamiento por tipo ─────────────────────────────────────────
// Garantiza que las operaciones se apliquen en un orden lógico:
// primero ingresos, luego salidas, luego cambios de ubicación.

export const ORDEN_TIPO: Record<OutboxType, number> = {
    INGRESO:          0,
    INGRESO_EDITAR:   1,
    SALIDA:           2,
    UBICACION:        3,
    UBICACION_EDITAR: 4,
    UBICACION_BORRAR: 5,
    UBICACION_REACTIVAR: 6,
}

// ─── Helper UUID ──────────────────────────────────────────────────────────────

function generarId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID()
    }
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
     * Si retries alcanza MAX_RETRIES la entrada queda "muerta".
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
     * (retries < MAX_RETRIES), ordenadas por tipo y luego por createdAt ASC.
     */
    getPendientes: async (): Promise<OutboxEntry[]> => {
        const all = await outboxService.getAll()
        return all
            .filter(e => e.retries < MAX_RETRIES)
            .sort((a, b) => {
                const ordenA = ORDEN_TIPO[a.type]
                const ordenB = ORDEN_TIPO[b.type]
                if (ordenA !== ordenB) return ordenA - ordenB
                return a.createdAt - b.createdAt
            })
    },

    /** Devuelve las entradas que superaron MAX_RETRIES (muertas). */
    getMuertas: async (): Promise<OutboxEntry[]> => {
        const all = await outboxService.getAll()
        return all.filter(e => e.retries >= MAX_RETRIES)
    },

    /** Cuenta total de entradas en la outbox (pendientes + muertas). */
    count: async (): Promise<number> => {
        const all = await outboxService.getAll()
        return all.length
    },

    /** Elimina completamente la outbox — solo para tests o reset manual. */
    clear: async (): Promise<void> => {
        try {
            await set(OUTBOX_KEY, [])
        } catch (err) {
            console.error('[outboxService] Error limpiando outbox:', err)
        }
    },
}
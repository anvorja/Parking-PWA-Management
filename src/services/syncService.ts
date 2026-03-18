// src/services/syncService.ts
//
// FASE 1 — Motor de sincronización bidireccional.
// Lee la outbox de IndexedDB y envía cada operación al backend.
// Orden: INGRESO → SALIDA → UBICACION (FIFO por tipo y por createdAt).
// Se invoca desde AppProvider cuando isOnline cambia a true.

import { authService } from './authService'
import { outboxService, OutboxEntry, MAX_RETRIES } from './outboxService'

const API_URL = import.meta.env.VITE_API_URL || ''

// ─── Tipos de resultado ───────────────────────────────────────────────────────

export interface SyncResult {
    procesadas: number
    exitosas:   number
    fallidas:   number
    muertas:    number
}

// ─── Helper fetch autenticado ─────────────────────────────────────────────────

async function fetchConAuth(path: string, options: RequestInit = {}): Promise<Response> {
    const token = await authService.getToken()
    return fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers,
        },
    })
}

// ─── Endpoints por tipo de operación ─────────────────────────────────────────

async function ejecutarOperacion(entry: OutboxEntry): Promise<Response> {
    switch (entry.type) {

        case 'INGRESO':
            // POST /api/ingresos
            return fetchConAuth('/api/ingresos', {
                method: 'POST',
                body: JSON.stringify(entry.payload),
            })

        case 'SALIDA': {
            // POST /api/ingresos/{idIngreso}/salida
            const { idIngreso, ...resto } = entry.payload as { idIngreso: number; [key: string]: unknown }
            return fetchConAuth(`/api/ingresos/${idIngreso}/salida`, {
                method: 'POST',
                body: JSON.stringify(resto),
            })
        }

        case 'UBICACION': {
            // POST /api/v1/ubicaciones (crear) o PUT /api/v1/ubicaciones/{id} (editar)
            const { id: ubicacionId, ...restoUb } = entry.payload as { id?: number; [key: string]: unknown }
            if (ubicacionId) {
                return fetchConAuth(`/api/v1/ubicaciones/${ubicacionId}`, {
                    method: 'PUT',
                    body: JSON.stringify(restoUb),
                })
            }
            return fetchConAuth('/api/v1/ubicaciones', {
                method: 'POST',
                body: JSON.stringify(entry.payload),
            })
        }

        default:
            throw new Error(`[syncService] Tipo de operación desconocido: ${(entry as OutboxEntry).type}`)
    }
}

// ─── Motor principal ──────────────────────────────────────────────────────────

// Flag para evitar ejecuciones concurrentes
let sincronizando = false

export const syncService = {

    /**
     * Procesa todas las entradas pendientes de la outbox.
     * Si ya hay una sincronización en curso, retorna inmediatamente.
     * Devuelve un SyncResult con el resumen de la operación.
     *
     * @param onProgreso   Callback opcional llamado tras cada operación — útil para
     *                     que AppProvider actualice el contador del banner.
     */
    procesarOutbox: async (
        onProgreso?: (result: SyncResult) => void
    ): Promise<SyncResult> => {

        if (sincronizando) {
            return { procesadas: 0, exitosas: 0, fallidas: 0, muertas: 0 }
        }

        sincronizando = true

        const result: SyncResult = {
            procesadas: 0,
            exitosas:   0,
            fallidas:   0,
            muertas:    0,
        }

        try {
            const pendientes = await outboxService.getPendientes()

            for (const entry of pendientes) {
                result.procesadas++

                try {
                    const response = await ejecutarOperacion(entry)

                    if (response.ok) {
                        // Sincronización exitosa — eliminar de la outbox
                        await outboxService.remove(entry.id)
                        result.exitosas++
                    } else if (response.status >= 400 && response.status < 500) {
                        // Error de negocio (4xx) — no tiene sentido reintentar
                        // Llevar al máximo de reintentos para marcarla como muerta
                        for (let i = entry.retries; i < MAX_RETRIES; i++) {
                            await outboxService.incrementRetries(entry.id)
                        }
                        result.fallidas++
                        result.muertas++
                        console.warn(
                            `[syncService] Entrada ${entry.id} (${entry.type}) rechazada por el backend (${response.status})`
                        )
                    } else {
                        // Error de servidor (5xx) o red — incrementar retries
                        const actualizada = await outboxService.incrementRetries(entry.id)
                        result.fallidas++
                        if (actualizada && actualizada.retries >= MAX_RETRIES) {
                            result.muertas++
                            console.warn(`[syncService] Entrada ${entry.id} alcanzó max retries y quedó muerta`)
                        }
                    }
                } catch (err) {
                    // Error de red / timeout — incrementar retries
                    const actualizada = await outboxService.incrementRetries(entry.id)
                    result.fallidas++
                    if (actualizada && actualizada.retries >= MAX_RETRIES) {
                        result.muertas++
                    }
                    console.error(`[syncService] Error procesando entrada ${entry.id}:`, err)
                }

                onProgreso?.(result)
            }
        } finally {
            sincronizando = false
        }

        return result
    },

    /** Indica si hay una sincronización en curso. */
    isSincronizando: (): boolean => sincronizando,
}
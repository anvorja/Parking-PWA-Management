// src/services/syncService.ts
//
// Motor de sincronización bidireccional.
// Lee la outbox de IndexedDB y envía cada operación al backend.
// Orden: INGRESO → INGRESO_EDITAR → SALIDA → UBICACION → UBICACION_EDITAR → UBICACION_BORRAR
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

        // POST /api/ingresos
        case 'INGRESO':
            return fetchConAuth('/api/ingresos', {
                method: 'POST',
                body:   JSON.stringify(entry.payload),
            })

        // PUT /api/ingresos/{id}
        case 'INGRESO_EDITAR': {
            const { id: ingresoId, ...resto } = entry.payload as { id: number; [key: string]: unknown }
            return fetchConAuth(`/api/ingresos/${ingresoId}`, {
                method: 'PUT',
                body:   JSON.stringify(resto),
            })
        }

        // POST /api/ingresos/{idIngreso}/salida
        case 'SALIDA': {
            const { idIngreso, ...resto } = entry.payload as { idIngreso: number; [key: string]: unknown }
            return fetchConAuth(`/api/ingresos/${idIngreso}/salida`, {
                method: 'POST',
                body:   JSON.stringify(resto),
            })
        }

        // POST /api/v1/ubicaciones  (crear — payload sin id)
        case 'UBICACION':
            return fetchConAuth('/api/v1/ubicaciones', {
                method: 'POST',
                body:   JSON.stringify(entry.payload),
            })

        // PUT /api/v1/ubicaciones/{id}
        case 'UBICACION_EDITAR': {
            const { id: ubicacionId, ...restoUb } = entry.payload as { id: number; [key: string]: unknown }
            return fetchConAuth(`/api/v1/ubicaciones/${ubicacionId}`, {
                method: 'PUT',
                body:   JSON.stringify(restoUb),
            })
        }

        // DELETE /api/v1/ubicaciones/{id}
        case 'UBICACION_BORRAR': {
            const { id: ubicacionId } = entry.payload as { id: number }
            return fetchConAuth(`/api/v1/ubicaciones/${ubicacionId}`, {
                method: 'DELETE',
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
     *
     * @param onProgreso  Callback opcional tras cada operación —
     *                    AppProvider lo usa para actualizar el contador del banner.
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
                        await outboxService.remove(entry.id)
                        result.exitosas++
                    } else if (response.status >= 400 && response.status < 500) {
                        // Error de negocio (4xx) — marcar como muerta directamente
                        for (let i = entry.retries; i < MAX_RETRIES; i++) {
                            await outboxService.incrementRetries(entry.id)
                        }
                        result.fallidas++
                        result.muertas++
                        console.warn(
                            `[syncService] Entrada ${entry.id} (${entry.type}) rechazada (${response.status})`
                        )
                    } else {
                        // Error de servidor (5xx) / timeout — incrementar retries
                        const actualizada = await outboxService.incrementRetries(entry.id)
                        result.fallidas++
                        if (actualizada && actualizada.retries >= MAX_RETRIES) {
                            result.muertas++
                            console.warn(`[syncService] Entrada ${entry.id} alcanzó max retries`)
                        }
                    }
                } catch (err) {
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
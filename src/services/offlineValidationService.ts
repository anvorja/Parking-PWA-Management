// src/services/offlineValidationService.ts
//
// Validación local para registros de ingreso en modo offline.
//
// El backend valida dos reglas críticas que, sin conexión, no podemos consultar:
//   1. Placa duplicada  → no puede haber dos ingresos activos con la misma placa.
//   2. Compatibilidad y capacidad del espacio → tipo de vehículo y cupo disponible.
//
// Esta función construye un "estado virtual del parqueadero" combinando:
//   - ingresos_activos_cache : último estado confirmado por el servidor (≤50 activos)
//   - outbox_queue           : operaciones pendientes de sincronización
//
// Con ese estado virtual replica las mismas reglas del backend para evitar que
// dos vehículos reciban el mismo espacio, o que una placa se registre dos veces,
// mientras no hay internet. El backend sigue siendo la fuente de verdad; si por
// alguna razón el caché estaba desactualizado, el backend rechazará la operación
// durante la sincronización (la entrada quedará en la outbox como "muerta").

import { get } from 'idb-keyval'
import { OutboxEntry } from './outboxService'
import { IngresoVehiculoResponse } from './ingresoService'
import { IDB_KEYS, UbicacionRef, TipoVehiculoRef } from './refDataService'

// ─── Claves IDB (deben coincidir con IngresoProvider y outboxService) ─────────

const IDB_KEY_INGRESOS = 'ingresos_activos_cache'
const IDB_KEY_OUTBOX   = 'outbox_queue'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type OfflineValidationResult =
    | { valid: true }
    | { valid: false; mensaje: string }

interface VirtualIngreso {
    placa:          string   // normalizada: mayúsculas, sin espacios
    idUbicacion:    number
    idTipoVehiculo: number
}

// ─── Función principal ────────────────────────────────────────────────────────

/**
 * Valida de forma local (sin red) si un nuevo ingreso puede registrarse.
 *
 * Lee el caché IDB y la outbox para construir el estado virtual actual del
 * parqueadero y aplicar las mismas reglas de negocio que el backend:
 *
 *   · Placa duplicada           → rechaza si ya hay un ingreso activo o
 *                                  pendiente de sync con la misma placa.
 *   · Compatibilidad de espacio → rechaza si el tipo de vehículo no coincide
 *                                  con el tipo nativo del espacio.
 *   · Capacidad del espacio     → rechaza si el espacio ya está lleno según
 *                                  el estado virtual (caché + outbox).
 *
 * Si los datos de referencia no están en caché (primer uso sin haber hecho
 * login online), la función devuelve `valid: true` y deja que el backend
 * rechace en la sincronización — es el camino degradado mínimo.
 */
export async function validarIngresoOffline(request: {
    placa:          string
    idTipoVehiculo: number
    idUbicacion:    number
}): Promise<OfflineValidationResult> {

    // ── Leer todos los datos necesarios en paralelo ───────────────────────────
    const [cachedIngresos, outboxAll, ubicaciones, tiposVehiculo] = await Promise.all([
        get<IngresoVehiculoResponse[]>(IDB_KEY_INGRESOS),
        get<OutboxEntry[]>(IDB_KEY_OUTBOX),
        get<UbicacionRef[]>(IDB_KEYS.UBICACIONES),
        get<TipoVehiculoRef[]>(IDB_KEYS.TIPOS_VEHICULO),
    ])

    const activos: IngresoVehiculoResponse[] = (cachedIngresos ?? []).filter(
        i => i.estadoIngreso === 'INGRESADO'
    )
    const outbox: OutboxEntry[] = outboxAll ?? []

    // ── Construir estado virtual ──────────────────────────────────────────────

    // IDs de ingresos que ya tienen salida pendiente en la outbox → ya no ocupan espacio
    const salidasPendientes = new Set<number>(
        outbox
            .filter(e => e.type === 'SALIDA')
            .map(e => (e.payload as { idIngreso?: number }).idIngreso)
            .filter((id): id is number => typeof id === 'number')
    )

    // Estado del servidor menos los que ya tienen salida en camino
    const desdeServidor: VirtualIngreso[] = activos
        .filter(i => !salidasPendientes.has(i.idIngreso))
        .map(i => ({
            placa:          i.placa.toUpperCase().replace(/\s+/g, ''),
            idUbicacion:    i.idUbicacion,
            idTipoVehiculo: i.idTipoVehiculo,
        }))

    // Ingresos encolados offline que aún no llegaron al servidor
    const desdeOutbox: VirtualIngreso[] = outbox
        .filter(e => e.type === 'INGRESO')
        .map(e => ({
            placa:          ((e.payload.placa as string) ?? '').toUpperCase().replace(/\s+/g, ''),
            idUbicacion:    e.payload.idUbicacion  as number,
            idTipoVehiculo: e.payload.idTipoVehiculo as number,
        }))

    const virtual: VirtualIngreso[] = [...desdeServidor, ...desdeOutbox]

    const placaNorm = request.placa.toUpperCase().replace(/\s+/g, '')

    // ── Validación 1: placa duplicada ─────────────────────────────────────────
    const placaEnServidor = desdeServidor.some(v => v.placa === placaNorm)
    const placaEnOutbox   = desdeOutbox.some(v => v.placa === placaNorm)

    if (placaEnServidor || placaEnOutbox) {
        const origen = placaEnOutbox ? ' (pendiente de sincronización)' : ''
        return {
            valid:   false,
            mensaje: `La placa ${placaNorm} ya tiene un ingreso activo${origen}.`,
        }
    }

    // ── Validación 2: compatibilidad y capacidad del espacio ──────────────────
    // Si no hay datos de referencia en caché, no podemos validar esto.
    // Dejamos pasar y el backend lo rechazará durante la sync si es necesario.
    if (!ubicaciones || !tiposVehiculo) {
        return { valid: true }
    }

    const ubicacion = ubicaciones.find(u => u.id === request.idUbicacion)
    if (!ubicacion) {
        // Espacio no encontrado en caché — dejar pasar, backend validará
        return { valid: true }
    }

    const motoId  = tiposVehiculo.find(t => t.nombre.toUpperCase() === 'MOTO')?.id ?? -1
    const isMoto  = request.idTipoVehiculo === motoId
    const esMotoNativa = ubicacion.tipoVehiculoNativo.toUpperCase() === 'MOTO'

    const vehiculosEnSpot = virtual.filter(v => v.idUbicacion === request.idUbicacion)

    if (esMotoNativa) {
        // Espacio nativo para MOTO: solo 1 moto, nunca carros
        if (!isMoto) {
            return {
                valid:   false,
                mensaje: `El espacio "${ubicacion.nombre}" es exclusivo para motos.`,
            }
        }
        if (vehiculosEnSpot.length >= 1) {
            return {
                valid:   false,
                mensaje: `El espacio "${ubicacion.nombre}" ya está ocupado (máx. 1 moto).`,
            }
        }
    } else {
        // Espacio nativo para CARRO: 1 carro O hasta 4 motos (no mixto)
        const hayCarros  = vehiculosEnSpot.some(v => v.idTipoVehiculo !== motoId)
        const cantMotos  = vehiculosEnSpot.filter(v => v.idTipoVehiculo === motoId).length

        if (!isMoto) {
            // Intentando registrar un carro
            if (vehiculosEnSpot.length >= 1) {
                return {
                    valid:   false,
                    mensaje: `El espacio "${ubicacion.nombre}" ya está ocupado.`,
                }
            }
        } else {
            // Intentando registrar una moto en espacio de carro
            if (hayCarros) {
                return {
                    valid:   false,
                    mensaje: `El espacio "${ubicacion.nombre}" tiene un carro. No se puede registrar una moto allí.`,
                }
            }
            if (cantMotos >= 4) {
                return {
                    valid:   false,
                    mensaje: `El espacio "${ubicacion.nombre}" ya tiene el máximo de 4 motos permitidas.`,
                }
            }
        }
    }

    return { valid: true }
}

// src/contexts/SalidaContext.ts

import { createContext } from 'react'
import { IngresoDetalle, SalidaResponse } from '../services/salidaService'

export interface ToastSalidaState {
    message: string
    type: 'success' | 'error'
}

export type ModoBusqueda = 'qr' | 'manual'

export interface SalidaContextType {
    /** Modo activo: escaneo QR o búsqueda manual por placa */
    modoBusqueda: ModoBusqueda
    setModoBusqueda: (modo: ModoBusqueda) => void
    /** Ingreso encontrado pendiente de confirmar salida */
    ingresoEncontrado: IngresoDetalle | null
    /** Resultado de la salida confirmada (para mostrar el resumen de cobro) */
    salidaConfirmada: SalidaResponse | null
    /** true mientras se busca el ingreso */
    isBuscando: boolean
    /** true mientras se confirma la salida */
    isConfirmando: boolean
    /** HU-009: buscar por UUID público (leído del QR del tiquete) */
    buscarPorUuid: (uuid: string) => Promise<void>
    /** HU-010: buscar por placa (salida manual) */
    buscarPorPlaca: (placa: string) => Promise<void>
    /** HU-011: confirmar la salida del ingreso encontrado */
    confirmarSalida: () => Promise<void>
    /** Limpiar el estado para registrar una nueva salida */
    resetear: () => void
    toast: ToastSalidaState | null
    clearToast: () => void
}

export const SalidaContext = createContext<SalidaContextType | undefined>(undefined)
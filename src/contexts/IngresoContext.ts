// src/contexts/IngresoContext.ts

import { createContext } from 'react'
import { EditarIngresoRequest, IngresoVehiculoResponse, RegistrarIngresoRequest } from '../services/ingresoService'

export interface ToastState {
    message: string
    type: 'success' | 'error'
}

export interface IngresoContextType {
    /** Lista acumulada de registros (scroll infinito) */
    ingresos: IngresoVehiculoResponse[]
    /** Carga inicial — muestra skeleton de pantalla completa */
    isLoading: boolean
    /** Carga de página siguiente — muestra spinner al final */
    isLoadingMore: boolean
    /** true = hay más páginas disponibles */
    hasMore: boolean
    /** Total de registros que coinciden con el filtro */
    totalElements: number
    /** true = conectado al backend */
    isOnline: boolean
    /** Filtro activo por placa */
    filtroPlaca: string
    setFiltroPlaca: (placa: string) => void
    /** Filtro activo por fecha */
    filtroFecha: string
    setFiltroFecha: (fecha: string) => void
    /** Carga la siguiente página y la acumula */
    cargarMas: () => void
    /** Fuerza recarga completa desde página 0 */
    refrescar: () => void
    /** HU-019: eliminar registro (solo ADMINISTRADOR) */
    eliminarIngreso: (id: number) => Promise<void>
    /** true mientras se ejecuta la eliminación */
    isDeleting: boolean
    /** HU-020: editar registro */
    editarIngreso: (id: number, data: EditarIngresoRequest) => Promise<void>
    isEditing: boolean
    /** FASE 1: encola el ingreso en IndexedDB si no hay red */
    registrarIngresoConOutbox: (data: RegistrarIngresoRequest) => Promise<'online' | 'encolado'>
    /**
     * Set de idIngreso que tienen una SALIDA pendiente en la outbox.
     * Ingresos.tsx lo usa para mostrar el badge "Sincronización pendiente"
     * en la tarjeta correspondiente.
     */
    salidasPendientes: Set<number>
    /** Toast de feedback para mostrar en la vista */
    toast: ToastState | null
    clearToast: () => void
}

export const IngresoContext = createContext<IngresoContextType | undefined>(undefined)
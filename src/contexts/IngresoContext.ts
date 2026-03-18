// src/contexts/IngresoContext.ts
//
// Solo define la estructura del contexto (interfaz + createContext).
// Sin lógica, sin JSX, sin efectos secundarios.
// Actúa como contrato entre IngresoProvider y useIngresos.

import { createContext } from 'react'
import { IngresoVehiculoResponse } from '../services/ingresoService'

export interface IngresoContextType {
    /** Lista acumulada de registros (scroll infinito: se va creciendo) */
    ingresos: IngresoVehiculoResponse[]
    /** Carga inicial — muestra skeleton de pantalla completa */
    isLoading: boolean
    /** Carga de página siguiente — muestra spinner al final de la lista */
    isLoadingMore: boolean
    /** true = hay más páginas disponibles en el backend */
    hasMore: boolean
    /** Total de registros que coinciden con el filtro activo */
    totalElements: number
    /** true = conectado al backend, false = modo offline */
    isOnline: boolean
    /** Filtro activo por placa */
    filtroPlaca: string
    setFiltroPlaca: (placa: string) => void
    /** Carga la siguiente página y la acumula en la lista */
    cargarMas: () => void
    /** Fuerza recarga completa desde página 0 (SUB-4: al recuperar conexión) */
    refrescar: () => void
}

export const IngresoContext = createContext<IngresoContextType | undefined>(undefined)
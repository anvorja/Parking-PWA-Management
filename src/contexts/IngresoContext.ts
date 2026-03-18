// src/contexts/IngresoContext.ts

import { createContext } from 'react'
import { IngresoVehiculoResponse } from '../services/ingresoService'

export interface IngresoContextType {
    /** Registros de la página actual */
    ingresos: IngresoVehiculoResponse[]
    isLoading: boolean
    /** true = conectado al backend, false = modo offline */
    isOnline: boolean
    totalElements: number
    totalPages: number
    currentPage: number
    /** Filtro activo por placa */
    filtroPlaca: string
    setFiltroPlaca: (placa: string) => void
    /** Navega a una página específica */
    cargarPagina: (page: number) => void
    /** Fuerza recarga desde el backend (usado al recuperar conexión) */
    refrescar: () => void
}

export const IngresoContext = createContext<IngresoContextType | undefined>(undefined)
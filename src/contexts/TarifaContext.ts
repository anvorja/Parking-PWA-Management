// src/contexts/TarifaContext.ts

import { createContext } from 'react'
import { TarifaResponse, CrearTarifaRequest, EditarTarifaRequest } from '../services/tarifaService'

export interface ToastTarifaState {
    message: string
    type: 'success' | 'error'
}

export interface TarifaContextType {
    /** Tarifas activas cargadas del backend o del caché IDB */
    tarifas: TarifaResponse[]
    isLoading: boolean
    /** HU-013: solo ADMINISTRADOR */
    crear: (data: CrearTarifaRequest) => Promise<void>
    editar: (id: number, data: EditarTarifaRequest) => Promise<void>
    desactivar: (id: number) => Promise<void>
    isSaving: boolean
    toast: ToastTarifaState | null
    clearToast: () => void
}

export const TarifaContext = createContext<TarifaContextType | undefined>(undefined)
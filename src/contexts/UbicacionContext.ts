// src/contexts/UbicacionContext.ts
import { createContext } from 'react'
import { UbicacionResponse, CrearUbicacionRequest, EditarUbicacionRequest } from '../services/ubicacionService'

export interface ToastUbicacionState {
    message: string
    type: 'success' | 'error'
}

export interface UbicacionContextType {
    ubicaciones: UbicacionResponse[]
    isLoading: boolean
    /** HU-012 */
    crear: (data: CrearUbicacionRequest) => Promise<void>
    /** HU-015 */
    editar: (id: number, data: EditarUbicacionRequest) => Promise<void>
    /** HU-016 */
    desactivar: (id: number) => Promise<void>
    /** Reactivar */
    reactivar: (id: number) => Promise<void>
    isSaving: boolean
    toast: ToastUbicacionState | null
    clearToast: () => void
}

export const UbicacionContext = createContext<UbicacionContextType | undefined>(undefined)
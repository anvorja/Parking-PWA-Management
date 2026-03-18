// src/hooks/useUbicaciones.ts
import { useContext } from 'react'
import { UbicacionContext } from '../contexts/UbicacionContext'

export const useUbicaciones = () => {
    const context = useContext(UbicacionContext)
    if (context === undefined) {
        throw new Error('useUbicaciones debe ser usado dentro de un UbicacionProvider')
    }
    return context
}
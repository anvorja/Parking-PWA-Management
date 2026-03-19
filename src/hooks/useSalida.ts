// src/hooks/useSalida.ts
import { useContext } from 'react'
import { SalidaContext } from '../contexts/SalidaContext'

export const useSalida = () => {
    const context = useContext(SalidaContext)
    if (context === undefined) {
        throw new Error('useSalida debe ser usado dentro de un SalidaProvider')
    }
    return context
}
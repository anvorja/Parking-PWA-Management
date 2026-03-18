// src/hooks/useTarifas.ts
import { useContext } from 'react'
import { TarifaContext } from '../contexts/TarifaContext'

export const useTarifas = () => {
    const context = useContext(TarifaContext)
    if (context === undefined) {
        throw new Error('useTarifas debe ser usado dentro de un TarifaProvider')
    }
    return context
}
// src/hooks/useIngresos.ts

import { useContext } from 'react'
import { IngresoContext } from '../contexts/IngresoContext'

export const useIngresos = () => {
    const context = useContext(IngresoContext)
    if (context === undefined) {
        throw new Error('useIngresos debe ser usado dentro de un IngresoProvider')
    }
    return context
}
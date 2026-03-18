// src/hooks/useApp.ts

import { useContext } from 'react'
import { AppContext } from '../contexts/AppContext'

export const useApp = () => {
    const context = useContext(AppContext)
    if (context === undefined) {
        throw new Error('useApp debe ser usado dentro de un AppProvider')
    }
    return context
}
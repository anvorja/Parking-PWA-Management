// src/hooks/useUsuarios.ts

import { useContext } from 'react'
import { UsuarioContext } from '../contexts/UsuarioContext'

export const useUsuarios = () => {
    const context = useContext(UsuarioContext)
    if (context === undefined) {
        throw new Error('useUsuarios debe ser usado dentro de un UsuarioProvider')
    }
    return context
}
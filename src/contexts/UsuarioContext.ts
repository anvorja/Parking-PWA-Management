// src/contexts/UsuarioContext.ts

import { createContext } from 'react'
import { UsuarioListItemResponse, CrearUsuarioRequest, EditarUsuarioRequest } from '../services/usuarioService'

export interface ToastState {
    message: string
    type:    'success' | 'error'
}

export interface UsuarioContextType {
    /** Lista completa de usuarios del sistema */
    usuarios: UsuarioListItemResponse[]
    /** Lista filtrada por búsqueda y rol seleccionado */
    usuariosFiltrados: UsuarioListItemResponse[]
    /** true mientras se carga la lista inicial */
    isLoading: boolean
    /** true mientras se guarda (crear o editar) */
    isSubmitting: boolean
    /** true mientras se elimina */
    isDeleting: boolean

    /** Texto de búsqueda libre (nombre completo o nombre de usuario) */
    searchQuery: string
    setSearchQuery: (query: string) => void
    /** Filtro por rol: 'Todos' | 'ADMINISTRADOR' | 'AUXILIAR' */
    selectedRole: string
    setSelectedRole: (rol: string) => void

    /** Fuerza recarga desde el backend */
    refrescar: () => Promise<void>

    /** HU-003: Crear usuario */
    crearUsuario: (data: CrearUsuarioRequest) => Promise<void>
    /** HU-004: Editar usuario */
    editarUsuario: (id: number, data: EditarUsuarioRequest) => Promise<void>
    /** HU-005: Eliminar usuario */
    eliminarUsuario: (id: number) => Promise<void>

    /** Toast de feedback para la vista */
    toast: ToastState | null
    clearToast: () => void
}

export const UsuarioContext = createContext<UsuarioContextType | undefined>(undefined)
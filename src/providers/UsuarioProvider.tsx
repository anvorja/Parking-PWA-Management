// src/providers/UsuarioProvider.tsx
// HU-002: Listar usuarios
// HU-003: Crear usuario con validación de duplicados
// HU-004: Editar usuario (nombreUsuario inmutable, contraseña opcional)
// HU-005: Eliminar usuario (protección del usuario admin inicial en backend)

import React, { useState, useEffect, useCallback, useMemo, ReactNode } from 'react'
import { UsuarioContext, ToastState, UsuarioContextType } from '../contexts/UsuarioContext'
import {
    usuarioService,
    UsuarioListItemResponse,
    CrearUsuarioRequest,
    EditarUsuarioRequest,
} from '../services/usuarioService'

export const UsuarioProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [usuarios, setUsuarios]       = useState<UsuarioListItemResponse[]>([])
    const [isLoading, setIsLoading]     = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isDeleting, setIsDeleting]   = useState(false)
    const [toast, setToast]             = useState<ToastState | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedRole, setSelectedRole] = useState<string>('Todos')

    // Toast auto-dismiss
    useEffect(() => {
        if (!toast) return
        const t = setTimeout(() => setToast(null), 3000)
        return () => clearTimeout(t)
    }, [toast])

    const clearToast = useCallback(() => setToast(null), [])

    // ── Cargar lista desde el backend ─────────────────────────────────────────

    const refrescar = useCallback(async () => {
        setIsLoading(true)
        try {
            const data = await usuarioService.getUsuarios()
            setUsuarios(data)
        } catch (error) {
            console.error('[UsuarioProvider] Error cargando usuarios:', error)
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        void refrescar()
    }, [refrescar])

    // ── Lista filtrada (calculada, sin estado derivado) ───────────────────────
    // useMemo evita recalcular en cada render si usuarios/searchQuery/selectedRole
    // no cambiaron — equivalente al useEffect de filtrado que tenía Users.tsx.

    const usuariosFiltrados = useMemo(() => {
        let result = usuarios

        if (selectedRole !== 'Todos') {
            result = result.filter(u => u.rol === selectedRole)
        }

        if (searchQuery.trim() !== '') {
            const q = searchQuery.toLowerCase()
            result = result.filter(
                u =>
                    u.nombreCompleto.toLowerCase().includes(q) ||
                    u.nombreUsuario.toLowerCase().includes(q)
            )
        }

        return result
    }, [usuarios, searchQuery, selectedRole])

    // ── HU-003: Crear usuario ─────────────────────────────────────────────────

    const crearUsuario = useCallback(async (data: CrearUsuarioRequest): Promise<void> => {
        setIsSubmitting(true)
        try {
            await usuarioService.crearUsuario(data)
            setToast({ message: 'Usuario creado exitosamente', type: 'success' })
            await refrescar()
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Error al crear el usuario'
            setToast({ message: msg, type: 'error' })
            // Relanzar para que la vista pueda cerrar el modal solo en éxito
            throw error
        } finally {
            setIsSubmitting(false)
        }
    }, [refrescar])

    // ── HU-004: Editar usuario ────────────────────────────────────────────────

    const editarUsuario = useCallback(async (id: number, data: EditarUsuarioRequest): Promise<void> => {
        setIsSubmitting(true)
        try {
            await usuarioService.editarUsuario(id, data)
            setToast({ message: 'Usuario editado exitosamente', type: 'success' })
            await refrescar()
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Error al editar el usuario'
            setToast({ message: msg, type: 'error' })
            throw error
        } finally {
            setIsSubmitting(false)
        }
    }, [refrescar])

    // ── HU-005: Eliminar usuario ──────────────────────────────────────────────

    const eliminarUsuario = useCallback(async (id: number): Promise<void> => {
        setIsDeleting(true)
        try {
            await usuarioService.eliminarUsuario(id)
            setToast({ message: 'Usuario eliminado exitosamente', type: 'success' })
            await refrescar()
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Error al eliminar el usuario'
            setToast({ message: msg, type: 'error' })
            throw error
        } finally {
            setIsDeleting(false)
        }
    }, [refrescar])

    // ── Valor del contexto ────────────────────────────────────────────────────

    const value: UsuarioContextType = {
        usuarios,
        usuariosFiltrados,
        isLoading,
        isSubmitting,
        isDeleting,
        searchQuery,
        setSearchQuery,
        selectedRole,
        setSelectedRole,
        refrescar,
        crearUsuario,
        editarUsuario,
        eliminarUsuario,
        toast,
        clearToast,
    }

    return (
        <UsuarioContext.Provider value={value}>
            {children}
        </UsuarioContext.Provider>
    )
}
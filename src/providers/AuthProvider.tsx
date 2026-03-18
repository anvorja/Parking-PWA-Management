// src/providers/AuthProvider.tsx
//
// Componente proveedor: maneja estado (user, token, isLoading)
// y lógica de autenticación (login, logout, checkAuth).
// TASK-PWA-IDB: dispara syncToIndexedDB en fire-and-forget tras login exitoso.

import React, { useState, useEffect, ReactNode } from 'react'
import { AuthContext } from '../contexts/AuthContext'
import { authService, LoginRequest, LoginResponse, AuthenticatedUser } from '../services/authService'
import { refDataService } from '../services/refDataService'

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<AuthenticatedUser | null>(null)
    const [token, setToken] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState<boolean>(true)

    const checkAuth = async () => {
        try {
            const savedToken = await authService.getToken()
            const savedUser = await authService.getUser()

            if (savedToken && savedUser) {
                setToken(savedToken)
                setUser(savedUser)
            }
        } catch (error) {
            console.error('Error al obtener sesión offline:', error)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        checkAuth()
    }, [])

    const login = async (request: LoginRequest): Promise<LoginResponse> => {
        setIsLoading(true)
        try {
            const response = await authService.login(request)
            setToken(response.token)
            setUser(response.usuario)

            // TASK-PWA-IDB: Sincronizar datos de referencia en background.
            // Fire-and-forget: no bloquea la navegación al Home.
            refDataService.syncToIndexedDB().catch(console.warn)

            return response
        } finally {
            setIsLoading(false)
        }
    }

    const logout = async () => {
        setIsLoading(true)
        await authService.logout()
        setToken(null)
        setUser(null)
        setIsLoading(false)
    }

    return (
        <AuthContext.Provider value={{ user, token, isLoading, login, logout, checkAuth }}>
            {children}
        </AuthContext.Provider>
    )
}
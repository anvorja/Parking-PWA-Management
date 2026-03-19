// src/providers/AuthProvider.tsx

//   - Escucha el evento 'parking:session-expired' que authService despacha
//     cuando el refresh token expira o es inválido → redirige al login.
//   - logout() notifica al backend (revoca refresh token) antes de limpiar IDB.
//   - Expone isLoggingOut para que BottomNav deshabilite el botón durante el proceso.

import React, { useState, useEffect, useCallback, ReactNode } from 'react'
import { useHistory }   from 'react-router-dom'
import { AuthContext }  from '../contexts/AuthContext'
import {
    authService,
    LoginRequest,
    LoginResponse,
    AuthenticatedUser,
    SESSION_EXPIRED_EVENT,
} from '../services/authService'
import { refDataService } from '../services/refDataService'

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser]           = useState<AuthenticatedUser | null>(null)
    const [token, setToken]         = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isLoggingOut, setIsLoggingOut] = useState(false)

    const history = useHistory()

    // ── Restaurar sesión desde IDB al montar ──────────────────────────────────

    const checkAuth = useCallback(async () => {
        try {
            const savedToken = await authService.getToken()
            const savedUser  = await authService.getUser()
            if (savedToken && savedUser) {
                setToken(savedToken)
                setUser(savedUser)
            }
        } catch (error) {
            console.error('[AuthProvider] Error al obtener sesión offline:', error)
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        void checkAuth()
    }, [checkAuth])

    // ── Escuchar expiración de sesión por refresh token inválido ──────────────
    // authService.refreshAccessToken() despacha este evento cuando el backend
    // rechaza el refresh token (revocado o expirado).

    useEffect(() => {
        const handleSessionExpired = () => {
            setToken(null)
            setUser(null)
            history.replace('/login')
        }

        window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired)
        return () => {
            window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired)
        }
    }, [history])

    // ── Login ─────────────────────────────────────────────────────────────────

    const login = async (request: LoginRequest): Promise<LoginResponse> => {
        setIsLoading(true)
        try {
            const response = await authService.login(request)
            setToken(response.accessToken)
            setUser(response.usuario)

            // Cachear datos de referencia en background
            refDataService.syncToIndexedDB().catch(console.warn)

            return response
        } finally {
            setIsLoading(false)
        }
    }

    // ── Logout ────────────────────────────────────────────────────────────────
    // 1. Revoca el refresh token en el backend (best-effort, no bloquea si falla)
    // 2. Limpia el IDB local
    // 3. Limpia el estado React
    // 4. Redirige al login

    const logout = async () => {
        setIsLoggingOut(true)
        try {
            await authService.logout()
        } finally {
            setToken(null)
            setUser(null)
            setIsLoggingOut(false)
            history.replace('/login')
        }
    }

    return (
        <AuthContext.Provider value={{
            user,
            token,
            isLoading,
            isLoggingOut,
            login,
            logout,
            checkAuth,
        }}>
            {children}
        </AuthContext.Provider>
    )
}
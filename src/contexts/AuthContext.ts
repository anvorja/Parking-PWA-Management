// src/contexts/AuthContext.tsx

import { createContext } from 'react'
import { AuthenticatedUser, LoginRequest, LoginResponse } from '../services/authService'

export interface AuthContextType {
    user:         AuthenticatedUser | null
    token:        string | null
    isLoading:    boolean
    /** true mientras se ejecuta el logout (llama al backend + limpia IDB) */
    isLoggingOut: boolean
    login:        (request: LoginRequest) => Promise<LoginResponse>
    logout:       () => Promise<void>
    checkAuth:    () => Promise<void>
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

// src/contexts/AuthContext.tsx
//
// Solo define la estructura del contexto (interfaz + createContext).
// Sin lógica de negocio, sin JSX, sin efectos secundarios.
// Actúa como contrato entre AuthProvider y useAuth.

import { createContext } from 'react'
import { AuthenticatedUser, LoginRequest, LoginResponse } from '../services/authService'

export interface AuthContextType {
    user: AuthenticatedUser | null
    token: string | null
    isLoading: boolean
    login: (request: LoginRequest) => Promise<LoginResponse>
    logout: () => Promise<void>
    checkAuth: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)
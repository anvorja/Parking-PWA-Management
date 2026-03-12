import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService, AuthenticatedUser, LoginRequest, LoginResponse } from '../services/authService';

interface AuthContextType {
    user: AuthenticatedUser | null;
    token: string | null;
    isLoading: boolean;
    login: (request: LoginRequest) => Promise<LoginResponse>;
    logout: () => Promise<void>;
    checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<AuthenticatedUser | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    const checkAuth = async () => {
        try {
            const savedToken = await authService.getToken();
            const savedUser = await authService.getUser();

            if (savedToken && savedUser) {
                setToken(savedToken);
                setUser(savedUser);
            }
        } catch (error) {
            console.error("Error al obtener sesión offline:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        checkAuth();
    }, []);

    const login = async (request: LoginRequest) => {
        setIsLoading(true);
        try {
            const response = await authService.login(request);
            setToken(response.token);
            setUser(response.usuario);
            return response;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async () => {
        setIsLoading(true);
        await authService.logout();
        setToken(null);
        setUser(null);
        setIsLoading(false);
    };

    return (
        <AuthContext.Provider value={{ user, token, isLoading, login, logout, checkAuth }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth debe ser usado dentro de un AuthProvider');
    }
    return context;
};

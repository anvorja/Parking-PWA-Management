// src/hooks/useAuth.test.ts
import { renderHook } from '@testing-library/react'
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import React from 'react'
import { useAuth } from './useAuth'
import { AuthContext } from '../contexts/AuthContext'
import { makeAuthContextValue } from '../test/renderWithProviders'

// Silenciar los errores que React imprime cuando un hook lanza dentro de renderHook
let originalError: typeof console.error
beforeAll(() => { originalError = console.error; console.error = vi.fn() })
afterAll(()  => { console.error = originalError })

describe('useAuth', () => {
    it('lanza error cuando se usa fuera del AuthProvider', () => {
        expect(() => renderHook(() => useAuth())).toThrow(
            'useAuth debe ser usado dentro de un AuthProvider'
        )
    })

    it('devuelve el valor del contexto cuando está dentro del AuthProvider', () => {
        const value = makeAuthContextValue({ token: 'tok-123', isLoading: false })

        const wrapper = ({ children }: { children: React.ReactNode }) =>
            React.createElement(AuthContext.Provider, { value }, children)

        const { result } = renderHook(() => useAuth(), { wrapper })

        expect(result.current.token).toBe('tok-123')
        expect(result.current.isLoading).toBe(false)
        expect(typeof result.current.login).toBe('function')
        expect(typeof result.current.logout).toBe('function')
        expect(typeof result.current.checkAuth).toBe('function')
    })

    it('no dispara efectos secundarios ni llamadas adicionales al contexto por sí solo', () => {
        const value = makeAuthContextValue()

        const wrapper = ({ children }: { children: React.ReactNode }) =>
            React.createElement(AuthContext.Provider, { value }, children)

        renderHook(() => useAuth(), { wrapper })

        expect(value.checkAuth).not.toHaveBeenCalled()
        expect(value.login).not.toHaveBeenCalled()
        expect(value.logout).not.toHaveBeenCalled()
    })
})

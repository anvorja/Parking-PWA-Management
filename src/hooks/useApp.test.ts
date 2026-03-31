// src/hooks/useApp.test.ts
import { renderHook } from '@testing-library/react'
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import React from 'react'
import { useApp } from './useApp'
import { AppContext } from '../contexts/AppContext'
import { makeAppContextValue } from '../test/renderWithProviders'

let originalError: typeof console.error
beforeAll(() => { originalError = console.error; console.error = vi.fn() })
afterAll(()  => { console.error = originalError })

describe('useApp', () => {
    it('lanza error cuando se usa fuera del AppProvider', () => {
        expect(() => renderHook(() => useApp())).toThrow(
            'useApp debe ser usado dentro de un AppProvider'
        )
    })

    it('devuelve el valor del contexto cuando está dentro del AppProvider', () => {
        const value = makeAppContextValue({ isOnline: false, estadoRed: 'offline' })

        const wrapper = ({ children }: { children: React.ReactNode }) =>
            React.createElement(AppContext.Provider, { value }, children)

        const { result } = renderHook(() => useApp(), { wrapper })

        expect(result.current.isOnline).toBe(false)
        expect(result.current.estadoRed).toBe('offline')
        expect(result.current.pendientesOutbox).toBe(0)
        expect(typeof result.current.sincronizarAhora).toBe('function')
    })

    it('no dispara efectos secundarios ni llamadas adicionales al contexto por sí solo', () => {
        const value = makeAppContextValue()

        const wrapper = ({ children }: { children: React.ReactNode }) =>
            React.createElement(AppContext.Provider, { value }, children)

        renderHook(() => useApp(), { wrapper })

        expect(value.sincronizarAhora).not.toHaveBeenCalled()
    })
})

// src/hooks/useUbicaciones.test.ts
import { renderHook } from '@testing-library/react'
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import React from 'react'
import { useUbicaciones } from './useUbicaciones'
import { UbicacionContext, UbicacionContextType } from '../contexts/UbicacionContext'

let originalError: typeof console.error
beforeAll(() => { originalError = console.error; console.error = vi.fn() })
afterAll(()  => { console.error = originalError })

function makeUbicacionContextValue(overrides: Partial<UbicacionContextType> = {}): UbicacionContextType {
    return {
        ubicaciones: [],
        isLoading:   false,
        isSaving:    false,
        toast:       null,
        crear:       vi.fn().mockResolvedValue(undefined),
        editar:      vi.fn().mockResolvedValue(undefined),
        desactivar:  vi.fn().mockResolvedValue(undefined),
        clearToast:  vi.fn(),
        ...overrides,
    }
}

describe('useUbicaciones', () => {
    it('lanza error cuando se usa fuera del UbicacionProvider', () => {
        expect(() => renderHook(() => useUbicaciones())).toThrow(
            'useUbicaciones debe ser usado dentro de un UbicacionProvider'
        )
    })

    it('devuelve el valor del contexto cuando está dentro del UbicacionProvider', () => {
        const value = makeUbicacionContextValue({ isLoading: true })

        const wrapper = ({ children }: { children: React.ReactNode }) =>
            React.createElement(UbicacionContext.Provider, { value }, children)

        const { result } = renderHook(() => useUbicaciones(), { wrapper })

        expect(result.current.isLoading).toBe(true)
        expect(result.current.ubicaciones).toEqual([])
        expect(typeof result.current.crear).toBe('function')
        expect(typeof result.current.editar).toBe('function')
        expect(typeof result.current.desactivar).toBe('function')
    })

    it('no dispara efectos secundarios ni llamadas adicionales al contexto por sí solo', () => {
        const value = makeUbicacionContextValue()

        const wrapper = ({ children }: { children: React.ReactNode }) =>
            React.createElement(UbicacionContext.Provider, { value }, children)

        renderHook(() => useUbicaciones(), { wrapper })

        expect(value.crear).not.toHaveBeenCalled()
        expect(value.editar).not.toHaveBeenCalled()
        expect(value.desactivar).not.toHaveBeenCalled()
    })
})

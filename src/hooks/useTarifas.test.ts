// src/hooks/useTarifas.test.ts
import { renderHook } from '@testing-library/react'
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import React from 'react'
import { useTarifas } from './useTarifas'
import { TarifaContext, TarifaContextType } from '../contexts/TarifaContext'

let originalError: typeof console.error
beforeAll(() => { originalError = console.error; console.error = vi.fn() })
afterAll(()  => { console.error = originalError })

function makeTarifaContextValue(overrides: Partial<TarifaContextType> = {}): TarifaContextType {
    return {
        tarifas:    [],
        isLoading:  false,
        isSaving:   false,
        toast:      null,
        crear:      vi.fn().mockResolvedValue(undefined),
        editar:     vi.fn().mockResolvedValue(undefined),
        desactivar: vi.fn().mockResolvedValue(undefined),
        clearToast: vi.fn(),
        ...overrides,
    }
}

describe('useTarifas', () => {
    it('lanza error cuando se usa fuera del TarifaProvider', () => {
        expect(() => renderHook(() => useTarifas())).toThrow(
            'useTarifas debe ser usado dentro de un TarifaProvider'
        )
    })

    it('devuelve el valor del contexto cuando está dentro del TarifaProvider', () => {
        const value = makeTarifaContextValue({ isLoading: true })

        const wrapper = ({ children }: { children: React.ReactNode }) =>
            React.createElement(TarifaContext.Provider, { value }, children)

        const { result } = renderHook(() => useTarifas(), { wrapper })

        expect(result.current.isLoading).toBe(true)
        expect(result.current.tarifas).toEqual([])
        expect(typeof result.current.crear).toBe('function')
        expect(typeof result.current.editar).toBe('function')
        expect(typeof result.current.desactivar).toBe('function')
    })

    it('no dispara efectos secundarios ni llamadas adicionales al contexto por sí solo', () => {
        const value = makeTarifaContextValue()

        const wrapper = ({ children }: { children: React.ReactNode }) =>
            React.createElement(TarifaContext.Provider, { value }, children)

        renderHook(() => useTarifas(), { wrapper })

        expect(value.crear).not.toHaveBeenCalled()
        expect(value.editar).not.toHaveBeenCalled()
        expect(value.desactivar).not.toHaveBeenCalled()
    })
})

// src/hooks/useSalida.test.ts
import { renderHook } from '@testing-library/react'
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import React from 'react'
import { useSalida } from './useSalida'
import { SalidaContext, SalidaContextType } from '../contexts/SalidaContext'

let originalError: typeof console.error
beforeAll(() => { originalError = console.error; console.error = vi.fn() })
afterAll(()  => { console.error = originalError })

function makeSalidaContextValue(overrides: Partial<SalidaContextType> = {}): SalidaContextType {
    return {
        modoBusqueda:      'qr',
        setModoBusqueda:   vi.fn(),
        ingresoEncontrado: null,
        salidaConfirmada:  null,
        isBuscando:        false,
        isConfirmando:     false,
        buscarPorUuid:       vi.fn().mockResolvedValue(undefined),
        buscarPorPlaca:    vi.fn().mockResolvedValue(undefined),
        confirmarSalida:   vi.fn().mockResolvedValue(undefined),
        resetear:          vi.fn(),
        toast:             null,
        clearToast:        vi.fn(),
        ...overrides,
    }
}

describe('useSalida', () => {
    it('lanza error cuando se usa fuera del SalidaProvider', () => {
        expect(() => renderHook(() => useSalida())).toThrow(
            'useSalida debe ser usado dentro de un SalidaProvider'
        )
    })

    it('devuelve el valor del contexto cuando está dentro del SalidaProvider', () => {
        const value = makeSalidaContextValue({ modoBusqueda: 'manual', isBuscando: true })

        const wrapper = ({ children }: { children: React.ReactNode }) =>
            React.createElement(SalidaContext.Provider, { value }, children)

        const { result } = renderHook(() => useSalida(), { wrapper })

        expect(result.current.modoBusqueda).toBe('manual')
        expect(result.current.isBuscando).toBe(true)
        expect(result.current.ingresoEncontrado).toBeNull()
        expect(typeof result.current.buscarPorId).toBe('function')
        expect(typeof result.current.buscarPorPlaca).toBe('function')
        expect(typeof result.current.confirmarSalida).toBe('function')
    })

    it('no dispara efectos secundarios ni llamadas adicionales al contexto por sí solo', () => {
        const value = makeSalidaContextValue()

        const wrapper = ({ children }: { children: React.ReactNode }) =>
            React.createElement(SalidaContext.Provider, { value }, children)

        renderHook(() => useSalida(), { wrapper })

        expect(value.buscarPorId).not.toHaveBeenCalled()
        expect(value.buscarPorPlaca).not.toHaveBeenCalled()
        expect(value.confirmarSalida).not.toHaveBeenCalled()
        expect(value.resetear).not.toHaveBeenCalled()
    })
})

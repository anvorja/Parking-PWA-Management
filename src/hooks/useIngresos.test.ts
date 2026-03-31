// src/hooks/useIngresos.test.ts
import { renderHook } from '@testing-library/react'
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import React from 'react'
import { useIngresos } from './useIngresos'
import { IngresoContext } from '../contexts/IngresoContext'
import { makeIngresoContextValue } from '../test/renderWithProviders'
import { makeIngreso } from '../test/mocks/factories'

let originalError: typeof console.error
beforeAll(() => { originalError = console.error; console.error = vi.fn() })
afterAll(()  => { console.error = originalError })

describe('useIngresos', () => {
    it('lanza error cuando se usa fuera del IngresoProvider', () => {
        expect(() => renderHook(() => useIngresos())).toThrow(
            'useIngresos debe ser usado dentro de un IngresoProvider'
        )
    })

    it('devuelve el valor del contexto cuando está dentro del IngresoProvider', () => {
        const ingresos = [makeIngreso({ idIngreso: 1 }), makeIngreso({ idIngreso: 2 })]
        const value = makeIngresoContextValue({ ingresos, totalElements: 2, isLoading: false })

        const wrapper = ({ children }: { children: React.ReactNode }) =>
            React.createElement(IngresoContext.Provider, { value }, children)

        const { result } = renderHook(() => useIngresos(), { wrapper })

        expect(result.current.ingresos).toHaveLength(2)
        expect(result.current.totalElements).toBe(2)
        expect(result.current.isLoading).toBe(false)
        expect(typeof result.current.eliminarIngreso).toBe('function')
        expect(typeof result.current.editarIngreso).toBe('function')
        expect(typeof result.current.registrarIngresoConOutbox).toBe('function')
    })

    it('no dispara efectos secundarios ni llamadas adicionales al contexto por sí solo', () => {
        const value = makeIngresoContextValue()

        const wrapper = ({ children }: { children: React.ReactNode }) =>
            React.createElement(IngresoContext.Provider, { value }, children)

        renderHook(() => useIngresos(), { wrapper })

        expect(value.eliminarIngreso).not.toHaveBeenCalled()
        expect(value.editarIngreso).not.toHaveBeenCalled()
        expect(value.registrarIngresoConOutbox).not.toHaveBeenCalled()
        expect(value.cargarMas).not.toHaveBeenCalled()
        expect(value.refrescar).not.toHaveBeenCalled()
    })
})

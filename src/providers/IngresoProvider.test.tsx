// src/providers/IngresoProvider.test.tsx
import React from 'react'
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { IngresoProvider } from './IngresoProvider'
import { AppContext } from '../contexts/AppContext'
import { useIngresos } from '../hooks/useIngresos'
import { makeAppContextValue } from '../test/renderWithProviders'
import { makeIngreso, makeIngresoRequest } from '../test/mocks/factories'
import { SYNC_COMPLETE_EVENT } from './AppProvider'

// ─── Mocks de módulos ─────────────────────────────────────────────────────────

vi.mock('../services/ingresoService', () => ({
    ingresoService: {
        registrarIngreso: vi.fn(),
        listarIngresos:   vi.fn(),
        eliminarIngreso:  vi.fn(),
        editarIngreso:    vi.fn(),
        getUbicaciones:   vi.fn().mockResolvedValue([]),
        getTiposVehiculo: vi.fn().mockResolvedValue([]),
    },
}))

vi.mock('../services/outboxService', () => ({
    outboxService: {
        getAll:        vi.fn().mockResolvedValue([]),
        getPendientes: vi.fn().mockResolvedValue([]),
        getMuertas:    vi.fn().mockResolvedValue([]),
        count:         vi.fn().mockResolvedValue(0),
        enqueue:       vi.fn().mockResolvedValue({ id: 'mock-id', type: 'INGRESO', payload: {}, createdAt: Date.now(), retries: 0 }),
        remove:        vi.fn().mockResolvedValue(undefined),
        clear:         vi.fn().mockResolvedValue(undefined),
    },
    MAX_RETRIES: 3,
    ORDEN_TIPO:  { INGRESO: 0, INGRESO_EDITAR: 1, SALIDA: 2 },
}))

import { ingresoService } from '../services/ingresoService'
import { outboxService }  from '../services/outboxService'

const mockIngreso = vi.mocked(ingresoService)
const mockOutbox  = vi.mocked(outboxService)

// ─── Componente consumidor ────────────────────────────────────────────────────

function IngresoConsumer() {
    const {
        ingresos, isLoading, toast,
        eliminarIngreso, editarIngreso, registrarIngresoConOutbox,
    } = useIngresos()

    return (
        <div>
            <span data-testid="count">{ingresos.length}</span>
            <span data-testid="isLoading">{String(isLoading)}</span>
            <span data-testid="toast-msg">{toast?.message ?? ''}</span>
            <span data-testid="toast-type">{toast?.type ?? ''}</span>
            {ingresos.map(i => (
                <div key={i.idIngreso} data-testid={`ingreso-${i.idIngreso}`}>
                    {i.placa}
                </div>
            ))}
            <button onClick={() => eliminarIngreso(1)}>Eliminar</button>
            <button onClick={() => editarIngreso(1, { placa: 'NEW001' })}>Editar</button>
            <button onClick={async () => {
                const r = await registrarIngresoConOutbox(makeIngresoRequest())
                document.getElementById('resultado')!.textContent = r
            }}>Registrar</button>
            <span id="resultado"></span>
        </div>
    )
}

function renderIngresoProvider(isOnline: boolean = true) {
    return render(
        <AppContext.Provider value={makeAppContextValue({ isOnline })}>
            <IngresoProvider>
                <IngresoConsumer />
            </IngresoProvider>
        </AppContext.Provider>
    )
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('IngresoProvider', () => {

    beforeEach(() => {
        vi.clearAllMocks()
        mockOutbox.getAll.mockResolvedValue([])
        mockOutbox.getPendientes.mockResolvedValue([])
        mockOutbox.getMuertas.mockResolvedValue([])
        mockOutbox.count.mockResolvedValue(0)
        mockOutbox.enqueue.mockResolvedValue({
            id: 'mock-id', type: 'INGRESO', payload: {}, createdAt: Date.now(), retries: 0,
        })
    })

    // ── 2.3.1 — Carga desde backend cuando isOnline ───────────────────────────

    it('carga ingresos desde el backend cuando isOnline = true', async () => {
        const ingresos = [makeIngreso({ idIngreso: 1 }), makeIngreso({ idIngreso: 2 })]
        mockIngreso.listarIngresos.mockResolvedValue({
            content: ingresos, page: 0, size: 20, totalElements: 2, totalPages: 1,
        })

        renderIngresoProvider(true)

        await waitFor(() => {
            expect(mockIngreso.listarIngresos).toHaveBeenCalledTimes(1)
            expect(screen.getByTestId('count').textContent).toBe('2')
        })
    })

    // ── 2.3.2 — Carga desde IDB cuando offline ────────────────────────────────

    it('carga ingresos desde IDB cuando isOnline = false', async () => {
        // idb-keyval.get mockeado globalmente en setupTests — devuelve undefined por defecto
        // Simular que hay datos en caché importando el mock de idb-keyval
        const idbModule = await import('idb-keyval')
        vi.mocked(idbModule.get).mockResolvedValueOnce([makeIngreso({ idIngreso: 99, placa: 'CACHE01' })])

        renderIngresoProvider(false)

        await waitFor(() => {
            expect(mockIngreso.listarIngresos).not.toHaveBeenCalled()
            expect(screen.getByTestId('count').textContent).toBe('1')
            expect(screen.getByTestId('ingreso-99').textContent).toBe('CACHE01')
        })
    })

    // ── 2.3.3 — eliminarIngreso offline ──────────────────────────────────────

    it('eliminarIngreso() offline muestra toast de error y NO llama al servicio', async () => {
        mockIngreso.listarIngresos.mockResolvedValue({
            content: [], page: 0, size: 20, totalElements: 0, totalPages: 0,
        })

        renderIngresoProvider(false)

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }))
        })

        await waitFor(() => {
            expect(mockIngreso.eliminarIngreso).not.toHaveBeenCalled()
            expect(screen.getByTestId('toast-type').textContent).toBe('error')
            expect(screen.getByTestId('toast-msg').textContent).toContain('Sin conexión')
        })
    })

    // ── 2.3.4 — eliminarIngreso online ───────────────────────────────────────

    it('eliminarIngreso() online llama al servicio y remueve el ingreso de la lista', async () => {
        const ingresos = [makeIngreso({ idIngreso: 1 })]
        mockIngreso.listarIngresos.mockResolvedValue({
            content: ingresos, page: 0, size: 20, totalElements: 1, totalPages: 1,
        })
        mockIngreso.eliminarIngreso.mockResolvedValue(undefined)

        renderIngresoProvider(true)
        await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('1'))

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }))
        })

        await waitFor(() => {
            expect(mockIngreso.eliminarIngreso).toHaveBeenCalledWith(1)
            expect(screen.getByTestId('count').textContent).toBe('0')
            expect(screen.getByTestId('toast-type').textContent).toBe('success')
        })
    })

    // ── 2.3.5 — editarIngreso online ─────────────────────────────────────────

    it('editarIngreso() online llama al backend y actualiza la lista', async () => {
        const original  = makeIngreso({ idIngreso: 1, placa: 'OLD001' })
        const actualizado = makeIngreso({ idIngreso: 1, placa: 'NEW001' })
        mockIngreso.listarIngresos.mockResolvedValue({
            content: [original], page: 0, size: 20, totalElements: 1, totalPages: 1,
        })
        mockIngreso.editarIngreso.mockResolvedValue(actualizado)

        renderIngresoProvider(true)
        await waitFor(() => expect(screen.getByTestId('ingreso-1').textContent).toBe('OLD001'))

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Editar' }))
        })

        await waitFor(() => {
            expect(mockIngreso.editarIngreso).toHaveBeenCalledWith(1, { placa: 'NEW001' })
            expect(screen.getByTestId('ingreso-1').textContent).toBe('NEW001')
            expect(screen.getByTestId('toast-type').textContent).toBe('success')
        })
    })

    // ── 2.3.6 — editarIngreso offline ────────────────────────────────────────

    it('editarIngreso() offline encola en outbox y aplica optimistic update', async () => {
        const idbModule = await import('idb-keyval')
        const original  = makeIngreso({ idIngreso: 1, placa: 'OLD001' })

        mockIngreso.listarIngresos.mockResolvedValue({
            content: [original], page: 0, size: 20, totalElements: 1, totalPages: 1,
        })
        // idb-keyval.get devuelve la lista para el optimistic update
        vi.mocked(idbModule.get).mockResolvedValue([original])
        vi.mocked(idbModule.set).mockResolvedValue(undefined)

        // Render online primero para cargar la lista, luego test en offline
        const { rerender } = render(
            <AppContext.Provider value={makeAppContextValue({ isOnline: true })}>
                <IngresoProvider>
                    <IngresoConsumer />
                </IngresoProvider>
            </AppContext.Provider>
        )

        await waitFor(() => expect(screen.getByTestId('ingreso-1').textContent).toBe('OLD001'))

        rerender(
            <AppContext.Provider value={makeAppContextValue({ isOnline: false })}>
                <IngresoProvider>
                    <IngresoConsumer />
                </IngresoProvider>
            </AppContext.Provider>
        )

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Editar' }))
        })

        await waitFor(() => {
            expect(mockOutbox.enqueue).toHaveBeenCalledWith('INGRESO_EDITAR', expect.objectContaining({ id: 1, placa: 'NEW001' }))
            expect(screen.getByTestId('toast-type').textContent).toBe('success')
        })
    })

    // ── 2.3.7 — registrarIngresoConOutbox online ──────────────────────────────

    it('registrarIngresoConOutbox() online retorna "online"', async () => {
        mockIngreso.listarIngresos.mockResolvedValue({
            content: [], page: 0, size: 20, totalElements: 0, totalPages: 0,
        })

        renderIngresoProvider(true)
        await waitFor(() => expect(screen.getByTestId('isLoading').textContent).toBe('false'))

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Registrar' }))
        })

        await waitFor(() => {
            expect(document.getElementById('resultado')?.textContent).toBe('online')
        })
        expect(mockOutbox.enqueue).not.toHaveBeenCalled()
    })

    // ── 2.3.8 — registrarIngresoConOutbox offline ─────────────────────────────

    it('registrarIngresoConOutbox() offline encola en outbox y retorna "encolado"', async () => {
        renderIngresoProvider(false)

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Registrar' }))
        })

        await waitFor(() => {
            expect(mockOutbox.enqueue).toHaveBeenCalledWith('INGRESO', expect.any(Object))
            expect(document.getElementById('resultado')?.textContent).toBe('encolado')
        })
    })

    // ── 2.3.9 — sync-complete recarga backend ─────────────────────────────────

    it('parking:sync-complete con exitosas > 0 dispara recarga del backend', async () => {
        mockIngreso.listarIngresos.mockResolvedValue({
            content: [], page: 0, size: 20, totalElements: 0, totalPages: 0,
        })

        renderIngresoProvider(true)
        await waitFor(() => expect(mockIngreso.listarIngresos).toHaveBeenCalledTimes(1))

        act(() => {
            window.dispatchEvent(
                new CustomEvent(SYNC_COMPLETE_EVENT, { detail: { exitosas: 2, procesadas: 2, fallidas: 0, muertas: 0 } })
            )
        })

        await waitFor(() => {
            expect(mockIngreso.listarIngresos).toHaveBeenCalledTimes(2)
        })
    })
})

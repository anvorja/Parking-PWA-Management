// src/providers/AppProvider.test.tsx
import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AppProvider } from './AppProvider'
import { useApp } from '../hooks/useApp'

// ─── Mocks de módulos ─────────────────────────────────────────────────────────

vi.mock('../services/outboxService', () => ({
    outboxService: {
        getAll:        vi.fn().mockResolvedValue([]),
        getPendientes: vi.fn().mockResolvedValue([]),
        getMuertas:    vi.fn().mockResolvedValue([]),
        count:         vi.fn().mockResolvedValue(0),
        enqueue:       vi.fn().mockResolvedValue({}),
        remove:        vi.fn().mockResolvedValue(undefined),
        clear:         vi.fn().mockResolvedValue(undefined),
    },
    MAX_RETRIES: 3,
    ORDEN_TIPO:  {},
}))

vi.mock('../services/syncService', () => ({
    syncService: {
        procesarOutbox:  vi.fn().mockResolvedValue({ procesadas: 0, exitosas: 0, fallidas: 0, muertas: 0 }),
        isSincronizando: vi.fn().mockReturnValue(false),
    },
}))

import { outboxService, OutboxEntry } from '../services/outboxService'
import { syncService }               from '../services/syncService'

const mockOutbox = vi.mocked(outboxService)
const mockSync   = vi.mocked(syncService)

// ─── Componente consumidor ────────────────────────────────────────────────────

function AppConsumer() {
    const { isOnline, estadoRed, pendientesOutbox, muertasOutbox, isSincronizando, sincronizarAhora } = useApp()
    return (
        <div>
            <span data-testid="isOnline">{String(isOnline)}</span>
            <span data-testid="estadoRed">{estadoRed}</span>
            <span data-testid="pendientes">{pendientesOutbox}</span>
            <span data-testid="muertas">{muertasOutbox}</span>
            <span data-testid="sincronizando">{String(isSincronizando)}</span>
            <button onClick={() => sincronizarAhora()}>Sincronizar</button>
        </div>
    )
}

function renderAppProvider() {
    return render(
        <AppProvider>
            <AppConsumer />
        </AppProvider>
    )
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AppProvider', () => {

    beforeEach(() => {
        vi.clearAllMocks()
        vi.useFakeTimers({ shouldAdvanceTime: true })

        // fetch devuelve OK por defecto (backend alcanzable)
        vi.mocked(global.fetch).mockResolvedValue(new Response('ok', { status: 200 }))

        // outbox vacía por defecto
        mockOutbox.count.mockResolvedValue(0)
        mockOutbox.getMuertas.mockResolvedValue([])
        mockOutbox.getPendientes.mockResolvedValue([])
        mockSync.isSincronizando.mockReturnValue(false)

        // navigator.onLine = true por defecto
        Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    // ── 2.2.1 ─────────────────────────────────────────────────────────────────

    it('estado inicial refleja navigator.onLine = true', async () => {
        renderAppProvider()

        await waitFor(() => {
            expect(screen.getByTestId('isOnline').textContent).toBe('true')
        })
    })

    it('estado inicial refleja navigator.onLine = false', async () => {
        Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })

        renderAppProvider()

        await waitFor(() => {
            expect(screen.getByTestId('isOnline').textContent).toBe('false')
        })
    })

    // ── 2.2.2 ─────────────────────────────────────────────────────────────────

    it('escucha el evento offline del window y actualiza isOnline a false', async () => {
        renderAppProvider()
        await waitFor(() => expect(screen.getByTestId('isOnline').textContent).toBe('true'))

        act(() => {
            window.dispatchEvent(new Event('offline'))
        })

        await waitFor(() => {
            expect(screen.getByTestId('isOnline').textContent).toBe('false')
            expect(screen.getByTestId('estadoRed').textContent).toBe('offline')
        })
    })

    it('escucha el evento online del window y actualiza isOnline a true', async () => {
        Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })
        vi.mocked(global.fetch).mockRejectedValue(new Error('no network'))

        renderAppProvider()
        await waitFor(() => expect(screen.getByTestId('isOnline').textContent).toBe('false'))

        vi.mocked(global.fetch).mockResolvedValue(new Response('ok', { status: 200 }))

        act(() => {
            window.dispatchEvent(new Event('online'))
        })

        await waitFor(() => {
            expect(screen.getByTestId('isOnline').textContent).toBe('true')
        })
    })

    // ── 2.2.3 ─────────────────────────────────────────────────────────────────

    it('checkBackendReachable: fetch OK setea isOnline = true', async () => {
        vi.mocked(global.fetch).mockResolvedValue(new Response('ok', { status: 200 }))
        renderAppProvider()

        await waitFor(() => {
            expect(screen.getByTestId('isOnline').textContent).toBe('true')
        })

        expect(global.fetch).toHaveBeenCalled()
    })

    it('checkBackendReachable: fetch falla (backend no alcanzable) setea isOnline = false', async () => {
        vi.mocked(global.fetch).mockRejectedValue(new Error('network error'))
        renderAppProvider()

        await waitFor(() => {
            expect(screen.getByTestId('isOnline').textContent).toBe('false')
            expect(screen.getByTestId('estadoRed').textContent).toBe('offline')
        })
    })

    // ── 2.2.4 ─────────────────────────────────────────────────────────────────

    it('actualizarContadores() consulta outboxService.count() y getMuertas() al montar', async () => {
        mockOutbox.count.mockResolvedValue(3)
        mockOutbox.getMuertas.mockResolvedValue([
            { id: '1', type: 'INGRESO', payload: {}, createdAt: 0, retries: 3 },
            { id: '2', type: 'INGRESO', payload: {}, createdAt: 0, retries: 3 },
        ] as OutboxEntry[])

        renderAppProvider()

        await waitFor(() => {
            expect(screen.getByTestId('pendientes').textContent).toBe('3')
            expect(screen.getByTestId('muertas').textContent).toBe('2')
        })
    })

    // ── 2.2.5 ─────────────────────────────────────────────────────────────────

    it('estadoRed = offline cuando !isOnline', async () => {
        vi.mocked(global.fetch).mockRejectedValue(new Error('no network'))
        renderAppProvider()

        await waitFor(() => {
            expect(screen.getByTestId('estadoRed').textContent).toBe('offline')
        })
    })

    it('estadoRed = error_sync cuando hay entradas muertas y está online', async () => {
        vi.mocked(global.fetch).mockResolvedValue(new Response('ok', { status: 200 }))
        mockOutbox.getMuertas.mockResolvedValue([
            { id: 'dead-1', type: 'INGRESO', payload: {}, createdAt: 0, retries: 3 },
        ] as OutboxEntry[])
        mockOutbox.count.mockResolvedValue(1)

        renderAppProvider()

        await waitFor(() => {
            expect(screen.getByTestId('estadoRed').textContent).toBe('error_sync')
        })
    })

    it('estadoRed = online cuando hay conexión y outbox vacía', async () => {
        vi.mocked(global.fetch).mockResolvedValue(new Response('ok', { status: 200 }))
        mockOutbox.getMuertas.mockResolvedValue([])
        mockOutbox.count.mockResolvedValue(0)

        renderAppProvider()

        await waitFor(() => {
            expect(screen.getByTestId('estadoRed').textContent).toBe('online')
        })
    })

    // ── 2.2.6 ─────────────────────────────────────────────────────────────────

    it('sincronizarAhora() no hace nada si !isOnline', async () => {
        vi.mocked(global.fetch).mockRejectedValue(new Error('no network'))

        renderAppProvider()
        await waitFor(() => expect(screen.getByTestId('isOnline').textContent).toBe('false'))

        await act(async () => {
            screen.getByRole('button', { name: 'Sincronizar' }).click()
        })

        expect(mockSync.procesarOutbox).not.toHaveBeenCalled()
    })

    // ── 2.2.7 — Sync automático al volver online ──────────────────────────────

    it('al recuperar conexión (evento online) dispara ejecutarSync() inmediatamente', async () => {
        // Empezar offline
        Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })
        vi.mocked(global.fetch).mockRejectedValue(new Error('no network'))

        mockOutbox.getPendientes.mockResolvedValue([
            { id: '1', type: 'INGRESO', payload: {}, createdAt: 0, retries: 0 } as OutboxEntry,
        ])
        mockSync.procesarOutbox.mockResolvedValue({ procesadas: 1, exitosas: 1, fallidas: 0, muertas: 0 })

        renderAppProvider()
        await waitFor(() => expect(screen.getByTestId('isOnline').textContent).toBe('false'))

        // Volver online
        vi.mocked(global.fetch).mockResolvedValue(new Response('ok', { status: 200 }))

        act(() => {
            window.dispatchEvent(new Event('online'))
        })

        await waitFor(() => {
            expect(mockOutbox.getPendientes).toHaveBeenCalled()
            expect(mockSync.procesarOutbox).toHaveBeenCalled()
        })
    })

    // ── 2.2.8 — Estado sincronizando ──────────────────────────────────────────

    it('estadoRed = sincronizando e isSincronizando = true mientras ejecutarSync está en curso', async () => {
        mockOutbox.getPendientes.mockResolvedValue([
            { id: '1', type: 'INGRESO', payload: {}, createdAt: 0, retries: 0 } as OutboxEntry,
        ])

        let resolveProcesar!: (val: unknown) => void
        mockSync.procesarOutbox.mockReturnValue(
            new Promise(res => { resolveProcesar = res })
        )

        renderAppProvider()
        await waitFor(() => expect(screen.getByTestId('isOnline').textContent).toBe('true'))

        // Disparar sync manual
        act(() => {
            screen.getByRole('button', { name: 'Sincronizar' }).click()
        })

        // Mientras procesarOutbox no resuelve, isSincronizando debe ser true
        await waitFor(() => {
            expect(screen.getByTestId('sincronizando').textContent).toBe('true')
            expect(screen.getByTestId('estadoRed').textContent).toBe('sincronizando')
        })

        // Resolver sync — el estado debe volver a false
        await act(async () => {
            resolveProcesar({ procesadas: 1, exitosas: 1, fallidas: 0, muertas: 0 })
        })

        await waitFor(() => {
            expect(screen.getByTestId('sincronizando').textContent).toBe('false')
        })
    })
})

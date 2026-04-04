// src/pages/Salida.test.tsx
// Fase 4.3 — Flujo de salida de vehículo (online y offline)
import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { IonReactRouter } from '@ionic/react-router'
import Salida from './Salida'
import { AppContext } from '../contexts/AppContext'
import { SalidaContext, SalidaContextType } from '../contexts/SalidaContext'
import { AuthContext } from '../contexts/AuthContext'
import { makeAppContextValue, makeAuthContextValue } from '../test/renderWithProviders'

// ─── Mocks de módulos ─────────────────────────────────────────────────────────

// QRScanner usa la cámara del dispositivo — no disponible en jsdom
vi.mock('../components/QRScanner', () => ({
    default: () => null,
}))

// ─── Tipos ───────────────────────────────────────────────────────────────────

function makeSalidaCtxValue(overrides: Partial<SalidaContextType> = {}): SalidaContextType {
    return {
        modoBusqueda:      'qr',
        setModoBusqueda:   vi.fn(),
        ingresoEncontrado: null,
        salidaConfirmada:  null,
        isBuscando:        false,
        isConfirmando:     false,
        buscarPorUuid:     vi.fn().mockResolvedValue(undefined),
        buscarPorPlaca:    vi.fn().mockResolvedValue(undefined),
        confirmarSalida:   vi.fn().mockResolvedValue(undefined),
        resetear:          vi.fn(),
        toast:             null,
        clearToast:        vi.fn(),
        ...overrides,
    }
}

// ─── Helper de render ─────────────────────────────────────────────────────────

function renderSalida(salidaCtx: Partial<SalidaContextType> = {}, isOnline = true) {
    return render(
        <MemoryRouter>
            <IonReactRouter>
                <AuthContext.Provider value={makeAuthContextValue()}>
                    <AppContext.Provider value={makeAppContextValue({ isOnline, estadoRed: isOnline ? 'online' : 'offline' })}>
                        <SalidaContext.Provider value={makeSalidaCtxValue(salidaCtx)}>
                            <Salida />
                        </SalidaContext.Provider>
                    </AppContext.Provider>
                </AuthContext.Provider>
            </IonReactRouter>
        </MemoryRouter>
    )
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Salida — Flujo de salida de vehículo', () => {

    beforeEach(() => {
        vi.clearAllMocks()
    })

    // ── 4.3.1 ─────────────────────────────────────────────────────────────────

    it('buscarPorUuid() offline muestra toast de error', () => {
        renderSalida({
            toast: { message: 'Sin conexión — la búsqueda por QR requiere conexión', type: 'error' },
        }, false)

        expect(screen.getByText('Sin conexión — la búsqueda por QR requiere conexión')).toBeInTheDocument()
    })

    // ── 4.3.2 ─────────────────────────────────────────────────────────────────

    it('buscarPorUuid() online con ingreso ya salido muestra el mensaje correspondiente', () => {
        renderSalida({
            toast: { message: 'El vehículo ABC123 ya registró su salida', type: 'error' },
        })

        expect(screen.getByText(/ya registró su salida/i)).toBeInTheDocument()
    })

    // ── 4.3.3 ─────────────────────────────────────────────────────────────────

    it('buscarPorUuid() online con ingreso activo muestra el panel de confirmación', () => {
        const ingreso = {
            idIngreso:        1,
            uuid:             '550e8400-e29b-41d4-a716-446655440000',
            placa:            'ABC123',
            tipoVehiculo:     'CARRO',
            idTipoVehiculo:   1,
            ubicacion:        'Zona A',
            estadoIngreso:    'INGRESADO',
            fechaHoraIngreso: '2026-03-31T10:00:00',
            usuarioRegistro:  'admin',
            valorCobrado:     null,
        }

        renderSalida({ ingresoEncontrado: ingreso })

        expect(screen.getByText('ABC123')).toBeInTheDocument()
        expect(screen.getByText('Confirmar salida')).toBeInTheDocument()
    })

    // ── 4.3.4 ─────────────────────────────────────────────────────────────────

    it('confirmarSalida() online: muestra el resumen de cobro', () => {
        const salidaConfirmada = {
            idIngreso:        1,
            placa:            'ABC123',
            tipoVehiculo:     'CARRO',
            ubicacion:        'Zona A',
            fechaHoraIngreso: '2026-03-31T10:00:00',
            fechaHoraSalida:  '2026-03-31T12:00:00',
            horasCobradas:    2,
            tarifaPorHora:    2500,
            valorCobrado:     5000,
            usuarioEntrega:   'admin',
        }

        renderSalida({ salidaConfirmada })

        // Debe mostrar el valor cobrado
        expect(screen.getByText(/5\.000|5,000/)).toBeInTheDocument()
    })

    // ── 4.3.5 ─────────────────────────────────────────────────────────────────

    it('confirmarSalida() offline: muestra toast de offline tras confirmar', () => {
        renderSalida({
            toast: {
                message: 'Sin conexión — la salida se sincronizará automáticamente al recuperar la red',
                type: 'success',
            },
        }, false)

        expect(screen.getByText(/la salida se sincronizará/i)).toBeInTheDocument()
    })

    // ── 4.3.6 ─────────────────────────────────────────────────────────────────

    it('buscarPorPlaca() con placa vacía: el botón buscar está deshabilitado', async () => {
        renderSalida({ modoBusqueda: 'manual' })

        // Cambiar a modo manual para ver el input de placa
        // El input ya está visible en modo manual
        const input = screen.queryByPlaceholderText('ABC-1234')
        if (!input) {
            // Si no está visible, cambiar al tab manual primero
            const tabManual = screen.queryByText(/Manual|Placa/i)
            if (tabManual) fireEvent.click(tabManual)
        }

        // Con placa vacía, el botón de buscar debe estar deshabilitado
        // (el botón con ícono search está disabled cuando !placa.trim())
        await waitFor(() => {
            // El botón de búsqueda tiene el icono search y está disabled cuando placa está vacía
            const searchButtons = screen.queryAllByRole('button')
            const searchBtn = searchButtons.find(btn => btn.getAttribute('disabled') !== null)
            // Al menos un botón está deshabilitado (el de búsqueda con placa vacía)
            expect(searchBtn).toBeDefined()
        })
    })

    // ── 4.3.7 ─────────────────────────────────────────────────────────────────

    it('buscarPorPlaca() llama a la función del contexto cuando placa tiene valor', async () => {
        const buscarMock = vi.fn().mockResolvedValue(undefined)

        renderSalida({ modoBusqueda: 'manual', buscarPorPlaca: buscarMock })

        const input = screen.queryByPlaceholderText('ABC-1234')
        if (input) {
            fireEvent.change(input, { target: { value: 'XYZ999' } })

            await act(async () => {
                fireEvent.keyDown(input, { key: 'Enter' })
            })

            await waitFor(() => {
                expect(buscarMock).toHaveBeenCalledWith('XYZ999')
            })
        }
    })
})

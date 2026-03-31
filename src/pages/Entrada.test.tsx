// src/pages/Entrada.test.tsx
// Fase 4.2 — Flujo de registro de ingreso (online y offline)
import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { IonReactRouter } from '@ionic/react-router'
import { MemoryRouter } from 'react-router-dom'
import Entrada from './Entrada'
import { AppContext } from '../contexts/AppContext'
import { IngresoContext } from '../contexts/IngresoContext'
import { makeAppContextValue, makeIngresoContextValue } from '../test/renderWithProviders'
import { makeIngreso } from '../test/mocks/factories'
import { AuthContext } from '../contexts/AuthContext'
import { makeAuthContextValue } from '../test/renderWithProviders'

// ─── Mocks de módulos ─────────────────────────────────────────────────────────

vi.mock('../services/ingresoService', () => ({
    ingresoService: {
        registrarIngreso: vi.fn(),
        getTiposVehiculo: vi.fn().mockResolvedValue([
            { id: 1, nombre: 'CARRO' },
            { id: 2, nombre: 'MOTO'  },
        ]),
        getUbicaciones: vi.fn().mockResolvedValue([
            { id: 1, nombre: 'ZA', idTipoVehiculoNativo: 1, tipoVehiculoNativo: 'CARRO', capacidad: 10, disponible: true },
        ]),
        listarIngresos:  vi.fn(),
        eliminarIngreso: vi.fn(),
        editarIngreso:   vi.fn(),
    },
}))

vi.mock('../services/refDataService', () => ({
    refDataService: {
        getTiposVehiculo: vi.fn().mockResolvedValue([]),
        getUbicaciones:   vi.fn().mockResolvedValue([]),
        syncToIndexedDB:  vi.fn().mockResolvedValue(undefined),
    },
    iconoParaTipo: (nombre: string) => nombre === 'MOTO' ? 'two_wheeler' : 'directions_car',
}))

// QRCode no funciona bien en jsdom (SVG canvas) — mockearlo como null
vi.mock('react-qr-code', () => ({
    default: () => null,
}))

import { ingresoService } from '../services/ingresoService'

const mockIngresoSvc = vi.mocked(ingresoService)

// ─── Helper de render ─────────────────────────────────────────────────────────

function renderEntrada(options: {
    isOnline?: boolean
    registrarIngresoConOutbox?: ReturnType<typeof vi.fn>
} = {}) {
    const { isOnline = true, registrarIngresoConOutbox } = options

    const registrarMock = registrarIngresoConOutbox ?? vi.fn().mockResolvedValue(isOnline ? 'online' : 'encolado')

    return {
        registrarMock,
        ...render(
            <MemoryRouter>
                <IonReactRouter>
                    <AuthContext.Provider value={makeAuthContextValue()}>
                        <AppContext.Provider value={makeAppContextValue({ isOnline, estadoRed: isOnline ? 'online' : 'offline' })}>
                            <IngresoContext.Provider value={makeIngresoContextValue({ isOnline, registrarIngresoConOutbox: registrarMock })}>
                                <Entrada />
                            </IngresoContext.Provider>
                        </AppContext.Provider>
                    </AuthContext.Provider>
                </IonReactRouter>
            </MemoryRouter>
        ),
    }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Entrada — Flujo de registro de ingreso', () => {

    beforeEach(() => {
        vi.clearAllMocks()
        mockIngresoSvc.getTiposVehiculo.mockResolvedValue([
            { id: 1, nombre: 'CARRO' },
            { id: 2, nombre: 'MOTO'  },
        ])
        mockIngresoSvc.getUbicaciones.mockResolvedValue([
            { id: 1, nombre: 'ZA', idTipoVehiculoNativo: 1, tipoVehiculoNativo: 'CARRO', capacidad: 10, disponible: true },
        ])
        mockIngresoSvc.registrarIngreso.mockResolvedValue(makeIngreso())
    })

    // ── 4.2.1 ─────────────────────────────────────────────────────────────────

    it('renderiza el formulario correctamente (placa, tipo vehículo, espacios)', async () => {
        renderEntrada()

        // Sección placa
        expect(screen.getByPlaceholderText('ABC-1234')).toBeInTheDocument()
        expect(screen.getByText('Placa del Vehículo')).toBeInTheDocument()

        // Sección tipo de vehículo — tipos del fallback mientras cargan
        expect(screen.getByText('Tipo de Vehículo')).toBeInTheDocument()

        // Botón submit
        expect(screen.getByText('Generar Tiquete')).toBeInTheDocument()

        // Cuando cargan los espacios del mock aparece la ubicación
        await waitFor(() => {
            expect(screen.getByText('A')).toBeInTheDocument() // Primer carácter de 'ZA'
        })
    })

    // ── 4.2.2 ─────────────────────────────────────────────────────────────────

    it('validación: placa vacía no envía el formulario', async () => {
        renderEntrada()

        // No llenar la placa — hacer click directamente
        await act(async () => {
            fireEvent.click(screen.getByText('Generar Tiquete'))
        })

        await waitFor(() => {
            expect(screen.getByText('Ingresa la placa del vehículo')).toBeInTheDocument()
        })
        expect(mockIngresoSvc.registrarIngreso).not.toHaveBeenCalled()
    })

    // ── 4.2.3 ─────────────────────────────────────────────────────────────────

    it('envío online: llama a registrarIngresoConOutbox (devuelve "online") y luego a ingresoService.registrarIngreso', async () => {
        const registrarMock = vi.fn().mockResolvedValue('online')
        renderEntrada({ isOnline: true, registrarIngresoConOutbox: registrarMock })

        // Esperar a que carguen los espacios
        await waitFor(() => expect(screen.getByText('A')).toBeInTheDocument())

        // Llenar placa
        fireEvent.change(screen.getByPlaceholderText('ABC-1234'), { target: { value: 'ABC123' } })

        // Seleccionar el espacio ZA (primer char "Z", rest "A")
        const espacioBtn = screen.getByText('A').closest('button')!
        fireEvent.click(espacioBtn)

        // Enviar
        await act(async () => {
            fireEvent.click(screen.getByText('Generar Tiquete'))
        })

        await waitFor(() => {
            expect(registrarMock).toHaveBeenCalledWith(expect.objectContaining({ placa: 'ABC123' }))
            expect(mockIngresoSvc.registrarIngreso).toHaveBeenCalledWith(expect.objectContaining({ placa: 'ABC123' }))
        })
    })

    // ── 4.2.4 ─────────────────────────────────────────────────────────────────

    it('envío offline: registrarIngresoConOutbox devuelve "encolado" y muestra toast offline', async () => {
        const registrarMock = vi.fn().mockResolvedValue('encolado')
        renderEntrada({ isOnline: false, registrarIngresoConOutbox: registrarMock })

        // Esperar a que carguen los espacios
        await waitFor(() => expect(screen.getByText('A')).toBeInTheDocument())

        fireEvent.change(screen.getByPlaceholderText('ABC-1234'), { target: { value: 'XYZ999' } })

        const espacioBtn = screen.getByText('A').closest('button')!
        fireEvent.click(espacioBtn)

        await act(async () => {
            fireEvent.click(screen.getByText('Generar Tiquete'))
        })

        await waitFor(() => {
            expect(registrarMock).toHaveBeenCalled()
            expect(mockIngresoSvc.registrarIngreso).not.toHaveBeenCalled()
            // Toast offline que muestra el componente Entrada (mensaje completo, no el badge del header)
            expect(screen.getByText(/el ingreso se registrará al recuperar la red/i)).toBeInTheDocument()
        })
    })
})

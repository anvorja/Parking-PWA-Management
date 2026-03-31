// src/test/renderWithProviders.tsx
//
// Helper central de renderizado para todos los tests de integración.
// Envuelve el componente con los providers reales o mocks según cada test.
//
// Uso básico (solo router):
//   renderWithProviders(<Login />)
//
// Uso con contextos específicos:
//   renderWithProviders(<Entrada />, {
//     authValue: { user: makeUser(), token: 'tok', ... },
//     appValue:  { isOnline: false, ... },
//   })

import React, { ReactNode } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { IonReactRouter } from '@ionic/react-router'
import { AuthContext, AuthContextType } from '../contexts/AuthContext'
import { AppContext, AppContextType } from '../contexts/AppContext'
import { IngresoContext, IngresoContextType } from '../contexts/IngresoContext'
import { makeUser, makeLoginResponse } from './mocks/factories'

// ─── Valores por defecto de contextos ────────────────────────────────────────

export function makeAuthContextValue(overrides: Partial<AuthContextType> = {}): AuthContextType {
    return {
        user:         makeUser(),
        token:        'token-test-123',
        isLoading:    false,
        isLoggingOut: false,
        login:        vi.fn().mockResolvedValue(makeLoginResponse()),
        logout:       vi.fn().mockResolvedValue(undefined),
        checkAuth:    vi.fn().mockResolvedValue(undefined),
        ...overrides,
    }
}

export function makeAppContextValue(overrides: Partial<AppContextType> = {}): AppContextType {
    return {
        estadoRed:        'online',
        isOnline:         true,
        pendientesOutbox: 0,
        muertasOutbox:    0,
        isSincronizando:  false,
        sincronizarAhora: vi.fn().mockResolvedValue(undefined),
        ...overrides,
    }
}

export function makeIngresoContextValue(overrides: Partial<IngresoContextType> = {}): IngresoContextType {
    return {
        ingresos:                   [],
        isLoading:                  false,
        isLoadingMore:              false,
        hasMore:                    false,
        totalElements:              0,
        isOnline:                   true,
        filtroPlaca:                '',
        setFiltroPlaca:             vi.fn(),
        cargarMas:                  vi.fn(),
        refrescar:                  vi.fn(),
        eliminarIngreso:            vi.fn().mockResolvedValue(undefined),
        isDeleting:                 false,
        editarIngreso:              vi.fn().mockResolvedValue(undefined),
        isEditing:                  false,
        registrarIngresoConOutbox:  vi.fn().mockResolvedValue('online'),
        salidasPendientes:          new Set<number>(),
        toast:                      null,
        clearToast:                 vi.fn(),
        ...overrides,
    }
}

// ─── Opciones del helper ──────────────────────────────────────────────────────

export interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
    /** Ruta inicial para el MemoryRouter. Por defecto '/' */
    initialEntries?: string[]
    /** Si se pasa, envuelve con AuthContext usando este valor */
    authValue?: Partial<AuthContextType>
    /** Si se pasa, envuelve con AppContext usando este valor */
    appValue?: Partial<AppContextType>
    /** Si se pasa, envuelve con IngresoContext usando este valor */
    ingresoValue?: Partial<IngresoContextType>
    /** Si true, NO envuelve con IonReactRouter (útil para hooks puros) */
    skipIonRouter?: boolean
}

// ─── renderWithProviders ──────────────────────────────────────────────────────

export function renderWithProviders(
    ui: React.ReactElement,
    options: RenderWithProvidersOptions = {}
) {
    const {
        initialEntries = ['/'],
        authValue,
        appValue,
        ingresoValue,
        skipIonRouter = false,
        ...renderOptions
    } = options

    function Wrapper({ children }: { children: ReactNode }) {
        let content = children

        // Contextos de dominio (dentro a fuera — se aplican de afuera hacia adentro)
        if (ingresoValue !== undefined) {
            content = (
                <IngresoContext.Provider value={makeIngresoContextValue(ingresoValue)}>
                    {content}
                </IngresoContext.Provider>
            )
        }

        if (appValue !== undefined) {
            content = (
                <AppContext.Provider value={makeAppContextValue(appValue)}>
                    {content}
                </AppContext.Provider>
            )
        }

        if (authValue !== undefined) {
            content = (
                <AuthContext.Provider value={makeAuthContextValue(authValue)}>
                    {content}
                </AuthContext.Provider>
            )
        }

        // Router — siempre presente porque AuthProvider usa useHistory
        if (skipIonRouter) {
            return (
                <MemoryRouter initialEntries={initialEntries}>
                    {content}
                </MemoryRouter>
            )
        }

        return (
            <MemoryRouter initialEntries={initialEntries}>
                <IonReactRouter>
                    {content}
                </IonReactRouter>
            </MemoryRouter>
        )
    }

    return render(ui, { wrapper: Wrapper, ...renderOptions })
}

// src/providers/AuthProvider.test.tsx
import React from 'react'
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { IonReactRouter } from '@ionic/react-router'
import { AuthProvider } from './AuthProvider'
import { useAuth } from '../hooks/useAuth'
import { makeUser, makeLoginResponse } from '../test/mocks/factories'

// ─── Mocks de módulos ─────────────────────────────────────────────────────────

const mockHistoryReplace = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
    const actual = await importOriginal<typeof import('react-router-dom')>()
    return {
        ...actual,
        useHistory: () => ({ replace: mockHistoryReplace }),
    }
})

vi.mock('../services/authService', () => ({
    authService: {
        login:              vi.fn(),
        logout:             vi.fn(),
        getToken:           vi.fn(),
        getUser:            vi.fn(),
        limpiarSesion:      vi.fn(),
        refreshAccessToken: vi.fn(),
        isAuthenticated:    vi.fn(),
    },
    SESSION_EXPIRED_EVENT: 'parking:session-expired',
    fetchConAuth:          vi.fn(),
}))

vi.mock('../services/refDataService', () => ({
    refDataService: {
        syncToIndexedDB: vi.fn().mockResolvedValue(undefined),
    },
}))

// ─── Imports post-mock ────────────────────────────────────────────────────────

import { authService, SESSION_EXPIRED_EVENT } from '../services/authService'
import { refDataService } from '../services/refDataService'

const mockAuth     = vi.mocked(authService)
const mockRefData  = vi.mocked(refDataService)

// ─── Componente consumidor para inspeccionar el contexto ──────────────────────

function AuthConsumer() {
    const { user, token, isLoading, isLoggingOut, login, logout } = useAuth()
    return (
        <div>
            <span data-testid="token">{token ?? 'null'}</span>
            <span data-testid="user">{user?.nombreUsuario ?? 'null'}</span>
            <span data-testid="isLoading">{String(isLoading)}</span>
            <span data-testid="isLoggingOut">{String(isLoggingOut)}</span>
            <button onClick={() => login({ username: 'admin', password: 'pass' }).catch(() => {})}>Login</button>
            <button onClick={() => logout()}>Logout</button>
        </div>
    )
}

function renderAuthProvider() {
    return render(
        <MemoryRouter>
            <IonReactRouter>
                <AuthProvider>
                    <AuthConsumer />
                </AuthProvider>
            </IonReactRouter>
        </MemoryRouter>
    )
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AuthProvider', () => {

    beforeEach(() => {
        vi.clearAllMocks()
        mockRefData.syncToIndexedDB.mockResolvedValue(undefined)
        mockHistoryReplace.mockReset()
    })

    // ── 2.1.1 ─────────────────────────────────────────────────────────────────

    it('checkAuth() restaura sesión cuando hay token y usuario en IDB', async () => {
        const user = makeUser()
        mockAuth.getToken.mockResolvedValue('token-guardado')
        mockAuth.getUser.mockResolvedValue(user)

        renderAuthProvider()

        await waitFor(() => {
            expect(screen.getByTestId('token').textContent).toBe('token-guardado')
            expect(screen.getByTestId('user').textContent).toBe(user.nombreUsuario)
            expect(screen.getByTestId('isLoading').textContent).toBe('false')
        })
    })

    // ── 2.1.2 ─────────────────────────────────────────────────────────────────

    it('checkAuth() setea isLoading = false aunque IDB esté vacío', async () => {
        mockAuth.getToken.mockResolvedValue(undefined)
        mockAuth.getUser.mockResolvedValue(undefined)

        renderAuthProvider()

        await waitFor(() => {
            expect(screen.getByTestId('isLoading').textContent).toBe('false')
            expect(screen.getByTestId('token').textContent).toBe('null')
            expect(screen.getByTestId('user').textContent).toBe('null')
        })
    })

    // ── 2.1.3 ─────────────────────────────────────────────────────────────────

    it('login() llama authService.login(), setea token y usuario, dispara syncToIndexedDB', async () => {
        mockAuth.getToken.mockResolvedValue(undefined)
        mockAuth.getUser.mockResolvedValue(undefined)
        const loginResp = makeLoginResponse()
        mockAuth.login.mockResolvedValue(loginResp)

        renderAuthProvider()
        await waitFor(() => expect(screen.getByTestId('isLoading').textContent).toBe('false'))

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Login' }))
        })

        await waitFor(() => {
            expect(mockAuth.login).toHaveBeenCalledWith({ username: 'admin', password: 'pass' })
            expect(screen.getByTestId('token').textContent).toBe(loginResp.accessToken)
            expect(screen.getByTestId('user').textContent).toBe(loginResp.usuario.nombreUsuario)
        })

        // syncToIndexedDB se llama en background (.catch — no bloquea)
        await waitFor(() => expect(mockRefData.syncToIndexedDB).toHaveBeenCalledTimes(1))
    })

    // ── 2.1.4 ─────────────────────────────────────────────────────────────────

    it('login() setea isLoading = false en el finally aunque el servicio falle', async () => {
        mockAuth.getToken.mockResolvedValue(undefined)
        mockAuth.getUser.mockResolvedValue(undefined)
        mockAuth.login.mockRejectedValue(new Error('Credenciales inválidas'))

        renderAuthProvider()
        await waitFor(() => expect(screen.getByTestId('isLoading').textContent).toBe('false'))

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Login' }))
        })

        await waitFor(() => {
            expect(screen.getByTestId('isLoading').textContent).toBe('false')
        })
    })

    // ── 2.1.5 ─────────────────────────────────────────────────────────────────

    it('logout() llama authService.logout() y limpia token y usuario del estado', async () => {
        // Sesión inicial activa
        mockAuth.getToken.mockResolvedValue('token-activo')
        mockAuth.getUser.mockResolvedValue(makeUser())
        mockAuth.logout.mockResolvedValue(undefined)

        renderAuthProvider()
        await waitFor(() => expect(screen.getByTestId('token').textContent).toBe('token-activo'))

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Logout' }))
        })

        await waitFor(() => {
            expect(mockAuth.logout).toHaveBeenCalledTimes(1)
            expect(screen.getByTestId('token').textContent).toBe('null')
            expect(screen.getByTestId('user').textContent).toBe('null')
        })
    })

    // ── 2.1.6 ─────────────────────────────────────────────────────────────────

    it('isLoggingOut es true durante el logout y false al terminar', async () => {
        mockAuth.getToken.mockResolvedValue('token-activo')
        mockAuth.getUser.mockResolvedValue(makeUser())

        // Logout tarda un tick
        let resolveLogout!: () => void
        mockAuth.logout.mockReturnValue(new Promise<void>(res => { resolveLogout = res }))

        renderAuthProvider()
        await waitFor(() => expect(screen.getByTestId('token').textContent).toBe('token-activo'))

        act(() => {
            fireEvent.click(screen.getByRole('button', { name: 'Logout' }))
        })

        await waitFor(() => {
            expect(screen.getByTestId('isLoggingOut').textContent).toBe('true')
        })

        await act(async () => { resolveLogout() })

        await waitFor(() => {
            expect(screen.getByTestId('isLoggingOut').textContent).toBe('false')
        })
    })

    // ── 2.1.7 ─────────────────────────────────────────────────────────────────

    it('SESSION_EXPIRED_EVENT limpia token y usuario del estado', async () => {
        mockAuth.getToken.mockResolvedValue('token-guardado')
        mockAuth.getUser.mockResolvedValue(makeUser())

        renderAuthProvider()
        await waitFor(() => expect(screen.getByTestId('token').textContent).toBe('token-guardado'))

        act(() => {
            window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT))
        })

        await waitFor(() => {
            expect(screen.getByTestId('token').textContent).toBe('null')
            expect(screen.getByTestId('user').textContent).toBe('null')
        })
    })

    // ── 2.1.8 ─────────────────────────────────────────────────────────────────

    it('logout() redirige a /login tras limpiar el estado', async () => {
        mockAuth.getToken.mockResolvedValue('token-activo')
        mockAuth.getUser.mockResolvedValue(makeUser())
        mockAuth.logout.mockResolvedValue(undefined)

        renderAuthProvider()
        await waitFor(() => expect(screen.getByTestId('token').textContent).toBe('token-activo'))

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Logout' }))
        })

        await waitFor(() => {
            expect(mockHistoryReplace).toHaveBeenCalledWith('/login')
        })
    })

    // ── 2.1.9 ─────────────────────────────────────────────────────────────────

    it('SESSION_EXPIRED_EVENT redirige a /login', async () => {
        mockAuth.getToken.mockResolvedValue('token-guardado')
        mockAuth.getUser.mockResolvedValue(makeUser())

        renderAuthProvider()
        await waitFor(() => expect(screen.getByTestId('token').textContent).toBe('token-guardado'))

        act(() => {
            window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT))
        })

        await waitFor(() => {
            expect(mockHistoryReplace).toHaveBeenCalledWith('/login')
        })
    })
})

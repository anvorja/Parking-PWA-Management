// src/providers/UsuarioProvider.test.tsx
// HU-002: Listar usuarios
// HU-003: Crear usuario
// HU-004: Editar usuario
// HU-005: Eliminar usuario

import React, { useState } from 'react'
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { UsuarioProvider } from './UsuarioProvider'
import { useUsuarios } from '../hooks/useUsuarios'
import type { CrearUsuarioRequest, EditarUsuarioRequest } from '../services/usuarioService'

// ─── Mocks de módulos ─────────────────────────────────────────────────────────

vi.mock('../services/usuarioService', () => ({
    usuarioService: {
        getUsuarios:     vi.fn().mockResolvedValue([]),
        crearUsuario:    vi.fn(),
        editarUsuario:   vi.fn(),
        eliminarUsuario: vi.fn(),
    },
}))

import { usuarioService } from '../services/usuarioService'
const mockService = vi.mocked(usuarioService)

// ─── Datos de prueba ──────────────────────────────────────────────────────────

function makeUsuario(overrides: Record<string, unknown> = {}) {
    return {
        id:             1,
        nombreCompleto: 'Juan Pérez',
        nombreUsuario:  'jperez',
        rol:            'AUXILIAR',
        ...overrides,
    }
}

const CREAR_REQUEST: CrearUsuarioRequest = {
    nombreCompleto:         'Ana López',
    nombreUsuario:          'alopez',
    contrasena:             'pass123',
    confirmacionContrasena: 'pass123',
    rol:                    'AUXILIAR',
}

const EDITAR_REQUEST: EditarUsuarioRequest = {
    nombreCompleto: 'Ana López Editado',
    nombreUsuario:  'alopez',
    rol:            'ADMINISTRADOR',
}

// ─── Componente consumidor ────────────────────────────────────────────────────

function UsuarioConsumer() {
    const {
        usuarios,
        usuariosFiltrados,
        isLoading,
        isSubmitting,
        isDeleting,
        searchQuery,
        setSearchQuery,
        selectedRole,
        setSelectedRole,
        crearUsuario,
        editarUsuario,
        eliminarUsuario,
        refrescar,
        toast,
        clearToast,
    } = useUsuarios()

    const [errorCapturado, setErrorCapturado] = useState('')

    return (
        <div>
            <span data-testid="usuarios-count">{usuarios.length}</span>
            <span data-testid="filtrados-count">{usuariosFiltrados.length}</span>
            <span data-testid="isLoading">{String(isLoading)}</span>
            <span data-testid="isSubmitting">{String(isSubmitting)}</span>
            <span data-testid="isDeleting">{String(isDeleting)}</span>
            <span data-testid="toast-message">{toast?.message ?? ''}</span>
            <span data-testid="toast-type">{toast?.type ?? ''}</span>
            <span data-testid="error-capturado">{errorCapturado}</span>

            <input
                data-testid="search-input"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
            />
            <select
                data-testid="role-select"
                value={selectedRole}
                onChange={e => setSelectedRole(e.target.value)}
            >
                <option value="Todos">Todos</option>
                <option value="ADMINISTRADOR">ADMINISTRADOR</option>
                <option value="AUXILIAR">AUXILIAR</option>
            </select>

            <button
                onClick={() =>
                    crearUsuario(CREAR_REQUEST).catch(e => setErrorCapturado((e as Error).message))
                }
            >
                Crear
            </button>
            <button
                onClick={() =>
                    editarUsuario(1, EDITAR_REQUEST).catch(e => setErrorCapturado((e as Error).message))
                }
            >
                Editar
            </button>
            <button
                onClick={() =>
                    eliminarUsuario(1).catch(e => setErrorCapturado((e as Error).message))
                }
            >
                Eliminar
            </button>
            <button onClick={() => refrescar()}>Refrescar</button>
            <button onClick={() => clearToast()}>Limpiar Toast</button>
        </div>
    )
}

function renderProvider() {
    return render(
        <UsuarioProvider>
            <UsuarioConsumer />
        </UsuarioProvider>
    )
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('UsuarioProvider', () => {

    beforeEach(() => {
        vi.clearAllMocks()
        mockService.getUsuarios.mockResolvedValue([])
        mockService.crearUsuario.mockResolvedValue({ mensaje: 'Creado', usuario: makeUsuario() })
        mockService.editarUsuario.mockResolvedValue(makeUsuario())
        mockService.eliminarUsuario.mockResolvedValue(undefined)
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    // ── HU-002: Listar usuarios ────────────────────────────────────────────────

    it('carga la lista de usuarios al montar y pone isLoading en false', async () => {
        mockService.getUsuarios.mockResolvedValue([
            makeUsuario({ id: 1 }),
            makeUsuario({ id: 2, nombreUsuario: 'otro' }),
        ])

        renderProvider()

        await waitFor(() => {
            expect(screen.getByTestId('usuarios-count').textContent).toBe('2')
            expect(screen.getByTestId('isLoading').textContent).toBe('false')
        })
    })

    it('expone lista vacía cuando el servicio devuelve []', async () => {
        renderProvider()

        await waitFor(() => {
            expect(screen.getByTestId('usuarios-count').textContent).toBe('0')
            expect(screen.getByTestId('isLoading').textContent).toBe('false')
        })
    })

    it('error en getUsuarios: isLoading vuelve a false, usuarios queda vacío y no genera toast', async () => {
        mockService.getUsuarios.mockRejectedValue(new Error('sin red'))

        renderProvider()

        await waitFor(() => {
            expect(screen.getByTestId('isLoading').textContent).toBe('false')
            expect(screen.getByTestId('usuarios-count').textContent).toBe('0')
            expect(screen.getByTestId('toast-message').textContent).toBe('')
        })
    })

    // ── Filtrado (useMemo) ─────────────────────────────────────────────────────

    it('usuariosFiltrados filtra por selectedRole', async () => {
        mockService.getUsuarios.mockResolvedValue([
            makeUsuario({ id: 1, rol: 'ADMINISTRADOR' }),
            makeUsuario({ id: 2, rol: 'AUXILIAR', nombreUsuario: 'aux1' }),
            makeUsuario({ id: 3, rol: 'AUXILIAR', nombreUsuario: 'aux2' }),
        ])

        renderProvider()
        await waitFor(() => expect(screen.getByTestId('filtrados-count').textContent).toBe('3'))

        fireEvent.change(screen.getByTestId('role-select'), { target: { value: 'AUXILIAR' } })

        expect(screen.getByTestId('filtrados-count').textContent).toBe('2')
    })

    it('usuariosFiltrados filtra por searchQuery en nombreCompleto (case-insensitive)', async () => {
        mockService.getUsuarios.mockResolvedValue([
            makeUsuario({ id: 1, nombreCompleto: 'Carlos Ruiz' }),
            makeUsuario({ id: 2, nombreCompleto: 'María García', nombreUsuario: 'mgarcia' }),
        ])

        renderProvider()
        await waitFor(() => expect(screen.getByTestId('filtrados-count').textContent).toBe('2'))

        fireEvent.change(screen.getByTestId('search-input'), { target: { value: 'carlos' } })

        expect(screen.getByTestId('filtrados-count').textContent).toBe('1')
    })

    it('usuariosFiltrados filtra por searchQuery en nombreUsuario', async () => {
        mockService.getUsuarios.mockResolvedValue([
            makeUsuario({ id: 1, nombreUsuario: 'jperez' }),
            makeUsuario({ id: 2, nombreUsuario: 'alopez', nombreCompleto: 'Ana López' }),
        ])

        renderProvider()
        await waitFor(() => expect(screen.getByTestId('filtrados-count').textContent).toBe('2'))

        fireEvent.change(screen.getByTestId('search-input'), { target: { value: 'alopez' } })

        expect(screen.getByTestId('filtrados-count').textContent).toBe('1')
    })

    it('combinación de rol y búsqueda aplica ambos filtros', async () => {
        mockService.getUsuarios.mockResolvedValue([
            makeUsuario({ id: 1, rol: 'ADMINISTRADOR', nombreCompleto: 'Admin Uno' }),
            makeUsuario({ id: 2, rol: 'AUXILIAR', nombreCompleto: 'Carlos Aux', nombreUsuario: 'caux' }),
            makeUsuario({ id: 3, rol: 'AUXILIAR', nombreCompleto: 'Pedro Aux',  nombreUsuario: 'paux' }),
        ])

        renderProvider()
        await waitFor(() => expect(screen.getByTestId('filtrados-count').textContent).toBe('3'))

        fireEvent.change(screen.getByTestId('role-select'),  { target: { value: 'AUXILIAR' } })
        fireEvent.change(screen.getByTestId('search-input'), { target: { value: 'carlos' } })

        expect(screen.getByTestId('filtrados-count').textContent).toBe('1')
    })

    it('selectedRole "Todos" devuelve todos los usuarios sin filtrar por rol', async () => {
        mockService.getUsuarios.mockResolvedValue([
            makeUsuario({ id: 1, rol: 'ADMINISTRADOR' }),
            makeUsuario({ id: 2, rol: 'AUXILIAR', nombreUsuario: 'aux1' }),
        ])

        renderProvider()
        await waitFor(() => expect(screen.getByTestId('filtrados-count').textContent).toBe('2'))

        fireEvent.change(screen.getByTestId('role-select'), { target: { value: 'AUXILIAR' } })
        expect(screen.getByTestId('filtrados-count').textContent).toBe('1')

        fireEvent.change(screen.getByTestId('role-select'), { target: { value: 'Todos' } })
        expect(screen.getByTestId('filtrados-count').textContent).toBe('2')
    })

    // ── HU-003: Crear usuario ─────────────────────────────────────────────────

    it('crearUsuario llama al servicio con los datos recibidos', async () => {
        renderProvider()
        await waitFor(() => expect(screen.getByTestId('isLoading').textContent).toBe('false'))

        await act(async () => {
            screen.getByRole('button', { name: 'Crear' }).click()
        })

        expect(mockService.crearUsuario).toHaveBeenCalledWith(CREAR_REQUEST)
    })

    it('crearUsuario muestra toast de éxito', async () => {
        renderProvider()
        await waitFor(() => expect(screen.getByTestId('isLoading').textContent).toBe('false'))

        await act(async () => {
            screen.getByRole('button', { name: 'Crear' }).click()
        })

        await waitFor(() => {
            expect(screen.getByTestId('toast-type').textContent).toBe('success')
            expect(screen.getByTestId('toast-message').textContent).toBe('Usuario creado exitosamente')
        })
    })

    it('crearUsuario refresca la lista tras el éxito', async () => {
        renderProvider()
        await waitFor(() => expect(screen.getByTestId('isLoading').textContent).toBe('false'))

        // getUsuarios ya fue llamado una vez al montar
        expect(mockService.getUsuarios).toHaveBeenCalledTimes(1)

        await act(async () => {
            screen.getByRole('button', { name: 'Crear' }).click()
        })

        await waitFor(() => {
            expect(mockService.getUsuarios).toHaveBeenCalledTimes(2)
        })
    })

    it('crearUsuario: error del servicio → muestra toast de error y relanza', async () => {
        mockService.crearUsuario.mockRejectedValue(new Error('nombre de usuario ya existe'))

        renderProvider()
        await waitFor(() => expect(screen.getByTestId('isLoading').textContent).toBe('false'))

        await act(async () => {
            screen.getByRole('button', { name: 'Crear' }).click()
        })

        await waitFor(() => {
            expect(screen.getByTestId('toast-type').textContent).toBe('error')
            expect(screen.getByTestId('toast-message').textContent).toBe('nombre de usuario ya existe')
            expect(screen.getByTestId('error-capturado').textContent).toBe('nombre de usuario ya existe')
        })
    })

    it('crearUsuario: isSubmitting = true durante la operación, false al terminar', async () => {
        let resolveCrear!: (v: unknown) => void
        mockService.crearUsuario.mockReturnValue(new Promise(res => { resolveCrear = res }))

        renderProvider()
        await waitFor(() => expect(screen.getByTestId('isLoading').textContent).toBe('false'))

        act(() => {
            screen.getByRole('button', { name: 'Crear' }).click()
        })

        await waitFor(() => {
            expect(screen.getByTestId('isSubmitting').textContent).toBe('true')
        })

        await act(async () => {
            resolveCrear({ mensaje: 'OK', usuario: makeUsuario() })
        })

        await waitFor(() => {
            expect(screen.getByTestId('isSubmitting').textContent).toBe('false')
        })
    })

    // ── HU-004: Editar usuario ────────────────────────────────────────────────

    it('editarUsuario llama al servicio con el id y los datos correctos', async () => {
        renderProvider()
        await waitFor(() => expect(screen.getByTestId('isLoading').textContent).toBe('false'))

        await act(async () => {
            screen.getByRole('button', { name: 'Editar' }).click()
        })

        expect(mockService.editarUsuario).toHaveBeenCalledWith(1, EDITAR_REQUEST)
    })

    it('editarUsuario muestra toast de éxito', async () => {
        renderProvider()
        await waitFor(() => expect(screen.getByTestId('isLoading').textContent).toBe('false'))

        await act(async () => {
            screen.getByRole('button', { name: 'Editar' }).click()
        })

        await waitFor(() => {
            expect(screen.getByTestId('toast-type').textContent).toBe('success')
            expect(screen.getByTestId('toast-message').textContent).toBe('Usuario editado exitosamente')
        })
    })

    it('editarUsuario: error del servicio → muestra toast de error y relanza', async () => {
        mockService.editarUsuario.mockRejectedValue(new Error('usuario no encontrado'))

        renderProvider()
        await waitFor(() => expect(screen.getByTestId('isLoading').textContent).toBe('false'))

        await act(async () => {
            screen.getByRole('button', { name: 'Editar' }).click()
        })

        await waitFor(() => {
            expect(screen.getByTestId('toast-type').textContent).toBe('error')
            expect(screen.getByTestId('toast-message').textContent).toBe('usuario no encontrado')
            expect(screen.getByTestId('error-capturado').textContent).toBe('usuario no encontrado')
        })
    })

    // ── HU-005: Eliminar usuario ──────────────────────────────────────────────

    it('eliminarUsuario llama al servicio con el id correcto', async () => {
        renderProvider()
        await waitFor(() => expect(screen.getByTestId('isLoading').textContent).toBe('false'))

        await act(async () => {
            screen.getByRole('button', { name: 'Eliminar' }).click()
        })

        expect(mockService.eliminarUsuario).toHaveBeenCalledWith(1)
    })

    it('eliminarUsuario muestra toast de éxito', async () => {
        renderProvider()
        await waitFor(() => expect(screen.getByTestId('isLoading').textContent).toBe('false'))

        await act(async () => {
            screen.getByRole('button', { name: 'Eliminar' }).click()
        })

        await waitFor(() => {
            expect(screen.getByTestId('toast-type').textContent).toBe('success')
            expect(screen.getByTestId('toast-message').textContent).toBe('Usuario eliminado exitosamente')
        })
    })

    it('eliminarUsuario: error del servicio → muestra toast de error y relanza', async () => {
        mockService.eliminarUsuario.mockRejectedValue(new Error('no se puede eliminar el admin inicial'))

        renderProvider()
        await waitFor(() => expect(screen.getByTestId('isLoading').textContent).toBe('false'))

        await act(async () => {
            screen.getByRole('button', { name: 'Eliminar' }).click()
        })

        await waitFor(() => {
            expect(screen.getByTestId('toast-type').textContent).toBe('error')
            expect(screen.getByTestId('toast-message').textContent).toBe('no se puede eliminar el admin inicial')
            expect(screen.getByTestId('error-capturado').textContent).toBe('no se puede eliminar el admin inicial')
        })
    })

    it('eliminarUsuario: isDeleting = true durante la operación, false al terminar', async () => {
        let resolveEliminar!: (v: unknown) => void
        mockService.eliminarUsuario.mockReturnValue(new Promise(res => { resolveEliminar = res }))

        renderProvider()
        await waitFor(() => expect(screen.getByTestId('isLoading').textContent).toBe('false'))

        act(() => {
            screen.getByRole('button', { name: 'Eliminar' }).click()
        })

        await waitFor(() => {
            expect(screen.getByTestId('isDeleting').textContent).toBe('true')
        })

        await act(async () => {
            resolveEliminar(undefined)
        })

        await waitFor(() => {
            expect(screen.getByTestId('isDeleting').textContent).toBe('false')
        })
    })

    // ── Toast ─────────────────────────────────────────────────────────────────

    it('clearToast elimina el toast inmediatamente', async () => {
        renderProvider()
        await waitFor(() => expect(screen.getByTestId('isLoading').textContent).toBe('false'))

        await act(async () => {
            screen.getByRole('button', { name: 'Crear' }).click()
        })
        await waitFor(() => {
            expect(screen.getByTestId('toast-message').textContent).toBe('Usuario creado exitosamente')
        })

        act(() => {
            screen.getByRole('button', { name: 'Limpiar Toast' }).click()
        })

        expect(screen.getByTestId('toast-message').textContent).toBe('')
    })

    it('toast se descarta automáticamente tras 3 segundos', async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true })

        renderProvider()
        await waitFor(() => expect(screen.getByTestId('isLoading').textContent).toBe('false'))

        await act(async () => {
            screen.getByRole('button', { name: 'Crear' }).click()
        })
        await waitFor(() => {
            expect(screen.getByTestId('toast-message').textContent).toBe('Usuario creado exitosamente')
        })

        await act(async () => {
            vi.advanceTimersByTime(3000)
        })

        await waitFor(() => {
            expect(screen.getByTestId('toast-message').textContent).toBe('')
        })
    })
})

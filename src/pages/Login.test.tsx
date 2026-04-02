// src/pages/Login.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Login from './Login';
import * as AuthHookModule from '../hooks/useAuth';
import * as AppHookModule  from '../hooks/useApp';
import { IonReactRouter } from '@ionic/react-router';
import { makeAppContextValue } from '../test/renderWithProviders';

// Mockeamos la navegación de Ionic
const mockPush = vi.fn();
vi.mock('@ionic/react', async () => {
    const actual = await vi.importActual<Record<string, unknown>>('@ionic/react');
    return {
        ...actual,
        useIonRouter: () => ({
            push: mockPush,
        }),
    };
});

describe('Pruebas Unitarias del Componente Login', () => {
    const mockLogin = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();

        vi.spyOn(AuthHookModule, 'useAuth').mockReturnValue({
            user: null,
            token: null,
            isLoading: false,
            login: mockLogin,
            logout: vi.fn(),
            checkAuth: vi.fn(),
            isLoggingOut: false,
        });

        // Login usa useApp() para mostrar el estado real de red en el banner
        vi.spyOn(AppHookModule, 'useApp').mockReturnValue(makeAppContextValue());
    });

    it('1. Debe renderizar los elementos del formulario correctamente', () => {
        render(
            <IonReactRouter>
                <Login />
            </IonReactRouter>
        );

        expect(screen.getByText('Bienvenido')).toBeInTheDocument();
        expect(screen.getByLabelText('Usuario o Correo Electrónico')).toBeInTheDocument();
        expect(screen.getByLabelText('Contraseña')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /ingresar/i })).toBeInTheDocument();
    });

    it('2. Debe mostrar un mensaje de error si se intenta ingresar con campos vacíos', async () => {
        render(
            <IonReactRouter>
                <Login />
            </IonReactRouter>
        );

        const button = screen.getByRole('button', { name: /ingresar/i });
        fireEvent.click(button);

        expect(await screen.findByText('El usuario es obligatorio.')).toBeInTheDocument();
        expect(await screen.findByText('La contraseña es obligatoria.')).toBeInTheDocument();
        expect(mockLogin).not.toHaveBeenCalled();
    });

    it('3. Debe llamar la función de login con credenciales si los campos están llenos', async () => {
        render(
            <IonReactRouter>
                <Login />
            </IonReactRouter>
        );

        const inputUsername = screen.getByLabelText('Usuario o Correo Electrónico');
        const inputPassword = screen.getByLabelText('Contraseña');
        const button        = screen.getByRole('button', { name: /ingresar/i });

        fireEvent.change(inputUsername, { target: { value: 'admin' } });
        fireEvent.change(inputPassword, { target: { value: '1234' } });
        fireEvent.click(button);

        await waitFor(() => {
            expect(mockLogin).toHaveBeenCalledWith({ username: 'admin', password: '1234' });
        });
    });

    // ── Fase 4 — casos adicionales ────────────────────────────────────────────

    it('4. Login exitoso llama a router.push con /home', async () => {
        mockLogin.mockResolvedValue({ accessToken: 'tok', usuario: { nombreUsuario: 'admin' } });

        render(
            <IonReactRouter>
                <Login />
            </IonReactRouter>
        );

        fireEvent.change(screen.getByLabelText('Usuario o Correo Electrónico'), { target: { value: 'admin' } });
        fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: '1234' } });
        fireEvent.click(screen.getByRole('button', { name: /ingresar/i }));

        await waitFor(() => {
            expect(mockPush).toHaveBeenCalledWith('/home', 'forward', 'replace');
        });
    });

    it('5. Login fallido muestra el mensaje de error en pantalla', async () => {
        mockLogin.mockRejectedValue(new Error('Credenciales inválidas o error en el servidor'));

        render(
            <IonReactRouter>
                <Login />
            </IonReactRouter>
        );

        fireEvent.change(screen.getByLabelText('Usuario o Correo Electrónico'), { target: { value: 'admin' } });
        fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'wrong' } });
        fireEvent.click(screen.getByRole('button', { name: /ingresar/i }));

        expect(await screen.findByText('Credenciales inválidas o error en el servidor')).toBeInTheDocument();
        expect(mockPush).not.toHaveBeenCalled();
    });

    it('6. El botón Ingresar está deshabilitado mientras isSubmitting = true', async () => {
        // Login que tarda — el botón debe quedar disabled mientras espera
        let resolveLogin!: () => void;
        mockLogin.mockReturnValue(new Promise<void>(res => { resolveLogin = res }));

        render(
            <IonReactRouter>
                <Login />
            </IonReactRouter>
        );

        fireEvent.change(screen.getByLabelText('Usuario o Correo Electrónico'), { target: { value: 'admin' } });
        fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: '1234' } });

        // Guardar referencia ANTES de click — el texto cambia a spinner al enviar
        const submitBtn = screen.getByRole('button', { name: /ingresar/i });
        fireEvent.click(submitBtn);

        // Mientras el login está pendiente, el mismo elemento debe estar deshabilitado
        await waitFor(() => {
            expect(submitBtn).toBeDisabled();
        });

        // Resolver la promesa para no dejar la prueba con estado colgado
        await act(async () => {
            resolveLogin();
        })
    });
});
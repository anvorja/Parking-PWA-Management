// src/pages/Login.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Login from './Login';
import * as AuthHookModule from '../hooks/useAuth';
import { IonReactRouter } from '@ionic/react-router';

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
        });
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
});
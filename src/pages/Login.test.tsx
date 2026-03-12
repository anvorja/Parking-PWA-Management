import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Login from './Login';
import * as AuthContextModule from '../context/AuthContext';
import { IonReactRouter } from '@ionic/react-router';

// Mockeamos la navegación de Ionic
const mockPush = vi.fn();
vi.mock('@ionic/react', async () => {
    const actual: any = await vi.importActual('@ionic/react');
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

        // Simulamos el hook useAuth para controlar el estado de la autenticación
        vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
            user: null,
            token: null,
            isLoading: false,
            login: mockLogin,
            logout: vi.fn(),
            checkAuth: vi.fn(),
        });
    });

    it('1. Debe renderizar los elementos del formulario correctamente', () => {
        // Renderizamos el componente (envuelto en un Router falso porque usa navegación)
        render(
            <IonReactRouter>
                <Login />
            </IonReactRouter>
        );

        // Verificamos que el texto principal, las etiquetas y el botón de submit existan
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

        // Simulamos un clic sin llenar los inputs
        fireEvent.click(button);

        // Esperamos que aparezcan los mensajes de error individuales en pantalla
        expect(await screen.findByText('El usuario es obligatorio.')).toBeInTheDocument();
        expect(await screen.findByText('La contraseña es obligatoria.')).toBeInTheDocument();
        // Validamos que NO se llamó la función login del servidor
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
        const button = screen.getByRole('button', { name: /ingresar/i });

        // Simulamos que el usuario escribe credenciales
        fireEvent.change(inputUsername, { target: { value: 'admin' } });
        fireEvent.change(inputPassword, { target: { value: '1234' } });

        // Presionamos el botón
        fireEvent.click(button);

        // Validamos que se haya intentado loguear con las credenciales introducidas
        await waitFor(() => {
            expect(mockLogin).toHaveBeenCalledWith({ username: 'admin', password: '1234' });
        });
    });
});

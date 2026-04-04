// src/test/mocks/factories.ts
//
// Fábricas de datos para tests.
// Cada función devuelve un objeto válido con valores por defecto sensatos.

import type { AuthenticatedUser, LoginResponse } from '../../services/authService'
import type {
    IngresoVehiculoResponse,
    RegistrarIngresoRequest,
    EditarIngresoRequest,
    Ubicacion,
    TipoVehiculo,
} from '../../services/ingresoService'
import type { OutboxEntry, OutboxType } from '../../services/outboxService'
import type {
    UsuarioListItemResponse,
    CrearUsuarioRequest,
    EditarUsuarioRequest,
} from '../../services/usuarioService'

// ─── Auth ─────────────────────────────────────────────────────────────────────

export function makeUser(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
    return {
        id:             1,
        nombreCompleto: 'Admin Test',
        nombreUsuario:  'admin',
        rol:            'ADMINISTRADOR',
        ...overrides,
    }
}

export function makeLoginResponse(overrides: Partial<LoginResponse> = {}): LoginResponse {
    return {
        accessToken:  'token-test-123',
        refreshToken: 'refresh-test-456',
        type:         'Bearer',
        usuario:      makeUser(),
        ...overrides,
    }
}

// ─── Ingresos ─────────────────────────────────────────────────────────────────

export function makeIngreso(overrides: Partial<IngresoVehiculoResponse> = {}): IngresoVehiculoResponse {
    return {
        idIngreso:        1,
        placa:            'ABC123',
        idTipoVehiculo:   1,
        tipoVehiculo:     'CARRO',
        idUbicacion:      1,
        ubicacion:        'Zona A',
        idEstadoIngreso:  1,
        estadoIngreso:    'INGRESADO',
        fechaHoraIngreso: '2026-03-31T10:00:00',
        fechaCreacion:    '2026-03-31T10:00:00',
        idUsuarioRegistro: 1,
        usuarioRegistro:  'admin',
        valorCobrado:     null,
        ...overrides,
    }
}

export function makeIngresoRequest(overrides: Partial<RegistrarIngresoRequest> = {}): RegistrarIngresoRequest {
    return {
        placa:          'ABC123',
        idTipoVehiculo: 1,
        idUbicacion:    1,
        ...overrides,
    }
}

export function makeEditarRequest(overrides: Partial<EditarIngresoRequest> = {}): EditarIngresoRequest {
    return {
        placa: 'XYZ999',
        ...overrides,
    }
}

// ─── Referencia ───────────────────────────────────────────────────────────────

export function makeUbicacion(overrides: Partial<Ubicacion> = {}): Ubicacion {
    return {
        id:                   1,
        nombre:               'Zona A',
        idTipoVehiculoNativo: 1,
        tipoVehiculoNativo:   'CARRO',
        capacidad:            20,
        disponible:           true,
        ...overrides,
    }
}

export function makeTipoVehiculo(overrides: Partial<TipoVehiculo> = {}): TipoVehiculo {
    return {
        id:     1,
        nombre: 'CARRO',
        ...overrides,
    }
}

// ─── Usuarios ─────────────────────────────────────────────────────────────────

export function makeUsuarioItem(overrides: Partial<UsuarioListItemResponse> = {}): UsuarioListItemResponse {
    return {
        id:             1,
        nombreCompleto: 'Juan Pérez',
        nombreUsuario:  'jperez',
        rol:            'AUXILIAR',
        ...overrides,
    }
}

export function makeCrearUsuarioRequest(overrides: Partial<CrearUsuarioRequest> = {}): CrearUsuarioRequest {
    return {
        nombreCompleto:         'Ana López',
        nombreUsuario:          'alopez',
        contrasena:             'pass123',
        confirmacionContrasena: 'pass123',
        rol:                    'AUXILIAR',
        ...overrides,
    }
}

export function makeEditarUsuarioRequest(overrides: Partial<EditarUsuarioRequest> = {}): EditarUsuarioRequest {
    return {
        nombreCompleto: 'Juan Pérez',
        nombreUsuario:  'jperez',
        rol:            'AUXILIAR',
        ...overrides,
    }
}

// ─── Outbox ───────────────────────────────────────────────────────────────────

export function makeOutboxEntry(
    type: OutboxType = 'INGRESO',
    overrides: Partial<OutboxEntry> = {}
): OutboxEntry {
    return {
        id:        'outbox-entry-1',
        type,
        payload:   { placa: 'ABC123', idTipoVehiculo: 1, idUbicacion: 1 },
        createdAt: Date.now(),
        retries:   0,
        ...overrides,
    }
}

// src/test/mocks/services.ts
//
// Mocks centralizados de todos los servicios externos.
// Uso en tests:
//   vi.mock('../../services/authService', () => mockAuthServiceModule)
//   mockAuthService.login.mockResolvedValue(makeLoginResponse())
//
// Cada mock es un vi.fn() para que los tests puedan sobrescribir el
// comportamiento con mockResolvedValue / mockRejectedValue según necesiten.

import { vi } from 'vitest'
import { makeLoginResponse, makeIngreso, makeUser } from './factories'

// ─── authService ──────────────────────────────────────────────────────────────

export const mockAuthService = {
    login:               vi.fn().mockResolvedValue(makeLoginResponse()),
    logout:              vi.fn().mockResolvedValue(undefined),
    refreshAccessToken:  vi.fn().mockResolvedValue('new-token'),
    limpiarSesion:       vi.fn().mockResolvedValue(undefined),
    getToken:            vi.fn().mockResolvedValue('token-test-123'),
    getRefreshToken:     vi.fn().mockResolvedValue('refresh-test-456'),
    getUser:             vi.fn().mockResolvedValue(makeUser()),
    isAuthenticated:     vi.fn().mockResolvedValue(true),
}

export const mockAuthServiceModule = {
    authService:           mockAuthService,
    SESSION_EXPIRED_EVENT: 'parking:session-expired',
    // fetchConAuth re-exportado como stub que simplemente resuelve 200
    fetchConAuth: vi.fn().mockResolvedValue(new Response('{}', { status: 200 })),
}

// ─── ingresoService ───────────────────────────────────────────────────────────

export const mockIngresoService = {
    registrarIngreso: vi.fn().mockResolvedValue(makeIngreso()),
    listarIngresos:   vi.fn().mockResolvedValue({
        content:       [makeIngreso()],
        page:          0,
        size:          20,
        totalElements: 1,
        totalPages:    1,
    }),
    eliminarIngreso:  vi.fn().mockResolvedValue(undefined),
    editarIngreso:    vi.fn().mockResolvedValue(makeIngreso()),
    getUbicaciones:   vi.fn().mockResolvedValue([]),
    getTiposVehiculo: vi.fn().mockResolvedValue([]),
}

export const mockIngresoServiceModule = {
    ingresoService: mockIngresoService,
}

// ─── salidaService ────────────────────────────────────────────────────────────

export const mockSalidaService = {
    obtenerPorId:      vi.fn().mockResolvedValue(makeIngreso()),
    buscarActivoPorPlaca: vi.fn().mockResolvedValue(makeIngreso()),
    confirmarSalida:   vi.fn().mockResolvedValue({
        ...makeIngreso({ estadoIngreso: 'SALIDO', valorCobrado: 5000 }),
        valorCobrado: 5000,
    }),
}

export const mockSalidaServiceModule = {
    salidaService: mockSalidaService,
}

// ─── outboxService ────────────────────────────────────────────────────────────

export const mockOutboxService = {
    getAll:           vi.fn().mockResolvedValue([]),
    enqueue:          vi.fn().mockResolvedValue({ id: 'mock-id', type: 'INGRESO', payload: {}, createdAt: Date.now(), retries: 0 }),
    remove:           vi.fn().mockResolvedValue(undefined),
    incrementRetries: vi.fn().mockResolvedValue(null),
    getPendientes:    vi.fn().mockResolvedValue([]),
    getMuertas:       vi.fn().mockResolvedValue([]),
    count:            vi.fn().mockResolvedValue(0),
    clear:            vi.fn().mockResolvedValue(undefined),
}

export const mockOutboxServiceModule = {
    outboxService: mockOutboxService,
    MAX_RETRIES:   3,
    ORDEN_TIPO:    {
        INGRESO: 0, INGRESO_EDITAR: 1, SALIDA: 2,
        UBICACION: 3, UBICACION_EDITAR: 4, UBICACION_BORRAR: 5,
    },
}

// ─── syncService ──────────────────────────────────────────────────────────────

export const mockSyncService = {
    procesarOutbox:  vi.fn().mockResolvedValue({ procesadas: 0, exitosas: 0, fallidas: 0, muertas: 0 }),
    isSincronizando: vi.fn().mockReturnValue(false),
}

export const mockSyncServiceModule = {
    syncService: mockSyncService,
}

// ─── refDataService ───────────────────────────────────────────────────────────

export const mockRefDataService = {
    syncToIndexedDB:    vi.fn().mockResolvedValue(undefined),
    getUbicaciones:     vi.fn().mockResolvedValue([]),
    getTiposVehiculo:   vi.fn().mockResolvedValue([]),
    getTarifas:         vi.fn().mockResolvedValue([]),
    getTarifaPorTipo:   vi.fn().mockResolvedValue(null),
}

export const mockRefDataServiceModule = {
    refDataService: mockRefDataService,
}

// ─── Helper: resetear todos los mocks entre tests ─────────────────────────────
// Llama a esto en un beforeEach global o por archivo si necesitas estado limpio.

export function resetAllServiceMocks() {
    vi.clearAllMocks()

    // Restaurar valores por defecto después del clearAllMocks
    mockAuthService.login.mockResolvedValue(makeLoginResponse())
    mockAuthService.logout.mockResolvedValue(undefined)
    mockAuthService.getToken.mockResolvedValue('token-test-123')
    mockAuthService.getUser.mockResolvedValue(makeUser())
    mockAuthService.isAuthenticated.mockResolvedValue(true)

    mockIngresoService.listarIngresos.mockResolvedValue({
        content: [makeIngreso()], page: 0, size: 20, totalElements: 1, totalPages: 1,
    })
    mockIngresoService.registrarIngreso.mockResolvedValue(makeIngreso())
    mockIngresoService.eliminarIngreso.mockResolvedValue(undefined)
    mockIngresoService.editarIngreso.mockResolvedValue(makeIngreso())

    mockOutboxService.getAll.mockResolvedValue([])
    mockOutboxService.count.mockResolvedValue(0)
    mockOutboxService.getPendientes.mockResolvedValue([])
    mockOutboxService.getMuertas.mockResolvedValue([])

    mockSyncService.isSincronizando.mockReturnValue(false)
    mockSyncService.procesarOutbox.mockResolvedValue({ procesadas: 0, exitosas: 0, fallidas: 0, muertas: 0 })

    mockRefDataService.syncToIndexedDB.mockResolvedValue(undefined)
}

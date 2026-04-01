// jest-dom matchers para Vitest — importación directa (API v6+)
import '@testing-library/jest-dom'
// vi se importa explícitamente para que TypeScript/SonarLint no lo marquen como
// "Cannot find name 'vi'". Vitest lo inyecta como global (globals:true en vite.config.ts)
// pero el type checker no lo detecta sin este import en el archivo de setup.
import { vi } from 'vitest'

// ─── Mock: window.matchMedia ──────────────────────────────────────────────────
// jsdom no implementa matchMedia; Ionic lo requiere al montar componentes.
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
})

// ─── Mock: idb-keyval ─────────────────────────────────────────────────────────
// Todos los services (authService, outboxService, ingresoService, refDataService)
// usan idb-keyval. jsdom no tiene IndexedDB real, así que mockeamos con un Map.
vi.mock('idb-keyval', () => {
    const store = new Map<string, unknown>()
    return {
        get:    vi.fn((key: string) => Promise.resolve(store.get(key))),
        set:    vi.fn((key: string, val: unknown) => { store.set(key, val); return Promise.resolve() }),
        del:    vi.fn((key: string) => { store.delete(key); return Promise.resolve() }),
        clear:  vi.fn(() => { store.clear(); return Promise.resolve() }),
        keys:   vi.fn(() => Promise.resolve([...store.keys()])),
        entries: vi.fn(() => Promise.resolve([...store.entries()])),
        __store: store,
    }
})

// ─── Mock: fetch global ───────────────────────────────────────────────────────
// Los tests que necesiten simular llamadas HTTP deben sobrescribir
// global.fetch con vi.fn() en su propio beforeEach.
// Aquí se deja un stub que rechaza por defecto para evitar fetch real.
global.fetch = vi.fn(() =>
    Promise.reject(new Error('[setupTests] fetch no mockeado en este test'))
) as typeof fetch

// ─── Mock: navigator.onLine ───────────────────────────────────────────────────
// AppProvider lee navigator.onLine al inicializar su estado.
// Los tests pueden sobrescribir el valor con:
//   Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })
Object.defineProperty(navigator, 'onLine', {
    writable:     true,
    configurable: true,
    value:        true,
})

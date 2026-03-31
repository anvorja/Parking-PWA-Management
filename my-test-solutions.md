# Soluciones y lecciones aprendidas — Testing Frontend
> Parking PWA Management | Inicio: 2026-03-31

---

## Problema 1 — `@testing-library/jest-dom/extend-expect` deprecado con Vitest

**Archivo afectado:** `src/setupTests.ts`

**Síntoma:**
Importar `@testing-library/jest-dom/extend-expect` (API de Jest-DOM v5) genera
warnings o fallos silenciosos en matchers como `toBeInTheDocument()` cuando se
usa con Vitest, porque el punto de entrada `/extend-expect` asume el entorno
global de Jest, no de Vitest.

**Causa raíz:**
La API `extend-expect` está diseñada para extender el `expect` de Jest directamente.
Vitest expone su propio `expect` y la forma correcta de registrar los matchers
es con la importación directa del package.

**Solución aplicada:**
```ts
// ❌ Antes (API antigua — Jest-DOM v5 / extend-expect)
import '@testing-library/jest-dom/extend-expect'

// ✅ Después (importación directa — compatible con Vitest)
import '@testing-library/jest-dom'
```

**Cuándo se repite:**
Si alguien añade un nuevo setup file o copia código de tutoriales viejos de
CRA/Jest. Siempre usar la importación directa con Vitest.

---

## Problema 2 — `idb-keyval` no funciona en jsdom

**Archivos afectados:** cualquier test que importe services que usen `get/set` de `idb-keyval`

**Síntoma:**
Error: `IDBFactory is not defined` o los gets/sets resuelven `undefined`
inesperadamente, haciendo que los tests fallen con comportamientos raros.

**Causa raíz:**
jsdom no implementa la API de IndexedDB. `idb-keyval` depende de `IDBKeyRange`
e `IDBFactory`, que son APIs del navegador real.

**Solución aplicada:**
Mock global en `setupTests.ts` que reemplaza todo el módulo `idb-keyval`
con un `Map` en memoria:

```ts
vi.mock('idb-keyval', () => {
    const store = new Map<string, unknown>()
    return {
        get:  vi.fn((key) => Promise.resolve(store.get(key))),
        set:  vi.fn((key, val) => { store.set(key, val); return Promise.resolve() }),
        del:  vi.fn((key) => { store.delete(key); return Promise.resolve() }),
        clear: vi.fn(() => { store.clear(); return Promise.resolve() }),
    }
})
```

**Importante:** el `store` es compartido entre tests dentro de la misma suite.
Si un test escribe en IDB y el siguiente lo lee, puede haber contaminación.
Solución: llamar `vi.clearAllMocks()` en `beforeEach`, o limpiar el store
manualmente si el test depende de estado IDB específico.

---

## Problema 3 — `window.matchMedia` no implementado en jsdom

**Archivos afectados:** cualquier test que renderice componentes de Ionic

**Síntoma:**
`TypeError: window.matchMedia is not a function` al renderizar
`IonApp`, `IonModal`, `IonButton`, etc.

**Causa raíz:**
Ionic usa `window.matchMedia` para detectar el modo oscuro/claro y
otros media queries. jsdom no lo implementa.

**Solución aplicada en `setupTests.ts`:**
```ts
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
        matches: false, media: query, onchange: null,
        addListener: vi.fn(), removeListener: vi.fn(),
        addEventListener: vi.fn(), removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
})
```

**Nota:** usar `Object.defineProperty` con `writable: true` en lugar de
asignación directa (`window.matchMedia = ...`) porque jsdom puede tener
el descriptor con `writable: false` en algunas versiones.

---

## Problema 4 — `useHistory` en AuthProvider requiere Router context

**Archivos afectados:** tests de `AuthProvider`

**Síntoma:**
`Error: Invariant failed: You should not use <Route> outside a <Router>`
o `useHistory: hooks can only be used inside a <Router>` al renderizar
`AuthProvider` sin wrapping de router.

**Causa raíz:**
`AuthProvider` llama `useHistory()` al nivel del componente (no en un efecto),
por lo que falla si no hay un `Router` en el árbol.

**Solución aplicada:**
El helper `renderWithProviders()` incluye `MemoryRouter` + `IonReactRouter`
por defecto. Los tests del `AuthProvider` usan este helper y no necesitan
añadir el router manualmente.

```tsx
// ✅ Correcto — renderWithProviders incluye el router
renderWithProviders(<AuthProvider><TestConsumer /></AuthProvider>, {
    authValue: undefined  // sin AuthContext mock — queremos el real
})
```

---

## Convenciones adoptadas

| Convención | Razón |
|---|---|
| `vi.mock(...)` en el cuerpo del test file (no en setupTests) | Cada archivo de test tiene su propio scope de mocks |
| Factories (`makeIngreso()`, `makeUser()`) siempre con defaults completos | Evita TypeScript errors por campos faltantes |
| `resetAllServiceMocks()` en `beforeEach` de suites complejas | Previene contaminación de estado entre tests |
| `renderWithProviders()` para cualquier componente que use contexto | Consistencia + menos boilerplate |
| Mocks de servicios declarados con `vi.fn()` (no `vi.spyOn`) | Los services son módulos ES, no instancias con prototype |

---

## Problema 5 — Unhandled rejection cuando login() falla en test de AuthProvider

**Archivo afectado:** `src/providers/AuthProvider.test.tsx`

**Síntoma:**
Vitest reporta "Unhandled Rejection: Error: Credenciales inválidas" aunque el test pasa.
El error aparece porque el botón de login en el componente consumidor del test
llama `login(...)` sin `.catch()`, y `login()` en AuthProvider re-lanza el error
(el `finally` no suprime la excepción).

**Causa raíz:**
`AuthProvider.login()` usa `try/finally` — el `finally` setea `isLoading = false`
pero la excepción sigue propagándose. El `onClick` del botón en el test no la captura.

**Solución aplicada:**
Añadir `.catch(() => {})` en el `onClick` del componente consumidor del test:
```tsx
// ❌ Antes
<button onClick={() => login({ username: 'admin', password: 'pass' })}>Login</button>

// ✅ Después
<button onClick={() => login({ username: 'admin', password: 'pass' }).catch(() => {})}>Login</button>
```

**Regla general:**
En cualquier componente consumidor de test que invoque funciones async que pueden
rechazar, siempre añadir `.catch(() => {})` para evitar unhandled rejections.
El test ya verifica el estado resultante — no necesita capturar el error explícitamente.

---

---

## Problema 6 — `getByRole` no encuentra el botón cuando su texto cambia a spinner

**Archivo afectado:** `src/pages/Login.test.tsx` (test 6)

**Síntoma:**
```
Unable to find an element with role: button, name: /ingresar/i
```
El test falla porque después de hacer click, el botón cambia su contenido interno
de `<span>Ingresar</span>` a `<IonSpinner />`, por lo que el accessible name
deja de coincidir con `/ingresar/i`.

**Causa raíz:**
`getByRole('button', { name: /ingresar/i })` vuelve a buscar en el DOM tras el
re-render. Cuando `isSubmitting = true`, el botón muestra un spinner sin texto.

**Solución aplicada:**
Guardar la referencia al elemento DOM **antes** del click. El elemento sigue siendo
el mismo nodo DOM incluso después del re-render — solo cambian sus hijos.
```tsx
// ✅ Guardar ref ANTES del click
const submitBtn = screen.getByRole('button', { name: /ingresar/i });
fireEvent.click(submitBtn);

// La referencia sigue apuntando al mismo nodo
await waitFor(() => { expect(submitBtn).toBeDisabled(); });
```

---

## Problema 7 — `getByText(/Sin conexión/i)` encuentra múltiples nodos

**Archivo afectado:** `src/pages/Entrada.test.tsx`

**Síntoma:**
```
Found multiple elements with the text: /Sin conexión/i
```
La página Entrada tiene DOS lugares con "Sin conexión":
1. El badge de estado en el header (`estadoRed === 'offline'`)
2. El mensaje del toast local del componente

**Solución aplicada:**
Usar un texto más específico que solo aparezca en el toast:
```tsx
// ❌ Ambiguo — coincide con el badge del header también
expect(screen.getByText(/Sin conexión/i)).toBeInTheDocument()

// ✅ Solo el toast tiene este texto completo
expect(screen.getByText(/el ingreso se registrará al recuperar la red/i)).toBeInTheDocument()
```

**Regla general:**
Cuando un componente tiene múltiples elementos con texto similar (badge de estado + toast),
siempre usar la parte del texto que sea única al elemento que quieres verificar.

---

---

## Problema 8 — Verificar redirección de `history.replace` en AuthProvider

**Archivos afectados:** `src/providers/AuthProvider.test.tsx`

**Síntoma:**
Los tests de `logout()` y `SESSION_EXPIRED_EVENT` solo verificaban que el estado se limpiaba, pero no que se redirigía a `/login`. El AuthProvider llama `history.replace('/login')` pero no había forma de interceptarlo en los tests sin mock explícito.

**Causa raíz:**
Los tests renderizaban AuthProvider dentro de MemoryRouter + IonReactRouter — esto provee contexto de router real, pero `history.replace(...)` no tiene efectos observables en jsdom (no hay navegación real). Sin mock, no se puede verificar si fue llamado ni con qué argumento.

**Solución aplicada:**
Mockear `useHistory` de `react-router-dom` para capturar las llamadas a `replace`:

```ts
const mockHistoryReplace = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
    const actual = await importOriginal<typeof import('react-router-dom')>()
    return {
        ...actual,
        useHistory: () => ({ replace: mockHistoryReplace }),
    }
})
// Limpiar en beforeEach:
mockHistoryReplace.mockReset()
```

**Importante:** usar `...actual` para preservar el resto del módulo (MemoryRouter, Route, etc.), solo sobreescribir `useHistory`. El mock afecta a todos los tests del archivo, pero como los demás tests no verificaban redirección, no hay regresión.

**Cuándo se repite:**
Siempre que un Provider o componente llame `history.push/replace` y se quiera verificar la navegación en un test unitario.

---

## Convención — Estructura de tests migrados de A a B

| Criterio | Decisión |
|---|---|
| Tests de redirección (logout, session expired) | Mock `useHistory` con `vi.fn()` — no depender del router real |
| Tests de sincronización (sync automático, estado sincronizando) | Usar `OutboxEntry` tipado en los mocks para evitar errores de TypeScript |
| Tests de UI post-acción (tiquete, resumen de cobro) | Usar el `renderEntrada` / `renderSalida` helper existente + `waitFor` |

---

_Documento actualizado a medida que se encuentran nuevos problemas._

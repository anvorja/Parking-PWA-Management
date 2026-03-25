/// <reference types="vitest" />

import legacy from '@vitejs/plugin-legacy'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
//
// defineConfig recibe la función con { mode } para poder leer las variables
// de entorno con loadEnv ANTES de que Vite las inyecte en import.meta.env.
// Esto es necesario porque el urlPattern del Service Worker se serializa
// como string en build time: import.meta.env NO existe en el contexto del SW.
// loadEnv resuelve el valor real (p.ej. https://parking-api-1kwr.onrender.com)
// y lo embebe como literal en el closure del urlPattern.
export default defineConfig(({ mode }) => {
  // Carga las variables del .env correspondiente al mode (development/production)
  // El tercer argumento '' hace que cargue TODAS las variables, no solo las VITE_
  const env = loadEnv(mode, process.cwd(), '')
  const apiUrl = env.VITE_API_URL || ''

  return {
    plugins: [
      react(),
      legacy(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',

        // El SW se genera en el build; en dev se puede probar con `vite build && vite preview`
        devOptions: {
          enabled: false,
        },

        // Qué archivos incluir en el precacheo (assets estáticos del build)
        includeAssets: ['favicon.png', 'assets/**/*'],

        workbox: {
          // Fallback para navegación SPA: todas las rutas no-asset sirven index.html desde caché
          navigateFallback: '/index.html',

          // MUY IMPORTANTE: excluir rutas de la API del precacheo
          // Sin esto el SW intenta pre-cachear respuestas de la API en build
          // y rompe la autenticación JWT
          navigateFallbackDenylist: [/^\/api\//],
          globIgnores: ['**/api/**'],

          runtimeCaching: [
            {
              // API REST → NetworkFirst
              // Intenta la red primero; si falla (offline) sirve desde caché.
              // networkTimeoutSeconds: 5 → si el backend tarda más de 5s, usa caché.
              //
              // IMPORTANTE: apiUrl se resuelve en build time via loadEnv y se embebe
              // como string literal en el SW generado. No se usa import.meta.env aquí
              // porque ese objeto no existe en el contexto del Service Worker.
              urlPattern: ({ url }: { url: URL }) => {
                if (apiUrl) {
                  // Producción: URL absoluta del backend en Render
                  return url.href.startsWith(apiUrl + '/api/')
                }
                // Desarrollo: proxy local /api/
                return url.pathname.startsWith('/api/')
              },
              handler: 'NetworkFirst' as const,
              options: {
                cacheName: 'api-cache',
                networkTimeoutSeconds: 5,
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24, // 24 horas
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              // Assets estáticos → CacheFirst
              // Sirve desde caché; actualiza en background (stale-while-revalidate implícito)
              urlPattern: ({ request }: { request: Request }) =>
                  request.destination === 'style' ||
                  request.destination === 'script' ||
                  request.destination === 'font' ||
                  request.destination === 'image',
              handler: 'CacheFirst' as const,
              options: {
                cacheName: 'assets-cache',
                expiration: {
                  maxEntries: 60,
                  maxAgeSeconds: 60 * 60 * 24 * 30, // 30 días
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },

        // manifest.json lo manejamos manualmente en /public/manifest.json
        // para tener control total sobre los íconos y campos
        manifest: false,
      }),
    ],

    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/setupTests.ts',
    },

    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:8090',
          changeOrigin: true,
        },
      },
    },
  }
})

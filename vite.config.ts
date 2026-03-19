/// <reference types="vitest" />

import legacy from '@vitejs/plugin-legacy'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
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
            // Intenta la red primero; si falla (offline) sirve desde caché
            // networkTimeoutSeconds: 5 → si el backend tarda más de 5s, usa caché
            urlPattern: ({ url }) => {
              const apiBase = import.meta.env.VITE_API_URL || ''
              if (apiBase) {
                // Producción: URL absoluta del backend en Render
                return url.href.startsWith(apiBase + '/api/')
              }
              // Desarrollo: proxy local /api/
              return url.pathname.startsWith('/api/')
            },
            handler: 'NetworkFirst',
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
            urlPattern: ({ request }) =>
                request.destination === 'style' ||
                request.destination === 'script' ||
                request.destination === 'font' ||
                request.destination === 'image',
            handler: 'CacheFirst',
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
})
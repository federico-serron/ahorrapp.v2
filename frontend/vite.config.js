import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'generateSW',
      manifest: {
        name: 'AhorrApp',
        short_name: 'AhorrApp',
        description: 'Finance tracker con NLP vía n8n',
        lang: 'es', // el plugin asume 'en' por defecto; la app es toda en español
        // Coincide con el redirect de Layout.jsx ('/' -> '/dashboard'),
        // así la app instalada no hace un salto extra al abrir.
        start_url: '/dashboard',
        display: 'standalone',
        theme_color: '#030712', // Tailwind gray-950, el fondo dark de Layout.jsx
        background_color: '#ffffff', // bg-white del modo claro
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Precachea SOLO los assets del build. globPatterns globea el directorio
        // de salida (dist/), no URLs en runtime: ninguna respuesta de la API puede
        // entrar acá. Junto con la ausencia total de reglas de runtimeCaching, es
        // lo que garantiza FR-005 (nunca cachear datos de sesión ni financieros).
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],

        // NO agregar runtimeCaching sin leer specs/006-pwa-installable/research.md
        // (Decisión 3). En PRODUCCIÓN el backend comparte origen con el frontend
        // (un solo contenedor Flask sirve el SPA y la API), así que una regla
        // catch-all cachearía datos financieros del usuario. Si alguna vez hace
        // falta cachear algo de red, acotar la regla a ese origen/patrón exacto.

        // El backend comparte origen en producción, así que hay que excluir sus
        // rutas del navigateFallback: sin esto, el service worker respondería con
        // el shell del SPA a una navegación directa a la API en vez de dejarla
        // llegar a Flask. Estos 4 prefijos son los blueprints reales registrados
        // en backend/app/__init__.py. OJO: este fallo no se reproduce en dev,
        // donde frontend (:5173) y backend (:5100) están en puertos distintos.
        navigateFallbackDenylist: [
          /^\/user/,
          /^\/transaction/,
          /^\/category/,
          /^\/public/,
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: './vitest.setup.js',
    globals: true,
  },
})

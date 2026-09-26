# Quickstart: Validar la PWA instalable

## Prerrequisitos

- `cd frontend && npm install` (trae `vite-plugin-pwa` como devDependency nueva).
- Un build de producción real — el service worker **no** se genera en modo dev por defecto:
  `npm run build && npm run preview` (o servir `dist/` con cualquier servidor estático HTTPS/
  localhost).

## US1 — Instalabilidad (Android/Chrome)

1. Abrir la app servida (build de producción) en Chrome de escritorio o Android.
2. DevTools → pestaña **Application** → **Manifest**: confirmar que carga sin errores y muestra
   nombre, íconos y `display: standalone` según `contracts/pwa-manifest-contract.md`.
3. DevTools → **Lighthouse** → categoría PWA → correr auditoría → debe pasar el criterio de
   instalabilidad ("Web app manifest meets the installability requirements").
4. En un Android real (o emulado): confirmar que Chrome ofrece el banner/menú "Instalar app" o
   "Agregar a pantalla de inicio", y que el resultado tiene el ícono correcto.

## US1 — Instalabilidad (iOS/Safari)

1. Abrir la app en Safari de un iPhone (real — el simulador de iOS no siempre refleja el
   comportamiento de "Agregar a inicio" con fidelidad).
2. Botón de compartir → "Agregar a pantalla de inicio".
3. Confirmar que el ícono propuesto es `apple-touch-icon.png` (no una captura de pantalla
   genérica de la página) y el nombre es "AhorrApp".

## US2 — Pantalla completa

1. Abrir la app desde el ícono instalado (no desde una pestaña de Safari/Chrome).
2. Confirmar que no hay barra de direcciones ni controles de navegador visibles.
3. Confirmar que la barra de estado del sistema usa el `theme_color` configurado (`#030712`).

## US3 — Shell offline

1. Con conexión, cargar la app instalada al menos una vez (para que el service worker precachee
   el shell).
2. Activar modo avión / cortar la red.
3. Reabrir la app: el layout, estilos y navegación deben aparecer con normalidad; cualquier
   sección que necesite datos del backend debe mostrar un aviso de "sin conexión", no una
   pantalla en blanco ni el error nativo del navegador ("No internet connection").

## Verificación de FR-005 (no cachear datos de sesión/financieros)

1. Con la app instalada y con sesión iniciada, navegar a `/dashboard` (dispara requests
   autenticadas a `/transaction/`, `/category/`, etc.).
2. DevTools → **Application** → **Cache Storage**: inspeccionar las entradas que
   `vite-plugin-pwa`/Workbox creó.
3. Confirmar que **ninguna** entrada corresponde a una URL del backend
   (`VITE_BACKEND_URL`) — solo deben aparecer archivos estáticos del propio frontend
   (`index.html`, JS, CSS, íconos, fuentes).

## Verificación en producción (mismo origen) — NO se puede hacer con `npm run preview`

> **Por qué existe esta sección**: en dev, frontend (`:5173`) y backend (`:5100`) son orígenes
> distintos, así que el service worker del frontend nunca ve las URLs de la API. En producción
> **comparten origen** (un solo contenedor Flask sirve el SPA y la API). Todo lo que dependa de
> esa diferencia solo se puede validar en un build de producción real.

1. Construir y servir como en producción: levantar la imagen Docker, o copiar el resultado de
   `npm run build` a `backend/app/front/build` y arrancar Flask (`python -m app.run`), de modo
   que **un mismo origen** sirva el SPA y la API.
2. Abrir la app, dejar que el service worker se registre, y confirmar la sección "Verificación
   de FR-005" de arriba en este entorno (no solo en dev).
3. **Probar la denylist**: navegar **directamente por la barra de direcciones** a una ruta del
   backend, por ejemplo `/public/about`. Debe responder Flask (JSON), **no** el shell HTML del
   SPA. Si devuelve el HTML de la app, `navigateFallbackDenylist` está mal configurado o falta.
4. Repetir el paso 3 estando offline: debe fallar como una request de red normal, sin que el
   service worker sustituya la respuesta por el shell.

## Regresión (SC-005)

```bash
cd backend && venv/Scripts/python.exe -m pytest -q
cd frontend && npm run test && npm run build
```

Ambos deben seguir en verde — esta feature no debe tocar ningún comportamiento del baseline.

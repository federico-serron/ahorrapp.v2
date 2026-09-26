# Implementation Plan: PWA instalable en Android e iOS

**Branch**: `006-pwa-installable` | **Date**: 2026-09-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-pwa-installable/spec.md`

## Summary

Convertir el frontend Vite/React existente en una PWA instalable usando `vite-plugin-pwa`
(el plugin idiomático del propio ecosistema Vite que ya usa el proyecto — sin introducir un
framework nuevo). Genera `manifest.webmanifest` (equivalente moderno del clásico
`manifest.json`) y un service worker vía Workbox con estrategia `generateSW`, cacheando
únicamente el shell estático de la app. El backend Flask, los modelos y las rutas quedan sin
tocar — esta feature es 100% frontend.

## Technical Context

**Language/Version**: JavaScript (React 19) + Vite 6 — mismo stack que el resto del frontend

**Primary Dependencies**: `vite-plugin-pwa` (nueva dependencia de build, no runtime pesado —
genera el manifest y el service worker en base a config declarativa; usa Workbox internamente,
sin que el proyecto tenga que aprender su API de bajo nivel)

**Storage**: N/A — no hay entidades de datos nuevas; el "storage" relevante es el Cache Storage
del navegador, gestionado por el service worker generado

**Testing**: Vitest (ya configurado en el proyecto desde `fix/mechanical-bugs-batch1`) para
validar configuración; verificación manual con Lighthouse/DevTools para los criterios de
instalabilidad (no hay forma de automatizar "Chrome ofrece instalar la app" en CI)

**Target Platform**: Navegadores móviles (Chrome/Android, Safari/iOS) y de escritorio como
fallback — mismo frontend, sin build separado por plataforma

**Project Type**: Web application existente (cambio confinado a `frontend/`)

**Performance Goals**: El bundle del service worker no debe añadir una regresión perceptible al
tiempo de carga inicial (Workbox es liviano, <5kb gzip para el runtime base)

**Constraints**: FR-005 es la restricción dura de este plan — el service worker NO debe
cachear ninguna response de `VITE_BACKEND_URL` (otro origen: `localhost:5100` en dev, dominio de
prod). Se logra por **omisión deliberada**: no se define ningún `runtimeCaching` para ese origen,
así que Workbox nunca los intercepta ni cachea — no hace falta una regla de exclusión explícita,
alcanza con no agregar una de inclusión.

**Scale/Scope**: Cambios en `frontend/vite.config.js`, `frontend/index.html`, nuevos assets de
íconos en `frontend/public/`, un componente chico de aviso de actualización/offline en React.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Chequeo | Resultado |
|---|---|---|
| VIII — PWA Standalone con Capacitor a Futuro | Es exactamente la implementación de este principio: manifest, service worker, iconos, viewport correctos; sin cachear datos autenticados; sin usar APIs de navegador que Capacitor no pueda puentear (Workbox/Cache API son estándar web, compatibles con WebView). | PASS |
| IX — Estabilidad de estructura | No se reestructura ninguna carpeta existente; se agregan archivos nuevos (`public/icons/*`, config de plugin) sin tocar modelos ni servicios del backend. | PASS |
| Security Requirements (PWA) | "El manifest y el service worker no deben exponer ni cachear tokens, cookies o datos de transacciones" — cumplido por la estrategia de omisión descripta arriba (Constraints). | PASS |
| VII — Cobertura de tests | Se agrega verificación (manual, vía quickstart) dado que la instalabilidad real de un navegador no es unit-testeable; se documenta explícitamente por qué no hay test automatizado para esa parte. | PASS (con nota) |

No hay violaciones que requieran justificación en Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/006-pwa-installable/
├── plan.md              # Este archivo
├── research.md          # Fase 0
├── data-model.md         # Fase 1 (sin entidades — se documenta por qué)
├── quickstart.md         # Fase 1
├── contracts/
│   └── pwa-manifest-contract.md   # Campos exactos del manifest y su justificación
└── tasks.md              # Fase 2 (/speckit-tasks, no generado por este comando)
```

### Source Code (repository root)

```text
frontend/
├── vite.config.js              # Agregar plugin VitePWA con manifest + workbox config
├── index.html                  # Agregar meta tags iOS (apple-touch-icon, theme-color, viewport ya existe)
├── public/
│   ├── ahorrapp.png            # Ya existe — fuente para generar los tamaños nuevos
│   ├── pwa-192x192.png         # NUEVO — ícono Android estándar
│   ├── pwa-512x512.png         # NUEVO — ícono Android estándar (splash)
│   ├── maskable-icon-512x512.png  # NUEVO — ícono maskable (Android adaptable)
│   └── apple-touch-icon.png    # NUEVO — ícono iOS (180x180)
├── src/
│   └── components/
│       └── PwaUpdatePrompt.jsx  # NUEVO — aviso de "app lista offline" / "hay actualización"
└── package.json                 # +1 devDependency: vite-plugin-pwa
```

**Structure Decision**: Cambio 100% confinado a `frontend/`. No se toca `backend/` ni
`specs/001-project-baseline/` — es una capa agregada, consistente con FR-008 de la spec.

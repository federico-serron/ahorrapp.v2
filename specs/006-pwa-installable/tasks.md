---

description: "Task list for making the frontend an installable PWA"
---

# Tasks: PWA instalable en Android e iOS

**Input**: Design documents from `/specs/006-pwa-installable/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/pwa-manifest-contract.md, quickstart.md

**Tests**: La instalabilidad real de un navegador no es unit-testeable (requiere Lighthouse/
dispositivo real, ver `quickstart.md`); se agrega solo un test de sanidad de config donde tiene
sentido (que el plugin esté registrado, que el build no rompa).

**Organization**: Foundational (instalar y configurar el plugin) habilita las 3 user stories.
US1 y US2 comparten la misma configuración base y se verifican juntas en la práctica (no tiene
sentido separarlas en código, solo en la verificación manual). US3 (shell offline) depende de que
Foundational + US1/US2 ya generen el service worker correctamente.

## Format: `[ID] [P?] [Story] Description`

## Path Conventions

`frontend/` (raíz del subproyecto), `frontend/public/`, `frontend/src/`. No se toca `backend/`.

---

## Phase 1: Setup

- [ ] T001 En `frontend/`, correr `npm install -D vite-plugin-pwa` (agrega la dependencia de
  build; no es runtime pesado, ver `research.md` Decisión 1).
- [ ] T002 Generar los 4 íconos requeridos a partir de `frontend/public/ahorrapp.png` (ver
  `contracts/pwa-manifest-contract.md` → tabla de íconos) y guardarlos en `frontend/public/`:
  `pwa-192x192.png`, `pwa-512x512.png`, `maskable-icon-512x512.png` (con padding de seguridad
  para maskable, no el logo a sangre), `apple-touch-icon.png` (180×180, sin transparencia — iOS
  no la respeta y se ve mal).

**Checkpoint**: Los 4 archivos de ícono existen en `frontend/public/`, dependencia instalada.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Configurar el plugin con el manifest y la estrategia de cache — sin esto, ninguna
user story es verificable.

- [ ] T003 En `frontend/vite.config.js`, importar `VitePWA` de `vite-plugin-pwa` y agregarlo a
  `plugins`, con `registerType: 'autoUpdate'` y `strategy: 'generateSW'` (default explícito, ver
  `research.md` Decisión 2).
- [ ] T004 En el mismo bloque de config de T003, definir `manifest` con exactamente los campos
  de `contracts/pwa-manifest-contract.md`: `name`, `short_name`, `description`, `start_url:
  "/dashboard"`, `display: "standalone"`, `theme_color: "#030712"`, `background_color:
  "#ffffff"`, e `icons` (las 3 entradas del manifest — `apple-touch-icon.png` NO va acá, es un
  `<link>` de HTML, ver T006).
- [ ] T005 En el mismo bloque, definir `workbox.globPatterns` para precachear los assets del
  build (`**/*.{js,css,html,ico,png,svg,webmanifest}`). **NO agregar ninguna entrada de
  `runtimeCaching`** — la ausencia deliberada de reglas para el origen del backend es lo que
  garantiza FR-005 (ver `research.md` Decisión 3). Si en el futuro se necesita cachear algo de
  otro origen (ej. Google Fonts), agregar esa regla de forma explícita y acotada, nunca un
  catch-all.
- [ ] T006 En `frontend/index.html`, agregar dentro de `<head>`: `<link rel="apple-touch-icon"
  href="/apple-touch-icon.png" sizes="180x180">` y `<meta name="theme-color" content="#030712">`
  (ver `research.md` Decisión 4 — necesarios para iOS, que no los toma del manifest).

**Checkpoint**: `npm run build` genera `dist/manifest.webmanifest` y `dist/sw.js` sin errores.
DevTools → Application → Manifest carga sin errores (primer chequeo de `quickstart.md`).

---

## Phase 3: User Story 1 - Instalar la app desde el navegador (Priority: P1) 🎯 MVP

**Goal**: Chrome/Android ofrece instalar la app; Safari/iOS permite "Agregar a pantalla de
inicio" con ícono y nombre correctos.

**Independent Test**: ver `quickstart.md` secciones "US1 — Instalabilidad (Android/Chrome)" y
"US1 — Instalabilidad (iOS/Safari)".

- [ ] T007 [US1] Ejecutar `npm run build && npm run preview` y correr una auditoría Lighthouse →
  PWA en el resultado — debe pasar el criterio de instalabilidad. Si falla, revisar contra
  `contracts/pwa-manifest-contract.md` cuál campo falta o está mal.
- [ ] T008 [US1] Validación manual en un dispositivo Android real (o emulado) y un iPhone real:
  confirmar que el ícono y nombre mostrados durante la instalación coinciden con los de
  `contracts/pwa-manifest-contract.md` (no el favicon genérico de Vite).

**Checkpoint**: US1 pasa — la app es instalable en ambas plataformas con la identidad correcta.

---

## Phase 4: User Story 2 - La app instalada se comporta como una app nativa (Priority: P1)

**Goal**: Abrir la app instalada la muestra a pantalla completa, sin controles de navegador, con
el color de tema correcto.

**Independent Test**: ver `quickstart.md` sección "US2 — Pantalla completa".

- [ ] T009 [US2] Instalar la app (resultado de US1) y abrirla desde el ícono del homescreen —
  confirmar visualmente que no hay barra de direcciones ni controles de navegador, y que la
  barra de estado del sistema usa el `theme_color` (`#030712`).

**Checkpoint**: US2 pasa — la app instalada es visualmente indistinguible de una app nativa en
cuanto a chrome de UI.

---

## Phase 5: User Story 3 - Shell disponible sin conexión (Priority: P2)

**Goal**: El shell visual de la app carga sin conexión tras haber sido abierto una vez con
conexión; los datos que requieren red muestran un aviso claro, no una pantalla en blanco.

**Independent Test**: ver `quickstart.md` sección "US3 — Shell offline".

- [ ] T010 [US3] Crear `frontend/src/components/PwaUpdatePrompt.jsx`: usa el hook
  `useRegisterSW` del módulo virtual `virtual:pwa-register/react` (ver `research.md` Decisión 5)
  para mostrar, vía `react-hot-toast` (ya en el proyecto), un aviso cuando `offlineReady` se
  vuelve `true` ("App lista para funcionar sin conexión") y otro cuando `needRefresh` se vuelve
  `true` ("Hay una versión nueva disponible", con acción para actualizar).
- [ ] T011 [US3] Montar `<PwaUpdatePrompt />` una vez en `frontend/src/Layout.jsx` (junto al
  `<Toaster />` ya existente).
- [ ] T012 [US3] Verificar el edge case de FR-006 (dato no disponible offline → aviso, no
  pantalla en blanco): revisar que las acciones de `flux.js` que hacen `fetch` (`getTransactions`,
  `getCategories`, etc.) ya capturan el error de red en su `catch` y seteslan `store.error` — si
  algún componente que consume esas acciones no muestra ese `store.error` al usuario, agregar el
  render condicional mínimo necesario (no rediseñar el componente, solo mostrar el mensaje ya
  disponible en el store).

**Checkpoint**: `quickstart.md` sección "US3 — Shell offline" y "Verificación de FR-005" pasan
ambas.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T013 [P] Correr `cd backend && venv/Scripts/python.exe -m pytest -q` y confirmar que sigue
  en verde (SC-005 — esta feature no debería tocar el backend en absoluto).
- [ ] T014 [P] Correr `cd frontend && npm run test && npm run build` y confirmar que sigue en
  verde.
- [ ] T015 Ejecutar la sección "Verificación de FR-005" de `quickstart.md`: con sesión iniciada,
  confirmar en DevTools → Cache Storage que ninguna entrada corresponde a una URL de
  `VITE_BACKEND_URL`.
- [ ] T016 [P] Actualizar `specs/001-project-baseline/tasks.md` si corresponde: esta feature no
  proviene de un hallazgo del baseline (es una feature de producto nueva sobre el Principio VIII
  de la constitución), así que no hay ninguna tarea de `001-project-baseline` que marcar — se
  documenta esta feature como implementación del Principio VIII en el propio commit.

---

## Dependencies & Execution Order

- **Setup (Phase 1)**: sin dependencias — primer paso.
- **Foundational (Phase 2)**: depende de Setup completo (necesita los íconos y la dependencia
  instalada) — bloquea todo lo demás.
- **User Story 1 (Phase 3)** y **User Story 2 (Phase 4)**: ambas dependen solo de Foundational.
  Comparten la misma config base; se verifican en cualquier orden o juntas en la práctica (abrir
  la app instalada ejercita ambas a la vez).
- **User Story 3 (Phase 5)**: depende de Foundational (necesita el service worker generado) pero
  es independiente de US1/US2 en contenido — puede implementarse en paralelo con ellas.
- **Polish (Phase 6)**: depende de que las 3 stories estén completas.

### Parallel Example

```bash
# Una vez terminada Foundational (T003-T006), estas dos líneas de trabajo son independientes:
Task: "US1+US2: Lighthouse + validación manual en dispositivos (T007-T009)"
Task: "US3: PwaUpdatePrompt.jsx + verificación de FR-005 (T010-T012)"
```

## Implementation Strategy

**MVP = Setup + Foundational + US1** (T001-T008): con eso ya se cumple el pedido central ("los
usuarios pueden descargarse la webapp en su homepage"). US2 se valida casi gratis una vez que
US1 funciona (es la misma instalación, solo falta confirmar el modo pantalla completa). US3 es
la única pieza con trabajo de código real adicional (el componente de aviso) y puede hacerse en
paralelo o después, sin bloquear el resto.

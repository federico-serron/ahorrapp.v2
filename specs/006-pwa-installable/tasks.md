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

> **Revisado tras `/speckit-analyze`**: se agregó T006 (`navigateFallbackDenylist`, hallazgo C1)
> y T017 (verificación de FR-007, hallazgo C2), y se reescribió T013 nombrando explícitamente los
> flujos sin cobertura (hallazgo U1). Numeración actualizada en consecuencia.

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
  `<link>` de HTML, ver T007).
- [ ] T005 En el mismo bloque, definir `workbox.globPatterns` para precachear los assets del
  build (`**/*.{js,css,html,ico,png,svg,webmanifest}`). **NO agregar ninguna entrada de
  `runtimeCaching`** — la ausencia deliberada de reglas es lo que garantiza FR-005 junto con el
  hecho de que `globPatterns` solo globea `dist/` (ver `research.md` Decisión 3). Si en el
  futuro se necesita cachear algo de red (ej. Google Fonts), la regla debe ser **acotada a ese
  origen/patrón específico, nunca un catch-all** — en producción un catch-all incluiría la API
  de la propia app, porque comparte origen.
- [ ] T006 En el mismo bloque, definir `workbox.navigateFallbackDenylist` con los prefijos de
  los blueprints reales del backend: `[/^\/user/, /^\/transaction/, /^\/category/, /^\/public/]`
  (ver `research.md` Decisión 3b). **Motivo**: en producción el backend comparte origen con el
  frontend (un solo contenedor Flask sirve ambos), así que sin esta denylist el service worker
  respondería con el shell del SPA a cualquier navegación directa a una ruta de la API.
  **Atención**: este fallo **no se reproduce en dev** (ahí los puertos son distintos), así que
  no confiar en la prueba local para validar esta tarea — se valida en el build de producción
  (T016).
- [ ] T007 En `frontend/index.html`, agregar dentro de `<head>`: `<link rel="apple-touch-icon"
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

- [ ] T008 [US1] Ejecutar `npm run build && npm run preview` y correr una auditoría Lighthouse →
  PWA en el resultado — debe pasar el criterio de instalabilidad. Si falla, revisar contra
  `contracts/pwa-manifest-contract.md` cuál campo falta o está mal.
- [ ] T009 [US1] Validación manual en un dispositivo Android real (o emulado) y un iPhone real:
  confirmar que el ícono y nombre mostrados durante la instalación coinciden con los de
  `contracts/pwa-manifest-contract.md` (no el favicon genérico de Vite).

**Checkpoint**: US1 pasa — la app es instalable en ambas plataformas con la identidad correcta.

---

## Phase 4: User Story 2 - La app instalada se comporta como una app nativa (Priority: P1)

**Goal**: Abrir la app instalada la muestra a pantalla completa, sin controles de navegador, con
el color de tema correcto.

**Independent Test**: ver `quickstart.md` sección "US2 — Pantalla completa".

- [ ] T010 [US2] Instalar la app (resultado de US1) y abrirla desde el ícono del homescreen —
  confirmar visualmente que no hay barra de direcciones ni controles de navegador, y que la
  barra de estado del sistema usa el `theme_color` (`#030712`).

**Checkpoint**: US2 pasa — la app instalada es visualmente indistinguible de una app nativa en
cuanto a chrome de UI.

---

## Phase 5: User Story 3 - Shell disponible sin conexión (Priority: P2)

**Goal**: El shell visual de la app carga sin conexión tras haber sido abierto una vez con
conexión; los datos que requieren red muestran un aviso claro, no una pantalla en blanco.

**Independent Test**: ver `quickstart.md` sección "US3 — Shell offline".

- [ ] T011 [US3] Crear `frontend/src/components/PwaUpdatePrompt.jsx`: usa el hook
  `useRegisterSW` del módulo virtual `virtual:pwa-register/react` (ver `research.md` Decisión 5)
  para mostrar, vía `react-hot-toast` (ya en el proyecto), un aviso cuando `offlineReady` se
  vuelve `true` ("App lista para funcionar sin conexión") y otro cuando `needRefresh` se vuelve
  `true` ("Hay una versión nueva disponible", con acción para actualizar).
- [ ] T012 [US3] Montar `<PwaUpdatePrompt />` una vez en `frontend/src/Layout.jsx` (junto al
  `<Toaster />` ya existente).
- [ ] T013 [US3] Cubrir FR-006 en los **flujos de lectura**, que hoy no tienen aviso de error.
  Estado verificado del código: las acciones **mutantes** ya toastean `store.error`
  (`CategoriesPanel.jsx`, `TransactionsList.jsx`, `Dashboard.jsx`, `LoginModal.jsx`,
  `SignupModal.jsx`), pero las acciones de **lectura** de `frontend/src/js/store/flux.js` —
  `getTransactions`, `getCategories`, `getAnalytics`/`getLineAnalytics` — setean `store.error` y
  **ningún componente lo muestra**: offline, el dashboard renderiza listas vacías y totales en
  cero, sin decirle al usuario que no hay conexión. Agregar el render/aviso mínimo en los
  componentes que consumen esas tres lecturas (`TransactionsList.jsx`, `CategoriesPanel.jsx`,
  `AnalyticsPanel.jsx`) reutilizando el `store.error` ya disponible — no rediseñar los
  componentes ni cambiar las acciones del store.

**Checkpoint**: `quickstart.md` sección "US3 — Shell offline" y "Verificación de FR-005" pasan
ambas.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T014 [P] Correr `cd backend && venv/Scripts/python.exe -m pytest -q` y confirmar que sigue
  en verde (SC-005 — esta feature no debería tocar el backend en absoluto).
- [ ] T015 [P] Correr `cd frontend && npm run test && npm run build` y confirmar que sigue en
  verde.
- [ ] T016 Validar en un **build de producción servido por Flask** (no `npm run preview`, que no
  reproduce el mismo origen): levantar la imagen Docker o servir `dist/` desde
  `backend/app/front/build`, y confirmar (a) la sección "Verificación de FR-005" de
  `quickstart.md` — ninguna entrada de la API en Cache Storage — y (b) que una navegación
  directa a una ruta del backend (ej. `/public/about`) llega a Flask y **no** devuelve el shell
  del SPA, es decir que la denylist de T006 funciona.
- [ ] T017 [P] Verificar FR-007 (degradación en navegadores sin soporte de PWA): en DevTools →
  Application → Service Workers, marcar "Bypass for network" (o usar un perfil con service
  workers deshabilitados) y confirmar que la app sigue cargando y funcionando como web app
  normal, sin errores en consola por el registro fallido del service worker.
- [ ] T018 [P] Documentar en el commit que esta feature implementa el Principio VIII de la
  constitución. No hay ninguna tarea de `specs/001-project-baseline/tasks.md` que marcar — esta
  feature no proviene de un hallazgo del baseline (que está 13/13 completo), sino que es una
  feature de producto nueva.

---

## Dependencies & Execution Order

- **Setup (Phase 1)**: sin dependencias — primer paso.
- **Foundational (Phase 2)**: depende de Setup completo (necesita los íconos y la dependencia
  instalada) — bloquea todo lo demás. T003→T004→T005→T006 editan el **mismo bloque de config**
  en `vite.config.js`: aplicar en secuencia, no en paralelo. T007 (otro archivo) sí es paralela
  a esas.
- **User Story 1 (Phase 3)** y **User Story 2 (Phase 4)**: ambas dependen solo de Foundational.
  Comparten la misma config base; se verifican en cualquier orden o juntas en la práctica (abrir
  la app instalada ejercita ambas a la vez).
- **User Story 3 (Phase 5)**: depende de Foundational (necesita el service worker generado) pero
  es independiente de US1/US2 en contenido — puede implementarse en paralelo con ellas.
- **Polish (Phase 6)**: depende de que las 3 stories estén completas. T016 depende
  específicamente de T006 (es su única validación real).

### Parallel Example

```bash
# Una vez terminada Foundational (T003-T007), estas dos líneas de trabajo son independientes:
Task: "US1+US2: Lighthouse + validación manual en dispositivos (T008-T010)"
Task: "US3: PwaUpdatePrompt.jsx + avisos offline en flujos de lectura (T011-T013)"
```

## Implementation Strategy

**MVP = Setup + Foundational + US1** (T001-T009): con eso ya se cumple el pedido central ("los
usuarios pueden descargarse la webapp en su homepage"). US2 se valida casi gratis una vez que
US1 funciona (es la misma instalación, solo falta confirmar el modo pantalla completa). US3 es
la única pieza con trabajo de código real adicional (el componente de aviso + los avisos de
error en lecturas) y puede hacerse en paralelo o después, sin bloquear el resto.

**No saltear T016**: es la única tarea que valida el comportamiento de mismo-origen en
producción, que es justamente el que no se puede reproducir en el entorno de desarrollo.

---

description: "Task list for session revocation fix, PayPal removal, and orphaned view cleanup"
---

# Tasks: Revocación de sesión, baja de PayPal y limpieza de vistas huérfanas

**Input**: Design documents from `/specs/004-remove-paypal-cleanup/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Se agregan/eliminan tests según corresponda a cada story (agregar para US1, eliminar
los que testeaban lo borrado en US2).

**Organization**: 3 user stories mayormente independientes. Único punto de contacto real:
`backend/app/__init__.py`, tocado por US1 (T001) y US2 (T007) — deben aplicarse en secuencia
(cualquier orden), no simultáneamente por dos agentes distintos.

## Format: `[ID] [P?] [Story] Description`

## Path Conventions

`backend/app/`, `backend/tests/`, `frontend/src/`, raíz del repo (`docker-compose.yml`,
`.env.example`). Ver `contracts/removed-surface.md` para el inventario exacto de qué se borra.

---

## Phase 1: User Story 1 - Cerrar sesión invalida realmente el acceso (Priority: P1) 🎯 MVP

**Goal**: El JWT de una sesión cerrada con logout deja de ser aceptado de inmediato (ver
`contracts/session-revocation-contract.md`).

**Independent Test**: login → guardar cookie → logout → reintentar un endpoint protegido con esa
cookie → `401`.

- [X] T001 En `backend/app/__init__.py`, registrar `@jwt.token_in_blocklist_loader` sobre la
  instancia `jwt` ya creada: callback `check_if_token_revoked(jwt_header, jwt_payload)` que
  importa `BLACKLIST` de `app.blacklist` y devuelve `jwt_payload["jti"] in BLACKLIST`.
- [X] T002 En `backend/app/routes/user_bp.py::logout()`, descomentar/activar
  `jti = get_jwt()["jti"]; BLACKLIST.add(jti)` antes de `unset_jwt_cookies`.
- [X] T003 [US1] En `backend/tests/test_user_bp.py`, agregar a una clase `TestLogoutEndpoint`
  (nueva): test de que reutilizar la cookie tras logout en `GET /user/me` devuelve `401`; test
  de que una segunda sesión (segundo login) del mismo usuario sigue funcionando después de que la
  primera hace logout (revocación es por `jti`, no por usuario).

**Checkpoint**: `pytest tests/test_user_bp.py -k Logout -q` pasa; el resto de la suite de
`user_bp` sigue en verde (no rompe login/signup/edit/etc.).

---

## Phase 2: User Story 2 - La aplicación ya no ofrece pagos con PayPal (Priority: P2)

**Goal**: Cero rastro de PayPal alcanzable en backend o frontend (ver
`contracts/removed-surface.md`, secciones "Backend — PayPal" y "Frontend — PayPal").

**Independent Test**: `curl -X POST http://localhost:5100/paypal/create-order` → `404`;
`grep -ri paypal backend/app frontend/src` sin resultados funcionales.

### Backend

- [X] T004 [P] [US2] Eliminar `backend/app/routes/paypal_bp.py`.
- [X] T005 [P] [US2] Eliminar `backend/app/services/paypal_service.py`.
- [X] T006 [P] [US2] Eliminar `backend/tests/test_paypal_bp.py`.
- [X] T007 [US2] En `backend/app/__init__.py`, quitar el `import` de `paypal_bp` y su
  `app.register_blueprint(paypal_bp, url_prefix='/paypal')`. **Nota**: mismo archivo que T001 —
  aplicar en secuencia, no en paralelo con T001.
- [X] T008 [US2] En `backend/app/config.py`, quitar de la clase `Config` las 5 líneas
  `PAYPAL_CLIENT_ID`, `PAYPAL_SECRET`, `PAYPAL_API_BASE`, `PAYPAL_RETURN_URL`,
  `PAYPAL_CANCEL_URL`.
- [X] T009 [P] [US2] En `backend/.env.example`, quitar el bloque `#PAYPAL` y sus 5 variables.
- [X] T010 [P] [US2] En `docker-compose.yml`, quitar las 5 líneas `PAYPAL_*` del bloque
  `environment` del servicio `app`.

### Frontend

- [X] T011 [P] [US2] Eliminar `frontend/src/views/payment/paypal/` (carpeta completa:
  `Success.jsx`, `Cancel.jsx`).
- [X] T012 [P] [US2] Eliminar `frontend/src/components/payments/PaymentMethods/PayPal/`
  (carpeta completa).
- [X] T013 [P] [US2] Eliminar `frontend/src/js/store/flux.paypal.test.js`.
- [X] T014 [US2] En `frontend/src/js/store/flux.js`, quitar el bloque completo de líneas 431-487:
  incluye tanto el comentario padre `///// PAYMENT METHODS /////` (línea 431, que hoy envuelve
  exclusivamente a PayPal — no hay otro método de pago implementado en este archivo) como el
  comentario interno `/////////////////// PAYPAL /////////////////////` y las funciones
  `createOrderPayPal`/`captureOrderPayPal`. No dejar el header "PAYMENT METHODS" huérfano sin
  contenido debajo.
- [X] T015 [US2] En `frontend/src/Layout.jsx`, quitar los imports `PayPalSuccess`/`PayPalCancel`
  y las rutas `/paypal/success` y `/paypal/cancel`.
- [X] T016 [P] [US2] En `frontend/src/config/paymentMethods.js`, quitar la entrada `PAYPAL` de
  `PAYMENT_METHODS` (dejar `MERCADOPAGO` y `STRIPE` intactos).
- [X] T017 [P] [US2] En `frontend/.env.example`, quitar la línea `VITE_PAYPAL_CLIENT_ID`.

**Checkpoint**: `grep -ri paypal backend/app frontend/src` sin resultados; `pytest` backend y
`npm run build` frontend sin errores.

---

## Phase 3: User Story 3 - No quedan pantallas fantasma en el frontend (Priority: P3)

**Goal**: Los 4 archivos de vista no enrutados dejan de existir (ver
`contracts/removed-surface.md`, sección "Frontend — Vistas huérfanas").

**Independent Test**: `npm run build` compila sin warnings de imports rotos; `/dashboard` sigue
funcionando igual.

- [X] T018 [P] [US3] Eliminar `frontend/src/views/Home.jsx`.
- [X] T019 [P] [US3] Eliminar `frontend/src/views/HomeView.jsx`.
- [X] T020 [P] [US3] Eliminar `frontend/src/views/ContactView.jsx`.
- [X] T021 [P] [US3] Eliminar `frontend/src/views/PaymentMethodsView.jsx`. (Nota: es huérfana
  independientemente de T012 — no hay dependencia real de orden entre US2 y US3, ver
  `research.md` Decisión 2.)

**Checkpoint**: `npm run build` sin errores; ningún archivo restante importa alguno de los 4
borrados (confirmar con `grep`).

---

## Phase 4: Polish & Cross-Cutting Concerns

- [X] T022 Correr `cd backend && venv/Scripts/python.exe -m pytest -q` (sin `--ignore`) y
  confirmar 100% verde.
- [X] T023 [P] Correr `cd frontend && npm run test && npm run build` y confirmar 100% verde, sin
  warnings de imports rotos.
- [X] T024 [P] Actualizar `specs/001-project-baseline/tasks.md`: marcar **T003** resuelto (fix
  real), y **T004**/**T006**/**T012** resueltos — aclarando que T004/T006 se resolvieron
  **por eliminación de PayPal** (decisión de producto confirmada), no por el fix originalmente
  descripto en esos ítems.
- [X] T025 Validación manual según `quickstart.md`: reutilizar cookie tras logout → `401`;
  `POST /paypal/create-order` → `404`; navegar `/dashboard` sin regresiones visuales.

---

## Dependencies & Execution Order

- **User Story 1, 2 y 3**: independientes entre sí en cuanto a *contenido*, con una única
  restricción de *archivo compartido*: T001 (US1) y T007 (US2) tocan
  `backend/app/__init__.py` — deben aplicarse uno después del otro (el orden entre ellos no
  importa funcionalmente), nunca por dos agentes en paralelo sobre ese archivo.
- Dentro de US2: T004-T006, T009-T013, T016-T017 son paralelas entre sí (archivos distintos);
  T007, T008, T014, T015 tienen que esperar a que no haya otro proceso editando el mismo archivo
  a la vez, pero no dependen unas de otras en contenido.
- Dentro de US3: T018-T021 son completamente paralelas (4 archivos distintos, sin relación entre
  sí).
- **Polish (Phase 4)**: depende de que las 3 stories estén completas.

### Parallel Example

```bash
# US1 y US3 pueden arrancar en paralelo sin ningún conflicto de archivo:
Task: "US1: revocación de sesión (T001-T003)"
Task: "US3: borrar vistas huérfanas (T018-T021)"
# US2 puede arrancar también en paralelo, PERO su T007 debe esperar a que T001 (US1) termine
# de tocar app/__init__.py (o viceversa) para evitar un conflicto de edición concurrente:
Task: "US2: eliminar PayPal (T004-T017, con T007 secuenciado respecto a T001)"
```

## Implementation Strategy

Las 3 stories son de alcance chico y mayormente independientes. Orden sugerido: **US1 primero**
(P1, es el fix de seguridad real), después US2 y US3 en paralelo (delegables a subagentes
distintos ya que no comparten archivos entre sí — solo cada una internamente coordina su propio
`app/__init__.py`/`Layout.jsx` según corresponda).

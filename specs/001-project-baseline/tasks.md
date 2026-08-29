# Tasks: Bugs y deuda detectados en el baseline (001-project-baseline)

**Input**: Hallazgos de `spec.md` y de la auditoría hecha para `.specify/memory/constitution.md`.
**Created**: 2026-08-28
**Nota**: Este archivo se armó a mano (no vía `/speckit-tasks`), a pedido explícito del usuario.
No implica un plan de implementación formal (no hay `plan.md` para esta feature) — es un
tracking simple de correcciones pendientes sobre el baseline relevado.

## Backend — Seguridad / Autenticación

- [x] **T001** — Castear `get_jwt_identity()` a `int()` en `backend/app/routes/user_bp.py::edit_user()`.
  Viola Principio III de la constitución (siempre `int(get_jwt_identity())`).
  _Resuelto en `fix/mechanical-bugs-batch1` (commit `ef17199`)._
- [x] **T002** — Agregar chequeo de rol admin (`is_user_admin`) a `GET /user/users` en
  `backend/app/routes/user_bp.py::show_users()`. Hoy cualquier usuario autenticado lista todos
  los usuarios. Viola Principio II.
  _Resuelto en `002-admin-role-check`._
- [ ] **T003** — Reactivar la revocación de sesión en `backend/app/routes/user_bp.py::logout()`
  (descomentar/usar `BLACKLIST.add(jti)` y verificarlo en el loader de JWT). Hoy un token sigue
  siendo válido tras logout.
- [ ] **T004** — Proteger `backend/app/routes/paypal_bp.py::create_order()` y `capture_order()`
  con `@jwt_required` y asociar la orden al `user_id` autenticado en vez de aceptar requests
  anónimos.

## Backend — Fuga de información en errores

- [x] **T005** — Reemplazar la interpolación de `str(e)` en la respuesta HTTP por un mensaje
  genérico + logging server-side, en:
  - `backend/app/routes/user_bp.py::create_user()`
  - `backend/app/routes/user_bp.py::login()`
  - `backend/app/routes/user_bp.py::edit_user()`
  - `backend/app/routes/user_bp.py::update_me()`
  - `backend/app/routes/paypal_bp.py::create_order()`
  - `backend/app/routes/paypal_bp.py::capture_order()`
  Viola Principio IV (manejo de errores sin fuga de información).
  _Resuelto en `fix/mechanical-bugs-batch1` (commit `f54074f`)._

## Backend — Funcionalidad a medio terminar

- [ ] **T006** — Conectar `capture_order_service` (PayPal) con el dominio de negocio: crear una
  `Transaction` y/o actualizar `User.is_premium` cuando el pago se confirma. Hoy el pago se cobra
  pero no impacta en los datos del usuario.
- [x] **T007** — Agregar tests unitarios para `backend/app/services/auth_service.py` (create,
  login, edit, update_profile, is_user_admin) siguiendo el patrón de fixtures de
  `backend/tests/conftest.py`. Viola Principio VII (cobertura de tests obligatoria).
  _Resuelto en `003-backend-test-coverage`._
- [x] **T008** — Agregar tests de integración para los blueprints de usuario y pago
  (`user_bp.py`, `paypal_bp.py`), hoy sin cobertura.
  _Resuelto en `003-backend-test-coverage`._

## Frontend — Inconsistencias de seguridad

- [x] **T009** — Eliminar `frontend/src/hooks/useAuthLocalStorage.js` (código muerto que decodifica
  JWT desde `localStorage`, viola Principio III/X y no tiene ningún import activo).
  _Resuelto en `fix/mechanical-bugs-batch1`._
- [x] **T010** — Confirmar que todo el código usa exclusivamente `frontend/src/hooks/useAuth.js`
  (basado en cookie/store) tras eliminar el duplicado de T009.
  _Confirmado por grep + tests en `fix/mechanical-bugs-batch1`._
- [x] **T011** — Agregar `credentials: "include"` y el header CSRF (`withJsonHeaders(true)`) a
  `createOrderPayPal` y `captureOrderPayPal` en `frontend/src/js/store/flux.js`, para que sigan
  el mismo patrón que el resto de las acciones del store.
  _Resuelto en `fix/mechanical-bugs-batch1`._

## Frontend — Código huérfano

- [ ] **T012** — Decidir qué hacer con las vistas no enrutadas (`Home.jsx`, `HomeView.jsx`,
  `ContactView.jsx`, `PaymentMethodsView.jsx`): conectarlas a `Layout.jsx` si van a usarse, o
  eliminarlas si son restos de una iteración anterior.

## Hallazgos nuevos (detectados al trabajar en los bugs de arriba)

- [x] **T013** — `backend/tests/test_transaction_service.py` no colecciona: importa `LIMIT_MAX`
  de `app.services.transaction_service`, pero ese módulo solo define `PER_PAGE_MAX` y la firma
  real es `get_transactions_service(user_id, page=1, per_page=5)` (sin parámetro `limit`). Parece
  un test desactualizado tras un refactor de paginación (de `limit/offset` a `page/per_page`).
  Detectado el 2026-08-29 corriendo la suite completa para T001. No corregido — fuera de alcance
  de `fix/mechanical-bugs-batch1`.
  _Resuelto en `003-backend-test-coverage`._ De paso se corrigió otra falla latente en
  `TestCreateTransactionService::test_n8n_is_called_with_stripped_input` (aserción desactualizada
  que faltaba el segundo argumento de `parse_transaction_via_n8n`), oculta hasta ahora porque el
  archivo ni siquiera colectaba.

## Notas de priorización sugerida

1. **Crítico (seguridad)**: T002, T004, T003, T001
2. **Alto (fuga de datos / integridad de negocio)**: T005, T006
3. **Medio (consistencia / deuda técnica)**: T009, T010, T011
4. **Bajo (cobertura / limpieza)**: T007, T008, T012

---

description: "Task list for restricting GET /user/users to admin accounts"
---

# Tasks: Restringir el listado de usuarios a administradores

**Input**: Design documents from `/specs/002-admin-role-check/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/get-user-users.md, quickstart.md

**Tests**: Incluidos — el Principio VII de la constitución exige cobertura de tests para toda
regla de negocio/autorización nueva, y la spec define escenarios de aceptación concretos.

**Organization**: Ambas user stories de la spec son P1 (misma prioridad: una es el caso
legítimo que no debe romperse, la otra es el bug de seguridad que se corrige). El cambio de
código es uno solo y habilita ambas — va en la fase Foundational; cada Story aporta sus propios
tests de regresión/aceptación.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede correr en paralelo (archivo distinto o test independiente, sin dependencias)
- **[Story]**: A qué user story pertenece (US1, US2)

## Path Conventions

Proyecto web existente: `backend/app/...`, `backend/tests/...` (ver `plan.md` → Project Structure).

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: Cambio de código único que habilita tanto US1 (admin sigue funcionando) como US2
(no-admin queda bloqueado). Ninguna user story es verificable sin esto.

- [X] T001 En `backend/app/routes/user_bp.py::show_users()`, reemplazar el chequeo actual
  (`if current_user_id: ... else: 401`) por: castear `user_id = int(get_jwt_identity())`, llamar
  a `is_user_admin(user_id)` (importar de `app.services.auth_service`), y solo si no levanta
  excepción armar y devolver el listado (200). Capturar **juntas** `UnauthorizedError` y
  `NotFoundError` en un único `except (UnauthorizedError, NotFoundError):` y devolver `403` con
  un mensaje **hardcodeado fijo** (el mismo texto para ambos casos, exactamente el body mostrado
  en `contracts/get-user-users.md`: `{"error": "Usuario no tiene permisos para acceder"}`).
  **IMPORTANTE**: NO usar `str(e)` ni reenviar el mensaje propio de cada excepción —
  `is_user_admin` levanta dos mensajes distintos (`"No existe el usuario con este email"` para
  `NotFoundError` vs `"Usuario no tiene permisos para acceder"` para `UnauthorizedError`); si se
  reenvía el mensaje de la excepción tal cual, el body cambia según el caso y filtra si la
  cuenta existe o no, violando FR-005/SC-003 y el Principio IV de la constitución. Usar un solo
  string fijo en el `except`, ignorando cuál de las dos excepciones fue la que se disparó.

**Checkpoint**: El endpoint ya distingue admin/no-admin — las user stories de abajo solo agregan
cobertura de test sobre este cambio.

---

## Phase 2: User Story 1 - Un administrador consulta el listado de usuarios (Priority: P1) 🎯 MVP

**Goal**: Un usuario con rol `admin` sigue pudiendo obtener el listado completo, sin regresión.

**Independent Test**: loguearse como un usuario con `role='admin'` y pedir `GET /user/users`;
debe devolver `200` con la lista completa, igual que antes de esta feature.

### Tests for User Story 1

- [X] T002 [P] [US1] Test en `backend/tests/test_user_bp.py`: promover `sample_user` a
  `role='admin'` directamente vía `db.session` (sin fixture nueva), autenticarse con
  `auth_headers`, y verificar que `GET /user/users` devuelve `200` con el listado completo.
  Asserta explícitamente que cada item tiene las claves de `User.serialize()`
  (`id, name, email, role, is_premium, phone, last_login, is_active`) y que **`'password' not in
  item`** (cubre FR-006 — el listado admin sigue excluyendo la contraseña).

**Checkpoint**: US1 pasa — el camino admin no tiene regresión.

---

## Phase 3: User Story 2 - Un usuario sin permisos intenta ver el listado (Priority: P1)

**Goal**: Un usuario autenticado sin rol admin es rechazado, sin recibir datos de usuarios; el
rechazo es dinámico (no depende de un valor cacheado en el token).

**Independent Test**: loguearse como un usuario con `role='user'` (default) y pedir
`GET /user/users`; debe devolver `403` sin ningún dato de usuarios en el body.

### Tests for User Story 2

- [X] T003 [P] [US2] Test en `backend/tests/test_user_bp.py`: usuario autenticado con
  `role='user'` (default de `sample_user`) recibe `403` de `GET /user/users`. Asserta el body
  **exacto**: `{"error": "Usuario no tiene permisos para acceder"}` — ni una lista, ni ningún
  dato de usuarios, ni ningún otro texto (cubre SC-001 y SC-003 de forma explícita, no solo
  indirecta).
- [X] T004 [P] [US2] Test en `backend/tests/test_user_bp.py`: request sin cookie de sesión a
  `GET /user/users` sigue devolviendo `401` (regresión del comportamiento preexistente de
  `@jwt_required`, FR-003).
- [X] T005 [US2] Test en `backend/tests/test_user_bp.py` (cubre FR-004): con la misma cookie de
  sesión ya emitida para un usuario `role='user'` (request rechazada con `403`), actualizar su
  `role` a `'admin'` directamente vía `db.session` sin volver a loguearse, y repetir
  `GET /user/users` con la misma cookie → ahora debe devolver `200`, confirmando que el chequeo
  se evalúa fresco en cada request y no depende de un valor cacheado en el JWT.
- [X] T006 [US2] Test en `backend/tests/test_user_bp.py` (cubre el edge case de spec.md:62-63 y
  la rama `NotFoundError` de `is_user_admin`): con una cookie de sesión ya emitida para un
  usuario válido, eliminar esa fila de `User` directamente vía `db.session.delete(user)` +
  `commit()` (o monkeypatchear `is_user_admin` para simular `NotFoundError`), y repetir
  `GET /user/users` con la misma cookie → debe devolver `403` con **el mismo body exacto** que
  T003 (no un mensaje distinto tipo "usuario no encontrado"), confirmando que ambas ramas de
  rechazo son indistinguibles para el cliente.

**Checkpoint**: US2 pasa — el bug de seguridad original (T002 del baseline) queda cerrado y
verificado.

---

## Phase 4: Polish & Cross-Cutting Concerns

- [X] T007 [P] Actualizar `specs/001-project-baseline/tasks.md`: marcar **T002** como resuelto,
  referenciando la branch `002-admin-role-check`.
- [X] T008 Correr `quickstart.md` de punta a punta (suite de pytest completa
  `--ignore=tests/test_transaction_service.py` + validación manual opcional) y confirmar que
  nada más se rompió.

---

## Dependencies & Execution Order

- **Foundational (Phase 1)**: sin dependencias externas — es el primer paso, bloquea todo lo
  demás.
- **User Story 1 (Phase 2)** y **User Story 2 (Phase 3)**: ambas dependen únicamente de Phase 1
  completa. Son independientes entre sí (T002 no depende de T003/T004/T005/T006 ni viceversa) y
  pueden implementarse/testearse en cualquier orden o en paralelo.
- **Polish (Phase 4)**: depende de que Phase 2 y Phase 3 estén completas.

### Parallel Example

```bash
# Una vez terminado T001 (Foundational), estos tests son independientes entre sí:
Task: "T002 [US1] test admin ve el listado completo"
Task: "T003 [US2] test no-admin recibe 403 sin datos"
Task: "T004 [US2] test sin auth sigue en 401"
# T005 y T006 dependen conceptualmente del mismo fixture que T003, pero son tests distintos:
Task: "T005 [US2] test que el chequeo de rol es fresco, no cacheado"
Task: "T006 [US2] test que una cuenta borrada recibe el mismo 403 genérico"
```

## Implementation Strategy

Dado que ambas stories son P1 y comparten el mismo cambio de código (Phase 1), el MVP de esta
feature **es la feature completa**: no tiene sentido entregar solo US1 o solo US2 por separado,
ya que Phase 1 ya implementa el comportamiento de ambas. El orden sugerido es:

1. Phase 1 (el cambio real en `show_users()`).
2. Phase 2 y Phase 3 en paralelo (son solo tests, sobre archivos/casos distintos).
3. Phase 4 al final.

---

description: "Task list for closing backend test coverage gaps (T007/T008/T013)"
---

# Tasks: Cerrar gaps de cobertura de tests en el backend

**Input**: Design documents from `/specs/003-backend-test-coverage/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Esta feature ES escritura/reparación de tests — no hay una fase de "implementación"
separada, porque FR-005 prohíbe tocar código de producción como parte de este trabajo.

**Organization**: 3 user stories, cada una confinada a archivo(s) propio(s) → independientes
entre sí y ejecutables en paralelo. Dentro de cada story, las tareas comparten archivo y van
secuenciales.

## Format: `[ID] [P?] [Story] Description`

## Path Conventions

`backend/tests/...` (ver `plan.md` → Project Structure). Ningún archivo de `backend/app/` se
toca.

---

## Phase 1: User Story 1 - La suite corre completa, sin archivos rotos (Priority: P1) 🎯 MVP

**Goal**: `test_transaction_service.py` colecciona y pasa contra el contrato real de
`get_transactions_service` (ver `contracts/transaction-pagination-contract.md`).

**Independent Test**: `pytest tests/test_transaction_service.py` corre sin `ImportError` y en
verde.

- [X] T001 [US1] En `backend/tests/test_transaction_service.py`, quitar el import de `LIMIT_MAX`
  (reemplazar por `PER_PAGE_MAX` solo si algún test lo necesita) y reescribir los tests básicos
  de `TestGetTransactionsService`: lista vacía, transacciones del usuario, aislamiento entre
  usuarios, orden descendente por fecha — todos contra la firma real
  `get_transactions_service(user_id, page=1, per_page=5)` → `(txs, meta, summary)`.
- [X] T002 [US1] En `backend/tests/test_transaction_service.py`, reescribir los tests de mecánica
  de paginación de `TestGetTransactionsService`: `per_page` restringe el tamaño de página,
  `page` navega sin solapar registros entre página 1 y 2, `per_page` por encima de
  `PER_PAGE_MAX` se cachea sin error, `per_page` menor a 1 se cachea a 1 sin error (usar
  `meta.has_next`/`meta.has_prev`/`meta.total` en vez de un segundo valor de retorno suelto).
- [X] T003 [US1] En `backend/tests/test_transaction_service.py`, reescribir los tests de forma
  serializada de `TestGetTransactionsService`: cada item tiene exactamente
  `{id, description, amount, category, raw_input, date}`; `meta.total` refleja el total real
  independiente de `page`/`per_page`; `summary.total_income`/`total_expenses`/`balance` son
  correctos sobre el dataset completo del usuario (no solo la página actual).

**Checkpoint**: `pytest tests/test_transaction_service.py -q` pasa completo, incluyendo
`TestCreateTransactionService` (sin tocar, ya estaba alineada).

---

## Phase 2: User Story 2 - Cobertura unitaria de auth_service (Priority: P2)

**Goal**: Cada función pública de `auth_service.py` tiene un test de camino feliz y uno de error
(ver `contracts/auth-service-contract.md`).

**Independent Test**: `pytest tests/test_auth_service.py` corre de forma aislada, sin depender
del cliente HTTP.

- [X] T004 [US2] Crear `backend/tests/test_auth_service.py` con imports, helper `_make_user`
  (mismo patrón que `test_category_service.py`) y clase `TestCreateUserService`: camino feliz
  (usuario creado, password hasheada con bcrypt, no en texto plano) + errores (`BadRequestError`
  por campos faltantes, `ConflictError` por email duplicado).
- [X] T005 [US2] En `backend/tests/test_auth_service.py`, agregar `TestLoginUserService`: camino
  feliz (devuelve un JWT string válido) + errores (`BadRequestError` sin email/password,
  `NotFoundError` email inexistente, `ConflictError` password incorrecta).
- [X] T006 [US2] En `backend/tests/test_auth_service.py`, agregar `TestEditUserService`: camino
  feliz (password actualizada, hash distinto al anterior) + errores (`NotFoundError` user_id
  inexistente, `BadRequestError` campo no editable como `email`).
- [X] T007 [US2] En `backend/tests/test_auth_service.py`, agregar `TestUpdateProfileService`:
  camino feliz (`name` válido actualizado, `phone=''` limpia a `None`) + errores (`NotFoundError`
  user_id inexistente, `BadRequestError` por `name`/`phone` con caracteres inválidos).
- [X] T008 [US2] En `backend/tests/test_auth_service.py`, agregar `TestIsUserAdmin`: camino feliz
  (`role='admin'` devuelve `True`) + errores (`NotFoundError` user_id inexistente,
  `UnauthorizedError` `role != 'admin'`).

**Checkpoint**: `pytest tests/test_auth_service.py -q` pasa completo, cubriendo el 100% de las
funciones públicas de `auth_service.py` (SC-001).

---

## Phase 3: User Story 3 - Caminos felices en user_bp/paypal_bp (Priority: P3)

**Goal**: Cada endpoint de `user_bp.py`/`paypal_bp.py` tiene al menos un test de éxito, no solo
el de "no filtra error interno" (ver `contracts/blueprint-happy-paths.md`).

**Independent Test**: los tests nuevos pasan sin mockear `auth_service` (user_bp) y mockeando
`paypal_service` a nivel de blueprint (paypal_bp, mismo patrón que los tests de error-leak).

- [X] T009 [P] [US3] En `backend/tests/test_user_bp.py`, agregar a `TestCreateUserEndpoint` un
  caso de éxito (`201` + usuario creado sin `password` en el body) y un caso de email duplicado
  (`400`); agregar a `TestLoginEndpoint` un caso de éxito (`200` + cookie seteada) y un caso de
  password incorrecta (`400`); agregar a `TestUpdateMeEndpoint` un caso de éxito (`name` válido,
  `200`) y un caso de `name` inválido (`400`).
- [X] T010 [P] [US3] En `backend/tests/test_paypal_bp.py`, agregar a `TestCreateOrderEndpoint` un
  caso de éxito mockeando `create_order_service` (en `app.routes.paypal_bp`) para que devuelva un
  `MagicMock` con `.status_code=201` y `.json()` con un link de aprobación; agregar a
  `TestCaptureOrderEndpoint` un caso de éxito mockeando `capture_order_service` para que devuelva
  `.status_code=200` y `.json()={"status": "COMPLETED", ...}`.

**Checkpoint**: el 100% de los endpoints de ambos blueprints tiene cobertura de camino feliz
(SC-003).

---

## Phase 4: Polish & Cross-Cutting Concerns

- [X] T011 Correr `cd backend && venv/Scripts/python.exe -m pytest -q` (SIN `--ignore`) y
  confirmar: cero errores de colección (SC-004), toda la suite en verde, tiempo total <30s
  (SC-002, usar `--durations=0` si hace falta diagnosticar).
- [X] T012 [P] Actualizar `specs/001-project-baseline/tasks.md`: marcar **T007**, **T008** y
  **T013** como resueltos, referenciando la branch `003-backend-test-coverage`.

---

## Dependencies & Execution Order

- **User Story 1, 2 y 3**: completamente independientes entre sí (archivos distintos:
  `test_transaction_service.py`, `test_auth_service.py`, `test_user_bp.py`+`test_paypal_bp.py`)
  — pueden implementarse en cualquier orden o en paralelo.
- Dentro de US1 y US2: T001→T002→T003 y T004→T005→T006→T007→T008 son secuenciales (mismo
  archivo cada grupo).
- Dentro de US3: T009 y T010 son paralelas entre sí (archivos distintos).
- **Polish (Phase 4)**: depende de que las 3 stories estén completas.

### Parallel Example

```bash
# Las 3 user stories pueden arrancar a la vez (archivos completamente distintos):
Task: "US1: reescribir test_transaction_service.py (T001-T003)"
Task: "US2: crear test_auth_service.py (T004-T008)"
Task: "US3: agregar caminos felices (T009, T010)"
```

## Implementation Strategy

Dado que las 3 stories son independientes y de alcance chico, no hace falta un MVP parcial — el
orden sugerido es simplemente **US1 primero** (P1, restaura la confianza en toda la suite y es la
más rápida), después US2 y US3 en el orden que sea cómodo (incluso en paralelo si se delega a
subagentes, ya que no comparten archivos).

# Implementation Plan: Restringir el listado de usuarios a administradores

**Branch**: `002-admin-role-check` | **Date**: 2026-08-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-admin-role-check/spec.md`

## Summary

`GET /user/users` hoy devuelve el listado completo de usuarios a cualquier request autenticado,
sin mirar el rol. El fix es agregar una verificación de rol admin (reutilizando
`is_user_admin(user_id)`, ya existente en `auth_service.py` pero nunca invocado desde ninguna
ruta) antes de armar la respuesta, y mapear el rechazo a un 403 genérico sin datos de usuarios.

## Technical Context

**Language/Version**: Python 3.13 (Flask)

**Primary Dependencies**: Flask, Flask-JWT-Extended, Flask-SQLAlchemy (ya en uso, sin nuevas
dependencias)

**Storage**: PostgreSQL (prod/dev) / SQLite en memoria (tests) — sin cambios de esquema

**Testing**: pytest + pytest-flask, fixtures de `backend/tests/conftest.py`

**Target Platform**: API REST backend (Flask), consumida por el frontend React existente

**Project Type**: Web application (backend Flask + frontend React ya presentes en el repo)

**Performance Goals**: N/A — el chequeo es una query adicional por `id` ya indexada (PK), sin
impacto medible

**Constraints**: No modificar el shape de la respuesta para admins; no romper los tests
existentes de `user_bp`

**Scale/Scope**: Un solo endpoint (`GET /user/users`), un solo archivo de ruta modificado

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Chequeo | Resultado |
|---|---|---|
| I — Layered Architecture | La lógica de autorización se resuelve llamando a `is_user_admin()` (ya vive en `auth_service.py`); el blueprint solo la invoca y mapea la excepción a HTTP. No se agrega lógica de negocio al blueprint. | PASS |
| II — Aislamiento de datos por usuario | Es exactamente el gap que esta feature cierra: se agrega el chequeo de rol explícito que hoy falta. | PASS (post-fix) |
| IV — Manejo de errores sin fuga de información | El rechazo usa el mensaje ya definido en `is_user_admin` ("Usuario no tiene permisos para acceder"), sin interpolar excepciones ni datos internos. | PASS |
| VII — Cobertura de tests obligatoria | Se agregan tests para: admin ve la lista, no-admin es rechazado, no autenticado sigue rechazado. | PASS (se cumple en Fase de implementación) |
| IX — Estabilidad de estructura | No se toca ningún modelo ni se reestructura ninguna carpeta; se reutiliza una función de servicio ya existente. | PASS |

No hay violaciones que requieran justificación en Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/002-admin-role-check/
├── plan.md              # Este archivo
├── research.md          # Fase 0
├── data-model.md         # Fase 1
├── quickstart.md         # Fase 1
├── contracts/
│   └── get-user-users.md # Fase 1 — contrato del endpoint (antes/después)
└── tasks.md              # Fase 2 (/speckit-tasks, no generado por este comando)
```

### Source Code (repository root)

```text
backend/
├── app/
│   ├── routes/
│   │   └── user_bp.py          # show_users(): agrega el chequeo de rol + mapeo de excepción
│   └── services/
│       └── auth_service.py     # is_user_admin(): ya existe, no se modifica
└── tests/
    └── test_user_bp.py         # se extiende con casos de show_users()
```

**Structure Decision**: Cambio confinado al backend Flask existente
(`backend/app/routes/user_bp.py`), reutilizando `backend/app/services/auth_service.py::is_user_admin`.
No se toca el frontend — el listado de usuarios no tiene consumidor en el frontend actual (no hay
ninguna vista que llame a `GET /user/users` en `flux.js`), así que no hay UI que ajustar.

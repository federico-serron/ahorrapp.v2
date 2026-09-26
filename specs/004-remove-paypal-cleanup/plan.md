# Implementation Plan: Revocación de sesión, baja de PayPal y limpieza de vistas huérfanas

**Branch**: `004-remove-paypal-cleanup` | **Date**: 2026-08-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-remove-paypal-cleanup/spec.md`

## Summary

Tres piezas de limpieza independientes del baseline: (1) conectar el `BLACKLIST` ya declarado en
`app/blacklist.py` a un `token_in_blocklist_loader` de Flask-JWT-Extended para que el logout
revoque realmente el token; (2) eliminar por completo la integración de PayPal (backend,
frontend, config, variables de entorno) — decisión de producto confirmada, no un fix; (3) borrar
las 4 vistas de frontend no alcanzables desde el router.

## Technical Context

**Language/Version**: Python 3.13 (Flask) + React 19 / Vite (frontend)

**Primary Dependencies**: `Flask-JWT-Extended==4.7.1` (ya en `requirements.txt` — se usa su
mecanismo nativo de blocklist, sin librerías nuevas)

**Storage**: El blocklist usa el `set()` en memoria ya declarado en `app/blacklist.py` — no se
agrega Redis ni una tabla nueva (ver `research.md`, Decisión 1)

**Testing**: pytest (backend), vitest (frontend) — se actualizan/eliminan los tests que
correspondan a lo eliminado

**Target Platform**: Backend Flask + frontend React/Vite existentes

**Project Type**: Web application existente

**Performance Goals**: N/A — chequeo de blocklist es una búsqueda en `set()`, O(1)

**Constraints**: No se introduce infraestructura nueva (Redis, tabla de revocación) para
mantenerse dentro del Principio IX; se documenta la limitación conocida de un blocklist en
memoria (se resetea si el proceso reinicia, no se comparte entre múltiples workers) como
aceptable para el tamaño actual del proyecto.

**Scale/Scope**: Backend: `app/__init__.py`, `app/routes/user_bp.py`, borrar
`app/routes/paypal_bp.py` + `app/services/paypal_service.py` + `tests/test_paypal_bp.py`,
editar `app/config.py`, `.env.example`, `docker-compose.yml`. Frontend: borrar 4 vistas
huérfanas + la carpeta del componente PayPal + `flux.paypal.test.js`; editar `Layout.jsx`,
`flux.js`, `paymentMethods.js`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Chequeo | Resultado |
|---|---|---|
| I — Layered Architecture | La revocación se resuelve con el mecanismo nativo de la librería JWT (callback registrado en `app/__init__.py`), no lógica de negocio nueva en el blueprint. | PASS |
| VI — Gestión de secretos | Se eliminan variables de entorno (`PAYPAL_*`) que ya no tienen código que las lea, en vez de dejarlas huérfanas. | PASS |
| VII — Cobertura de tests | Se actualiza/agrega test para la revocación (US1); se eliminan los tests de lo que se borra (US2/US3) en vez de dejarlos rotos. | PASS |
| IX — Estabilidad de estructura | No se agrega infraestructura nueva (Redis/DB) para el blocklist — se usa lo que ya existe. La eliminación de PayPal fue confirmada explícitamente por el usuario, no es una reestructuración unilateral. `is_premium` no se toca. | PASS |

No hay violaciones que requieran justificación en Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/004-remove-paypal-cleanup/
├── plan.md              # Este archivo
├── research.md          # Fase 0
├── data-model.md         # Fase 1
├── quickstart.md         # Fase 1
├── contracts/
│   ├── session-revocation-contract.md   # Comportamiento esperado de logout/blocklist
│   └── removed-surface.md               # Inventario exacto de lo que deja de existir
└── tasks.md              # Fase 2 (/speckit-tasks, no generado por este comando)
```

### Source Code (repository root)

```text
backend/
├── app/
│   ├── __init__.py                  # Registrar @jwt.token_in_blocklist_loader
│   ├── blacklist.py                 # Sin cambios (ya existe el set())
│   ├── config.py                    # Quitar PAYPAL_*
│   └── routes/
│       ├── user_bp.py               # logout(): descomentar BLACKLIST.add(jti)
│       └── paypal_bp.py             # ELIMINAR
│   └── services/
│       └── paypal_service.py        # ELIMINAR
└── tests/
    ├── test_user_bp.py              # Agregar test de logout + reuse rechazado
    └── test_paypal_bp.py            # ELIMINAR

frontend/
├── src/
│   ├── Layout.jsx                        # Quitar rutas /paypal/success, /paypal/cancel
│   ├── views/
│   │   ├── Home.jsx                      # ELIMINAR (huérfana)
│   │   ├── HomeView.jsx                  # ELIMINAR (huérfana)
│   │   ├── ContactView.jsx               # ELIMINAR (huérfana)
│   │   ├── PaymentMethodsView.jsx        # ELIMINAR (huérfana)
│   │   └── payment/paypal/               # ELIMINAR (Success.jsx, Cancel.jsx)
│   ├── components/payments/PaymentMethods/PayPal/  # ELIMINAR
│   ├── config/paymentMethods.js          # Quitar entrada PAYPAL
│   └── js/store/
│       ├── flux.js                       # Quitar createOrderPayPal/captureOrderPayPal
│       └── flux.paypal.test.js           # ELIMINAR

docker-compose.yml            # Quitar env vars PAYPAL_*
backend/.env.example          # Quitar PAYPAL_*
frontend/.env.example         # Quitar VITE_PAYPAL_CLIENT_ID
```

**Structure Decision**: Cambios en backend y frontend simultáneamente, pero sin overlap entre
las 3 user stories (US1 = backend auth únicamente; US2 = backend+frontend de PayPal; US3 =
frontend de vistas huérfanas, con el matiz de que borrar `PaymentMethodsView.jsx` por US3 ya
elimina el único punto de entrada de UI a PayPal antes de tocar el componente de PayPal por US2).

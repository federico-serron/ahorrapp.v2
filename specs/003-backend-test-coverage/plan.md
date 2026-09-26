# Implementation Plan: Cerrar gaps de cobertura de tests en el backend

**Branch**: `003-backend-test-coverage` | **Date**: 2026-08-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-backend-test-coverage/spec.md`

## Summary

Tres gaps de cobertura/salud de tests detectados en la auditoría de baseline: (1)
`test_transaction_service.py` no colecciona porque quedó desactualizado tras un refactor de
paginación (contrato viejo `limit/offset` → `(txs, total)`; contrato actual
`page/per_page` → `(txs, meta, summary)`); (2) `auth_service.py` no tiene tests unitarios
propios; (3) varios endpoints de `user_bp.py`/`paypal_bp.py` solo tienen el test de "no filtra
errores internos" (de T005), sin cobertura de camino feliz. El trabajo es puramente de tests —
no se toca código de producción salvo que aparezca un bug real, que se documentaría aparte.

## Technical Context

**Language/Version**: Python 3.13 (Flask)

**Primary Dependencies**: pytest, pytest-flask (ya en `requirements-test.txt`, sin nuevas
dependencias)

**Storage**: SQLite en memoria para tests (fixture `db` de `conftest.py`), sin cambios

**Testing**: pytest — este feature ES la ampliación de la suite existente

**Target Platform**: Suite de tests del backend Flask

**Project Type**: Web application existente (solo se tocan archivos bajo `backend/tests/`)

**Performance Goals**: La suite completa debe seguir corriendo en <30s (SC-002)

**Constraints**: Cero cambios en `app/services/` o `app/routes/` salvo bug real acordado
explícitamente (FR-005); reutilizar fixtures existentes de `conftest.py`

**Scale/Scope**: 3 archivos de test tocados (`test_transaction_service.py` reescrito
parcialmente, `test_user_bp.py` y `test_paypal_bp.py` extendidos) + 1 archivo nuevo
(`test_auth_service.py`)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Chequeo | Resultado |
|---|---|---|
| I — Layered Architecture | No se toca ningún blueprint ni servicio; solo se agregan/reparan tests que ejercitan la capa existente. | PASS |
| IV — Manejo de errores sin fuga de información | Los tests de camino feliz nuevos no introducen manejo de errores nuevo; verifican el comportamiento ya corregido en T005. | PASS |
| VII — Cobertura de tests obligatoria | Esta feature ES el cumplimiento directo de este principio para `auth_service.py` y los blueprints de usuario/pago. | PASS |
| IX — Estabilidad de estructura | No se reestructura ninguna carpeta ni modelo; se reutiliza el patrón de fixtures ya existente. | PASS |

No hay violaciones que requieran justificación en Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/003-backend-test-coverage/
├── plan.md              # Este archivo
├── research.md          # Fase 0
├── data-model.md         # Fase 1 (sin entidades nuevas — se documenta por qué)
├── quickstart.md         # Fase 1
├── contracts/
│   ├── auth-service-contract.md            # Qué debe probar cada función de auth_service
│   ├── transaction-pagination-contract.md  # Contrato real de get_transactions_service
│   └── blueprint-happy-paths.md            # Camino feliz esperado por endpoint
└── tasks.md              # Fase 2 (/speckit-tasks, no generado por este comando)
```

### Source Code (repository root)

```text
backend/
├── app/
│   ├── services/
│   │   ├── auth_service.py            # Sin cambios — objeto de los tests nuevos
│   │   └── transaction_service.py     # Sin cambios — objeto de los tests reparados
│   └── routes/
│       ├── user_bp.py                 # Sin cambios — objeto de los tests extendidos
│       └── paypal_bp.py               # Sin cambios — objeto de los tests extendidos
└── tests/
    ├── test_auth_service.py           # NUEVO
    ├── test_transaction_service.py    # TestGetTransactionsService reescrita
    ├── test_user_bp.py                # Se agregan casos de camino feliz
    └── test_paypal_bp.py              # Se agregan casos de camino feliz
```

**Structure Decision**: Cambio confinado a `backend/tests/`. No hay impacto en frontend ni en
ningún modelo/migración.

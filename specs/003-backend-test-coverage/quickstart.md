# Quickstart: Validar la cobertura de tests cerrada

## Prerrequisitos

- `backend/venv` con `requirements-test.txt` instalado (`pytest`, `pytest-flask`).

## Validación

```bash
cd backend
venv/Scripts/python.exe -m pytest -q
```

**Sin ningún `--ignore`** — a diferencia de las features anteriores, este es justamente el
criterio de éxito de la User Story 1 (SC-004): `test_transaction_service.py` debe coleccionar y
pasar como cualquier otro archivo.

## Resultado esperado

- Cero errores de colección.
- Todos los tests existentes (los ~54 de antes de esta feature) siguen en verde.
- Nuevos tests en verde: `test_auth_service.py` (una clase por función de `auth_service.py`, ver
  `contracts/auth-service-contract.md`), casos de camino feliz agregados en `test_user_bp.py` y
  `test_paypal_bp.py` (ver `contracts/blueprint-happy-paths.md`), y
  `TestGetTransactionsService` reescrita en `test_transaction_service.py` (ver
  `contracts/transaction-pagination-contract.md`).
- Tiempo total de la suite: <30s (SC-002) — verificar con `pytest -q --durations=0` si hace falta
  diagnosticar algo lento.

## Si algo falla

Si un test nuevo revela un comportamiento real distinto al documentado en `contracts/` (no un
error de escritura del test), no se corrige el código de producción como parte de esta feature —
se documenta en `specs/001-project-baseline/tasks.md` como hallazgo nuevo (mismo patrón que T013)
y se avisa antes de continuar.

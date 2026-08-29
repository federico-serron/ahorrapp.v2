# Research: Cerrar gaps de cobertura de tests en el backend

## Decisión 1: Reescribir `TestGetTransactionsService`, no solo renombrar `LIMIT_MAX`

- **Decision**: Los 9 tests de `TestGetTransactionsService` en `test_transaction_service.py` se
  reescriben contra la firma real `get_transactions_service(user_id, page=1, per_page=5)` →
  `(lista_serializada, meta_paginación, resumen)`. `TestCreateTransactionService` (12 tests) NO
  se toca — ya está alineada con `create_transaction_service(user_id, raw_input)`, que no cambió.
- **Rationale**: El servicio migró de paginación `limit/offset` a `page/per_page` (con
  `Flask-SQLAlchemy` `.paginate()`) y de devolver `(txs, total)` a devolver
  `(txs, meta, summary)` — un simple `sed` de `LIMIT_MAX` → `PER_PAGE_MAX` no alcanza, hay que
  adaptar cada aserción de paginación al nuevo shape.
- **Alternatives considered**: Borrar los tests de paginación en vez de repararlos — descartado,
  pierde cobertura real de una función central (`get_transactions_service` es el corazón del
  endpoint de listado de transacciones).

## Decisión 2: Estructura de `test_auth_service.py` — espejar `test_category_service.py`

- **Decision**: Una clase por función pública (`TestCreateUserService`,
  `TestLoginUserService`, `TestEditUserService`, `TestUpdateProfileService`,
  `TestIsUserAdmin`), reutilizando `_make_user`-style helpers locales en vez de las fixtures HTTP
  (`client`, `auth_headers`) — son tests de unidad de servicio, no de integración.
- **Rationale**: Es el patrón ya validado en `test_category_service.py` y
  `test_transaction_service.py` (clases por función, helpers `_make_user`/`_make_category`
  locales, `app.app_context()` explícito por bloque). Consistencia > inventar un patrón nuevo.
- **Alternatives considered**: Un solo archivo plano sin clases — descartado por consistencia con
  el resto de la suite.

## Decisión 3: Camino feliz de PayPal — mockear el `Response` completo, no solo `get_access_token`

- **Decision**: `create_order_service`/`capture_order_service` (en `paypal_service.py`) devuelven
  el objeto `requests.Response` crudo, no un dict — el blueprint llama `.json()` y
  `.status_code` sobre ese objeto. Los tests de camino feliz mockean esas dos funciones para que
  devuelvan un `MagicMock` con `.status_code = 200`/`201` y `.json.return_value = {...}` (según
  el shape real que ya usa `create_order`/`capture_order` en `paypal_bp.py`), en vez de intentar
  construir un `requests.Response` real.
- **Rationale**: Evita cualquier llamada HTTP real a la API de PayPal (los tests existentes de
  error-leak ya establecen este patrón de mockeo a nivel de `paypal_bp_module`); solo se agrega
  el caso de éxito simétrico.
- **Alternatives considered**: Mockear `requests.post` directamente — más frágil (acopla el test
  a detalles de implementación de `paypal_service.py`) que mockear en el punto de uso del
  blueprint, que es el patrón ya usado en `test_paypal_bp.py`.

## Decisión 4: Camino feliz de `user_bp` — sin mocks, contra la DB real de test

- **Decision**: Los tests de camino feliz de `signup`, `login` y `update_me` NO mockean
  `auth_service` — llaman al endpoint real contra la DB SQLite en memoria (mismo patrón que
  `TestEditUserEndpoint.test_edit_user_returns_200_and_updates_password`, ya existente).
- **Rationale**: Es lógica de negocio real y barata de ejercitar de punta a punta (no hay
  dependencias externas como n8n/PayPal); mockear sería una fidelidad menor sin beneficio.
- **Alternatives considered**: N/A — es el patrón ya establecido en el propio archivo.

## Decisión 5: Ningún hallazgo de bug real esperado, pero el proceso lo contempla

- **Decision**: Si escribir estos tests revela un bug de comportamiento real (no solo falta de
  cobertura), se documenta en `specs/001-project-baseline/tasks.md` como hallazgo nuevo (patrón
  ya usado con T013) en vez de corregirlo silenciosamente dentro de esta feature.
- **Rationale**: Mantiene el alcance de esta feature limpio (FR-005) y sigue la regla de
  conflicto de la constitución (preguntar antes de mezclar un fix de producción no acordado).

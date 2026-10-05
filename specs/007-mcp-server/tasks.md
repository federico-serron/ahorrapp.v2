---
description: "Task list for feature implementation"
---

# Tasks: Servidor MCP para agentes de IA

**Input**: Design documents from `/specs/007-mcp-server/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: **Incluidos y obligatorios.** No es una elección de estilo: el Principio VII de la
constitución es NON-NEGOTIABLE y exige tests unitarios (happy path + al menos un caso de
rechazo/ownership) para todo método nuevo en `app/services/` antes de mergear. Además FR-005/SC-002
(aislamiento entre usuarios) y SC-007 (nada se borra sin confirmar) son invariantes de seguridad
que solo se pueden verificar con tests.

**Organization**: agrupadas por user story, para que cada una se implemente y se pruebe por
separado.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: puede correr en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: a qué user story pertenece (US1, US2, US3, US4)
- Cada tarea lleva la ruta exacta del archivo

## Path Conventions

Proyecto web fullstack, con la estructura **existente** sin alteraciones (Principio IX):

- Backend: `backend/app/routes/`, `backend/app/services/`, `backend/app/models.py`,
  `backend/tests/`
- Frontend: `frontend/src/components/`, `frontend/src/views/`, `frontend/src/js/store/`

---

## Phase 1: Setup & Gates

**Purpose**: desbloquear la decisión pendiente y cerrar los detalles de infraestructura que no
dependen de nada.

- [x] T001 Resolver el conflicto con el Principio III: aplicar en `.specify/memory/constitution.md` la enmienda MINOR propuesta en `specs/007-mcp-server/plan.md` (sección Constitution Check), subiendo la versión a 1.1.0 y actualizando el Sync Impact Report — **o** registrar en `plan.md` la alternativa que indique el usuario
      ✅ **Cerrada 2026-10-05**: el usuario aprobó la enmienda. Aplicada en `.specify/memory/constitution.md` v1.1.0 con cinco condiciones acumulativas, más una línea nueva en Security Requirements y el Sync Impact Report actualizado. `plan.md` refleja el cambio. **Implementación desbloqueada.**
- [ ] T002 [P] Agregar `/^\/mcp/` al array `navigateFallbackDenylist` en `frontend/vite.config.js`, extendiendo el comentario existente para incluir el quinto prefijo de backend
- [ ] T003 [P] Quitar `'headers'` de `app.config['JWT_TOKEN_LOCATION']` en `backend/tests/conftest.py:39` (queda `['cookies']`, espejando producción) y agregar en `backend/tests/test_user_bp.py` un test que afirme que `DevelopmentConfig.JWT_TOKEN_LOCATION == ProductionConfig.JWT_TOKEN_LOCATION == ["cookies"]`, leyendo las clases reales de `backend/app/config.py` y no la fixture

> **✅ T001 era un gate y está cerrado** (2026-10-05). La Regla de conflicto de la constitución
> prohíbe resolver unilateralmente un choque con un principio NON-NEGOTIABLE, así que T013 en
> adelante (todo el código de autenticación Bearer) estaba bloqueado. Con la enmienda v1.1.0
> aprobada, ya no lo está.
>
> **Por qué T003 existe** (hallazgo C1 del análisis): la fixture de tests ampliaba
> `JWT_TOKEN_LOCATION` a `['cookies','headers']`, lo que hacía **estructuralmente inverificable**
> la condición 4 de la excepción del Principio III ("sin ampliar `JWT_TOKEN_LOCATION`") y permitía
> que un test pasara enmascarando una violación real en producción. Se verificó que **ningún** test
> actual usa `Authorization`, `Bearer` ni `create_access_token` — el fixture `auth_headers` manda
> una cookie — así que el override es vestigial y quitarlo no rompe nada. Es preexistente, no lo
> introdujo esta feature.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: el modelo de credenciales y el dispatcher del protocolo. Todas las user stories
dependen de esto.

**⚠️ CRITICAL**: ninguna user story puede empezar hasta que esta fase esté completa.

### Modelo y migración

- [ ] T004 Agregar el modelo `AgentToken` al final de `backend/app/models.py` según [data-model.md](./data-model.md) (campos `id`, `user_id` FK indexado, `name`, `token_hash` único indexado, `token_prefix`, `created_at`, `last_used_at`, `revoked_at`) con su `serialize()` que **excluye** `token_hash` y `user_id`
- [ ] T005 Agregar la relación inversa `agent_tokens` con `lazy='dynamic'` al modelo `User` en `backend/app/models.py`
- [ ] T006 Generar y aplicar la migración Alembic desde `backend/`: `flask db migrate -m "add agent_token table"` y `flask db upgrade`, verificando que el archivo generado en `backend/migrations/versions/` solo crea la tabla nueva y no hace ningún `ALTER` sobre `user`, `transaction` o `category`

### Servicio de credenciales

- [ ] T007 Implementar `create_agent_token_service(user_id, name)`, `list_agent_tokens_service(user_id)` y `revoke_agent_token_service(user_id, token_id)` en `backend/app/services/agent_token_service.py` con docstrings Args/Returns/Raises, usando `secrets.token_urlsafe(32)` con prefijo `ahorr_pat_`, guardando solo `sha256` en hex, y aplicando el límite de 10 credenciales activas por usuario
- [ ] T008 Implementar `verify_agent_token(raw_token) -> int` en `backend/app/services/agent_token_service.py`: hashea, busca por `token_hash`, valida `revoked_at IS NULL` y `User.is_active`, actualiza `last_used_at` y devuelve el `user_id`; lanza `UnauthorizedError` con **un único mensaje** para los cinco casos de rechazo (FR-007)
- [ ] T009 [P] Escribir tests de las 4 funciones en `backend/tests/test_agent_token_service.py`: creación (el token en claro no coincide con `token_hash`), listado, revocación, límite de 10, revocar una credencial de **otro** usuario → `NotFoundError`, y `verify_agent_token` rechazando token inexistente / revocado / de usuario inactivo con el mismo mensaje

### Confirmación de operaciones irreversibles

- [ ] T010 [P] Implementar `issue_confirm_token(user_id, op, target_id)` y `verify_confirm_token(token, user_id, op, target_id)` en `backend/app/services/mcp_confirm.py` usando `itsdangerous.URLSafeTimedSerializer` con `JWT_SECRET_KEY`, salt `mcp-confirm` y `max_age=300`
- [ ] T011 [P] Escribir tests en `backend/tests/test_mcp_confirmation.py` del ciclo emitir→verificar y de los rechazos: token inventado, mal firmado, expirado (con `max_age` forzado), de otro `user_id`, de otra operación y de otro `target_id`

### Transporte y dispatcher

- [ ] T012 Implementar el registry de tools y el dispatcher JSON-RPC en `backend/app/services/mcp_service.py`: parseo del envelope 2.0, negociación de versión (`2026-07-28`, `2025-11-25`, `2025-06-18`, `2025-03-26`), ruteo de métodos, y el mapeo de excepciones a `isError` según [contracts/mcp-transport.md](./contracts/mcp-transport.md) (nunca `str(e)` de una excepción no controlada; `current_app.logger.exception` para las inesperadas)
- [ ] T013 Implementar el blueprint en `backend/app/routes/mcp_bp.py`: `POST /` que extrae el Bearer del header `Authorization`, llama a `verify_agent_token` **antes** de parsear el JSON-RPC, delega en el dispatcher y devuelve siempre `application/json`; `GET` y `DELETE` → `405`; header `Mcp-Session-Id` entrante ignorado y nunca emitido
- [ ] T014 Registrar `mcp_bp` con `url_prefix='/mcp'` en `backend/app/__init__.py`, sin tocar `JWT_TOKEN_LOCATION` ni la configuración de cookies existente
- [ ] T015 Escribir los tests de conformidad del transporte en `backend/tests/test_mcp_transport.py`: `401` idéntico para los 5 rechazos de credencial, `405` en GET y DELETE, `-32700` ante JSON malformado, `-32600` ante envelope inválido, `404` + `-32601` ante método desconocido, `400` + `-32022` con `data.supported` ante versión no soportada, `400` + `HeaderMismatch` cuando el header y `params._meta` discrepan, request sin header tratado como legacy, notificación sin `id` → `202` sin cuerpo, y un tool que lanza una excepción arbitraria devuelve el texto fijo sin filtrar `str(e)`
- [ ] T016 Escribir los tests de ruteo y aislamiento de credencial en `backend/tests/test_mcp_transport.py`, que **requieren que `mcp_bp` ya esté registrado** (T014): (a) `/mcp` llega al blueprint y **no** al catch-all `@app.route('/<path:path>')` de `backend/app/run.py`, es decir no devuelve el shell del SPA; (b) una ruta desconocida **sigue** devolviendo `index.html`, como guardia de regresión de FR-016; (c) un token de agente en `Authorization: Bearer` **no** autentica en `/user/me` ni en `/transaction/`

**Checkpoint**: el endpoint autentica, habla JSON-RPC, responde errores conformes y no se pisa con
el ruteo del SPA. Todavía no expone ningún tool.

---

## Phase 3: User Story 1 - Conectar un agente a mis finanzas (Priority: P1) 🎯 MVP

**Goal**: el usuario genera una credencial desde la app, la pega en su agente, y el agente descubre
las herramientas y lee datos — solo los suyos.

**Independent Test**: generar una credencial, configurarla en un cliente de IA, y confirmar que el
agente lista las herramientas y lee datos de esa cuenta (y de ninguna otra).

### Endpoints REST para la app web

- [ ] T017 [US1] Implementar `backend/app/routes/agent_token_bp.py` con `POST /`, `GET /` y `DELETE /<int:token_id>` según [contracts/rest-agent-tokens.md](./contracts/rest-agent-tokens.md), usando `@jwt_required()` con cookies y `int(get_jwt_identity())`, mapeando `BadRequestError`→400 y `NotFoundError`→404
- [ ] T018 [US1] Registrar `agent_token_bp` con `url_prefix='/agent-token'` en `backend/app/__init__.py`
- [ ] T019 [P] [US1] Escribir tests de los 3 endpoints en `backend/tests/test_agent_token_bp.py`: el `POST` devuelve el token en claro una sola vez, el `GET` nunca incluye `token`/`token_hash`, el `DELETE` de una credencial ajena da 404, el `DELETE` repetido es idempotente, y sin cookie JWT da 401

### Handshake y descubrimiento

- [ ] T020 [US1] Implementar los handlers `server/discover`, `initialize`, `notifications/initialized` y `ping` en `backend/app/services/mcp_service.py`, con el texto de `instructions` que define la regla de confirmación y la de ambigüedad (FR-019), según [contracts/mcp-transport.md](./contracts/mcp-transport.md)
- [ ] T021 [US1] Implementar `tools/list` en `backend/app/services/mcp_service.py`, devolviendo cada tool con `name`, `description`, `inputSchema` y `annotations` desde el registry
- [ ] T022 [P] [US1] Escribir tests en `backend/tests/test_mcp_transport.py` de ambos handshakes: `server/discover` devuelve `supportedVersions`, `capabilities.tools` e `instructions` y **no** emite header `Mcp-Session-Id`; `initialize` legacy devuelve `protocolVersion` y `serverInfo`

### Tools de lectura

- [ ] T023 [P] [US1] Implementar los tools `list_transactions` y `list_categories` en `backend/app/services/mcp_tools.py`, delegando en `get_transactions_service` y `get_categories_service` con el `user_id` de la credencial, según [contracts/mcp-tools.md](./contracts/mcp-tools.md)
- [ ] T024 [US1] Escribir los tests de aislamiento y de alcance en `backend/tests/test_mcp_tools.py`: ningún `inputSchema` declara `user_id`; un argumento `user_id` inyectado se ignora y se devuelven los datos del dueño del token; los tools de lectura declaran `readOnlyHint: true`; y para **FR-006** (condición 3 de la excepción del Principio III) el conjunto de nombres que devuelve `tools/list` es **exactamente** el esperado y ningún tool expone operaciones de administración de cuenta — el test se escribe con una lista literal de nombres permitidos, de modo que agregar un tool nuevo lo haga fallar hasta que se revise su alcance a propósito

### Frontend

- [ ] T025 [US1] Agregar las acciones `createAgentToken`, `getAgentTokens` y `revokeAgentToken` a `frontend/src/js/store/flux.js`, todas con `credentials: "include"` y el header CSRF consistente con el resto del store
- [ ] T026 [US1] Crear `frontend/src/components/dashboard/AgentTokensPanel.jsx`: listado de credenciales con prefijo y `last_used_at`, formulario de creación, aviso de un solo uso con botón de copiar, y confirmación antes de revocar — leyendo y escribiendo estado **solo** vía las acciones de flux (Principio X), sin `localStorage`. El aviso del token recién creado DEBE mostrar **las dos formas de conectarlo**, listas para copiar: el encabezado `Authorization: Bearer ...` y el bloque JSON del puente stdio (FR-023). Sin esto SC-001 no se cumple: el usuario tendría que leer documentación técnica para conectar su agente
- [ ] T027 [US1] Montar `AgentTokensPanel` en la pestaña Configuración de `frontend/src/views/dashboard/Dashboard.jsx`, junto al perfil y sobre la marca de agua de versión
- [ ] T028 [P] [US1] Escribir tests en `frontend/src/components/dashboard/AgentTokensPanel.test.jsx`: el token se muestra una vez y desaparece al cerrar el aviso, revocar pide confirmación, y el componente no escribe en `localStorage`

### Puente stdio (FR-023)

- [ ] T029 [US1] Implementar el puente en `backend/tools/ahorrapp_mcp_bridge.py` según [contracts/stdio-bridge.md](./contracts/stdio-bridge.md): bucle sobre stdin, una línea = un mensaje JSON-RPC, reenvío por `POST` a `AHORRAPP_URL` con `Authorization: Bearer $AHORRAPP_TOKEN`, respuesta por stdout con `flush()`; solo biblioteca estándar y **sin importar nada de `app/`**, para que se pueda copiar a otra máquina
- [ ] T030 [P] [US1] Escribir tests del puente en `backend/tests/test_mcp_bridge.py` lanzándolo como subproceso con `AHORRAPP_URL` apuntando a un servidor HTTP de prueba: una línea de entrada produce exactamente una de salida; `202` no escribe nada; stdin cerrado sale con código 0; sin `AHORRAPP_TOKEN` sale con código 1; JSON inválido devuelve `-32700` sin tocar el backend; backend caído devuelve `-32603` con el `id` correcto; y **el token no aparece nunca en stdout ni en stderr**

### Validación

- [ ] T031 [US1] Ejecutar los escenarios 1, 2, 3, 6, 9 y 10 de [quickstart.md](./quickstart.md) y anotar los resultados (incluye SC-002 aislamiento, SC-003 revocación inmediata, y las **dos vías** de conexión del escenario 10: HTTP directo y puente stdio)

**Checkpoint**: US1 funcional. Un agente real se conecta, descubre tools y lee datos. Es el MVP
desplegable.

---

## Phase 4: User Story 2 - Registrar gastos hablando con el agente (Priority: P1)

**Goal**: el usuario le dice "gasté 850 en el super" al agente y la transacción queda registrada
igual que si la hubiera escrito en la app.

**Independent Test**: desde un agente conectado, pedir que registre un gasto y verificar en la app
web que aparece con descripción, monto, signo y categoría correctos.

- [ ] T032 [US2] Implementar el tool `create_transaction` en `backend/app/services/mcp_tools.py`, delegando en `create_transaction_service(user_id, raw_input)` — el mismo camino que la app web, incluida la llamada a n8n
- [ ] T033 [US2] Implementar el límite de ritmo de `create_transaction` en `backend/app/services/mcp_tools.py`: **máximo 10 transacciones creadas por credencial en una ventana móvil de 60 segundos**, contadas con un `SELECT COUNT(*)` sobre `Transaction` filtrando por `user_id` y `date >= now() - 60s` (no en memoria: 5 workers de gunicorn), devolviendo `isError: true` con un mensaje de espera a partir de la 11.ª (Decisión 7)
- [ ] T034 [US2] Mapear el `RuntimeError` de `backend/app/services/n8n_service.py` a un `isError` con mensaje fijo sobre el servicio de interpretación, **sin** `str(e)`, en `backend/app/services/mcp_service.py`
- [ ] T035 [P] [US2] Escribir tests en `backend/tests/test_mcp_tools.py` con el webhook de n8n mockeado: un gasto queda con `amount` negativo y `raw_input` con el texto original; un ingreso queda positivo; una caída de n8n devuelve `isError` y **no** deja ninguna transacción en la base; 10 creaciones seguidas pasan y la **11.ª** devuelve `isError` sin llamar a n8n; y pasada la ventana de 60 s (simulada moviendo el `date` de las previas) vuelve a permitir
- [ ] T036 [US2] Ejecutar el escenario 4 de [quickstart.md](./quickstart.md), incluyendo la comparación campo por campo contra una transacción creada desde la UI (SC-004)

**Checkpoint**: US1 y US2 funcionan de forma independiente.

---

## Phase 5: User Story 3 - Consultar y analizar sus finanzas (Priority: P2)

**Goal**: el usuario pregunta "¿cuánto gasté este mes?" o pide un gráfico por categoría, y el
agente responde con datos reales.

**Independent Test**: pedir el resumen del mes desde el agente y contrastar los números contra los
que muestra el dashboard para el mismo rango.

- [ ] T037 [US3] Implementar el tool `get_analytics` en `backend/app/services/mcp_tools.py`, delegando en `get_analytics_service(user_id, start_date, end_date)` y parseando las fechas `YYYY-MM-DD` a `date` antes de llamar
- [ ] T038 [P] [US3] Escribir tests en `backend/tests/test_mcp_tools.py`: la respuesta trae `by_date`, `by_category`, `group_by` y `summary`; una fecha mal formada da `isError` sin tocar nada; `start_date > end_date` propaga el `BadRequestError` del service; la respuesta **no** contiene imágenes ni base64 (FR-012)
- [ ] T039 [US3] Ejecutar el escenario 5 de [quickstart.md](./quickstart.md), verificando que `summary` y `by_category` coinciden exactamente con el panel de Analíticas para el mismo rango (SC-005)

**Checkpoint**: US1, US2 y US3 funcionan de forma independiente.

---

## Phase 6: User Story 4 - Administrar categorías desde el agente (Priority: P3)

**Goal**: el usuario crea y elimina categorías desde el agente, y ninguna eliminación se ejecuta
sin confirmación explícita.

**Independent Test**: crear y eliminar una categoría desde el agente verificando cada cambio en la
app web, y comprobar que un borrado sin confirmar es rechazado sin borrar nada.

- [ ] T040 [P] [US4] Implementar el tool `create_category` en `backend/app/services/mcp_tools.py`, delegando en `create_category_service(user_id, name, color)`, con el `enum` de los 8 colores en el `inputSchema` como ayuda al agente (la validación real sigue en el service, Principio V)
- [ ] T041 [US4] Implementar `delete_category` de dos fases en `backend/app/services/mcp_tools.py`, aceptando `category_id` **o** `name`: la previsualización incluye el conteo de transacciones que usan la categoría y aclara explícitamente que **no se borran ni se modifican** porque `Transaction.category` es un String y no una FK (FR-021, Decisión 6)
- [ ] T042 [US4] Implementar el manejo de ambigüedad de `delete_category` en `backend/app/services/mcp_tools.py`: si `name` matchea más de una categoría, devolver las coincidencias con su `id`, **sin** emitir `confirm_token` y sin ejecutar nada (FR-020, SC-008)
- [ ] T043 [US4] Marcar `destructiveHint: true` y `readOnlyHint: false` en `delete_category` y redactar su `description` instruyendo a confirmar con el usuario antes de llamar (FR-019), en `backend/app/services/mcp_tools.py`
- [ ] T044 [P] [US4] Escribir tests de categorías en `backend/tests/test_mcp_confirmation.py`: la fase 1 no borra nada y devuelve `confirm_token`; la fase 2 con token válido borra; los 5 casos de token inválido (inventado, expirado, de otro usuario, de otro `target_id`, reutilizado) dejan la categoría intacta (SC-007); un `name` ambiguo lista las opciones sin borrar y sin emitir token (SC-008); la previsualización reporta el conteo correcto y las transacciones **siguen existiendo** con su categoría como texto después de confirmar (FR-021); `delete_category` sobre una categoría de **otro** usuario devuelve "no encontrada" y no emite token
- [ ] T045 [US4] Ejecutar el escenario 8 de [quickstart.md](./quickstart.md) y la parte de `delete_category` del escenario 7

**Checkpoint**: US4 funcional e independiente. Las categorías se crean y se borran, con
confirmación y sin ambigüedad.

---

## Phase 7: User Story 5 - Corregir y borrar transacciones desde el agente (Priority: P3)

**Goal**: el usuario corrige una transacción mal cargada o elimina una duplicada desde el agente,
con confirmación obligatoria solo para el borrado.

**Independent Test**: desde un agente conectado, corregir el monto de una transacción y eliminar
otra, verificando cada cambio en la app web, y comprobar que el borrado sin confirmar es rechazado
sin borrar nada.

> Esta fase cubre FR-014 y FR-022. No depende de US4: la maquinaria de confirmación compartida vive
> en la fase 2 (T010), así que ambas stories se pueden hacer en cualquier orden o en paralelo.

- [ ] T046 [P] [US5] Implementar el tool `find_transactions` en `backend/app/services/mcp_tools.py` (búsqueda por texto en `description` y/o rango de fechas, filtrada por `user_id`, `limit` 1–50), que es el camino por el que el agente resuelve una referencia difusa en un `id` concreto (FR-022, FR-020)
- [ ] T047 [US5] Implementar el tool `update_transaction` en `backend/app/services/mcp_tools.py`, delegando en `update_transaction_service(user_id, transaction_id, data)`, **sin** exigir `confirm_token` (modificar es reversible; ver escenario 5 de US5)
- [ ] T048 [US5] Implementar `delete_transaction` de dos fases en `backend/app/services/mcp_tools.py`: sin `confirm_token` devuelve la previsualización del registro (descripción, monto, categoría, fecha) + un `confirm_token`, sin tocar datos; con token válido delega en `delete_transaction_service`
- [ ] T049 [US5] Marcar `destructiveHint: true` y `readOnlyHint: false` en `delete_transaction`, `readOnlyHint: true` en `find_transactions`, y redactar la `description` de `delete_transaction` instruyendo a confirmar con el usuario antes de llamar (FR-019), en `backend/app/services/mcp_tools.py`
- [ ] T050 [P] [US5] Escribir tests de transacciones en `backend/tests/test_mcp_confirmation.py`: la fase 1 no borra nada y devuelve `confirm_token`; la fase 2 borra; los 5 casos de token inválido dejan la transacción intacta (SC-007); un `confirm_token` emitido para la transacción A no sirve para borrar la B
- [ ] T051 [P] [US5] Escribir tests de ownership y ambigüedad en `backend/tests/test_mcp_tools.py`: `update_transaction` y `delete_transaction` sobre una transacción de **otro** usuario devuelven "no encontrada" y no emiten `confirm_token`; `find_transactions` nunca devuelve transacciones ajenas; `update_transaction` no exige confirmación
- [ ] T052 [US5] Ejecutar el escenario 7 de [quickstart.md](./quickstart.md) (parte de `delete_transaction`) y el escenario 8b (corregir una transacción y resolver una referencia ambigua con `find_transactions`)

**Checkpoint**: las 5 user stories funcionan de forma independiente.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [ ] T053 Correr `pytest -q` completo desde `backend/` y confirmar cero regresiones en los tests previos (SC-006), releyendo antes la cabecera de `backend/tests/conftest.py` sobre el `drop_all()`
- [ ] T054 [P] Actualizar la tabla de Endpoints en `CLAUDE.md` con `/mcp` y `/agent-token/*`, y agregar `AgentToken` a la tabla de Modelos
- [ ] T055 [P] Actualizar `.claude/memory/project-state.md`: la feature 007, la decisión de tokens opacos, la nota de que `specs/005-shared-jwt-blocklist/` sigue abierta por el `logout` de la app web pero ya no bloquea a 007, y el pendiente de **OAuth 2.1 + RFC 9728** si en algún momento se quiere conectar ChatGPT o Claude web (hoy fuera de alcance, ver Decisión 9)
- [ ] T056 Ejecutar con `docker compose up --build` (5 workers de gunicorn, el escenario real de producción) **dos** verificaciones obligatorias: (a) el escenario 11 de [quickstart.md](./quickstart.md) — `/mcp` no devuelve el shell del SPA y ninguna respuesta de `/mcp` queda en Cache Storage (Principio VIII); y (b) la verificación multi-worker de **SC-003** — repetir el ciclo usar → revocar → usar varias veces seguidas y confirmar que el rechazo es inmediato sin importar qué worker atienda. **(b) no es opcional**: es la cláusula "incluso con varias instancias" de SC-003 y la condición 2 de la excepción del Principio III, y es exactamente lo que el mecanismo anterior (`BLACKLIST` en memoria) no cumple
- [ ] T057 Ejecutar el escenario 10 de [quickstart.md](./quickstart.md) con un cliente MCP real y medir SC-001 (menos de 5 minutos desde la app hasta ver los 9 tools)
- [ ] T058 Revisión de seguridad final sobre `backend/app/routes/mcp_bp.py`, `backend/app/services/mcp_tools.py` y `backend/tools/ahorrapp_mcp_bridge.py`: ningún `str(e)` de excepción no controlada llega al agente, ningún tool acepta `user_id`, ningún tool alcanza `/user/*` (FR-006), el token nunca aparece en logs, y el puente no escribe el token ni en stdout ni en stderr
- [ ] T059 Marcar el checklist de Success Criteria de [quickstart.md](./quickstart.md) con los resultados de los 8 SC

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup & Gates)**: sin dependencias. T001 ✅ cerrada, así que ya no bloquea nada.
  Quedan T002 y T003.
- **Phase 2 (Foundational)**: sin bloqueos pendientes. **Bloquea todas las user stories.**
- **Phase 3 (US1)**: depende de Phase 2 completa.
- **Phase 4 (US2)**, **Phase 5 (US3)**, **Phase 6 (US4)**, **Phase 7 (US5)**: dependen de Phase 2.
  Son independientes entre sí y de US1 en el backend; en la práctica conviene cerrar US1 primero
  porque es lo que permite probar cualquier tool con un cliente real.
- **Phase 8 (Polish)**: depende de las user stories que se quieran entregar.

### User Story Dependencies

- **US1 (P1)**: arranca tras Phase 2. Sin dependencias de otras stories. Es el MVP.
- **US2 (P1)**: arranca tras Phase 2. Independiente de US1 a nivel de código.
- **US3 (P2)**: arranca tras Phase 2. Independiente.
- **US4 (P3)**: arranca tras Phase 2. T041 y T042 dependen de T010 (el `confirm_token`).
- **US5 (P3)**: arranca tras Phase 2. T048 depende de T010. **Independiente de US4**: la maquinaria
  de confirmación que comparten ya está en la fase 2, así que las dos se pueden hacer en cualquier
  orden o en paralelo.

### Within Each User Story

- Models → services → tools → endpoints → frontend → validación manual
- Los tests de un service se escriben junto con el service, no después de mergear (Principio VII)

### Parallel Opportunities

- **Phase 1**: T002 y T003 en paralelo (T001 ya está cerrada).
- **Phase 2**: T009, T010 y T011 en paralelo con T004–T008. T012 depende del registry, así que va
  después de definir la forma de un tool. **T015 y T016 van después de T014**: ambas prueban el
  endpoint ya registrado, y T016 en particular falla si corre antes del registro (era el hallazgo
  F1 del análisis: la versión anterior de esta tarea estaba en la fase 1 y el catch-all del SPA
  habría respondido `index.html`).
- **Phase 3**: T019, T022 y T028 en paralelo. El frontend (T025–T028) es independiente del
  handshake (T020–T022) y del puente (T029–T030), así que se pueden repartir en tres frentes.
- **Phase 6**: T040 en paralelo con el arranque de T041.
- **Phase 7**: T046 en paralelo con T047; T050 y T051 en paralelo.
- **Phases 6 y 7 completas en paralelo** entre sí (distintas stories, mismo archivo
  `mcp_tools.py` — coordinar el merge, no el diseño).
- **Phase 8**: T054 y T055 en paralelo.

---

## Parallel Example: User Story 1

```bash
# Tres frentes independientes una vez cerrada la Phase 2:
Task: "T019 Tests de los endpoints REST en backend/tests/test_agent_token_bp.py"
Task: "T022 Tests de los dos handshakes en backend/tests/test_mcp_transport.py"
Task: "T028 Tests del panel en frontend/src/components/dashboard/AgentTokensPanel.test.jsx"

# Y en paralelo, los dos tools de lectura:
Task: "T023 list_transactions y list_categories en backend/app/services/mcp_tools.py"
```

---

## Implementation Strategy

### MVP First (US1)

1. ~~T001~~ ✅ cerrada: enmienda del Principio III aprobada, auth Bearer habilitada.
2. Phase 2 completa (modelo, servicio de credenciales, dispatcher, transporte).
3. Phase 3 (US1).
4. **PARAR Y VALIDAR**: escenarios 1, 2, 3, 6 y 9 de quickstart. El 6 (aislamiento) y el 9
   (revocación) son los que no se pueden postergar: son los invariantes de seguridad de la feature.
5. Desplegable como MVP: un agente que lee finanzas, con credenciales revocables.

### Incremental Delivery

1. Setup + Foundational → base lista
2. + US1 → agente conectado y leyendo (**MVP**)
3. + US2 → registrar gastos hablando
4. + US3 → analíticas y gráficos
5. + US4 → categorías con borrado confirmado
6. + US5 → corregir y borrar transacciones
7. Polish → validación en producción y documentación

Cada incremento agrega valor sin romper el anterior.

---

## Notes

- Las tareas `[P]` tocan archivos distintos y no dependen entre sí.
- **T001 era un gate con decisión del usuario**, ya cerrado (constitución v1.1.0).
- Commit por tarea o por grupo lógico.
- Los dos invariantes de seguridad a no postergar: **SC-002** (aislamiento entre usuarios, T024,
  T044 y T051) y **SC-007** (nada se borra sin confirmar, T044 y T050).
- **T056(b) tampoco se posterga**: es la única verificación de la cláusula multi-instancia de
  SC-003, y requiere los 5 workers de `docker compose`.
- Antes de cualquier corrida de `pytest`, releer la cabecera de `backend/tests/conftest.py`: la
  fixture `db` hace `drop_all()` y ya vació la base de desarrollo una vez.
- **Dependencias nuevas: ninguna.** Si alguna tarea parece necesitar `pip install`, revisar primero
  la Decisión 1 de [research.md](./research.md) — el SDK `mcp` se descartó a propósito.

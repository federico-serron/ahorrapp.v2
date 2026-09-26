# Feature Specification: Cerrar gaps de cobertura de tests en el backend

**Feature Branch**: `003-backend-test-coverage`

**Created**: 2026-08-29

**Status**: Draft

**Input**: User description: "sigamos con la correcion de los bugs T007, T008 y T013. Puedes encontrar info al respecto en specs/001-project-baseline/tasks.md"

**Contexto**: hallazgos T007, T008 y T013 de la auditoría de `specs/001-project-baseline/`. T007 y
T008 violan el Principio VII de la constitución (cobertura de tests obligatoria para lógica de
negocio); T013 es un hallazgo posterior — un archivo de test que ya no compila contra el código
actual, detectado al correr la suite completa durante el trabajo de T001.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - La suite de tests corre completa, sin archivos rotos (Priority: P1)

Quien mantiene el proyecto (el propio usuario, o el asistente en una sesión futura) necesita
poder correr `pytest` sobre todo el backend y confiar en el resultado, sin tener que recordar
excluir un archivo roto a mano.

**Why this priority**: hoy `backend/tests/test_transaction_service.py` ni siquiera colecciona
(falla al importar `LIMIT_MAX`, que no existe), lo que obliga a correr la suite con
`--ignore` y esconde cualquier regresión real en `transaction_service.py` detrás de ese ruido.
Es el problema más urgente porque compromete la confianza en *toda* la suite, no solo en un área.

**Independent Test**: correr `pytest` sin ningún flag `--ignore` y verificar que colecciona y
corre sin errores de importación.

**Acceptance Scenarios**:

1. **Given** el código actual de `transaction_service.py` (paginación por `page`/`per_page`),
   **When** se corre la suite completa de backend, **Then** `test_transaction_service.py`
   colecciona y sus tests reflejan el contrato real del servicio (no uno viejo con
   `limit`/`offset`).

---

### User Story 2 - Cobertura unitaria de la lógica de autenticación (Priority: P2)

Quien mantiene el proyecto necesita saber, sin leer el código a mano, que la lógica de negocio de
`auth_service.py` (creación de usuario, login, edición, actualización de perfil, chequeo de rol
admin) se comporta como se espera — y que un cambio futuro que la rompa se detecta automáticamente.

**Why this priority**: es la capa de servicio de autenticación, la más sensible en seguridad de
todo el backend, y hoy no tiene un solo test unitario propio (`backend/tests/` no tiene ningún
`test_auth_service.py`) — solo cobertura indirecta vía los tests de blueprint.

**Independent Test**: correr la nueva suite de tests de `auth_service` de forma aislada, sin
necesidad de levantar el servidor HTTP.

**Acceptance Scenarios**:

1. **Given** datos válidos, **When** se ejercita cada función pública de `auth_service.py`,
   **Then** se comporta según lo documentado (crea, autentica, edita, actualiza o verifica el rol
   correctamente).
2. **Given** datos inválidos o condiciones de error para cada función (email duplicado, password
   incorrecto, usuario inexistente, campo no editable, rol insuficiente), **When** se ejercita la
   función, **Then** levanta la excepción esperada con el tipo correcto.

---

### User Story 3 - Cobertura de integración completa para los endpoints de usuario y pago (Priority: P3)

Quien mantiene el proyecto necesita que los endpoints de `user_bp.py` y `paypal_bp.py` tengan
prueba automatizada de su camino feliz (no solo del caso "error inesperado, no filtra detalles"
ya cubierto en el trabajo de T005).

**Why this priority**: hoy `TestCreateUserEndpoint`, `TestLoginEndpoint`, `TestUpdateMeEndpoint`,
`TestCreateOrderEndpoint` y `TestCaptureOrderEndpoint` (en `backend/tests/test_user_bp.py` y
`test_paypal_bp.py`) solo tienen el test de "no filtra excepción" — falta el camino feliz y los
rechazos esperables (ej. señal de éxito real de signup, login con password incorrecta, creación
de orden de PayPal exitosa).

**Independent Test**: correr los tests de blueprint existentes más los nuevos y verificar que
cada endpoint tiene al menos un caso de éxito y un caso de rechazo de negocio (no solo de error
interno) cubierto.

**Acceptance Scenarios**:

1. **Given** un request válido a cada endpoint de `user_bp.py`/`paypal_bp.py` sin cobertura de
   camino feliz hoy, **When** se ejecuta, **Then** un test automatizado confirma la respuesta de
   éxito esperada (status code y forma del body).
2. **Given** un request con un error de negocio esperable (no un error interno inesperado) para
   esos mismos endpoints, **When** se ejecuta, **Then** un test automatizado confirma el status
   code y mensaje de rechazo correctos.

### Edge Cases

- Si al escribir estos tests aparece un bug real de comportamiento (no solo falta de cobertura),
  se reporta explícitamente en vez de "arreglarlo" en silencio dentro de esta feature — el
  alcance acordado es agregar/reparar tests, no cambiar lógica de producción salvo que se acuerde
  explícitamente.
- `test_transaction_service.py` no solo tiene nombres desactualizados (`LIMIT_MAX` en vez de
  `PER_PAGE_MAX`) — el propio contrato de retorno cambió (antes devolvía `(lista, total)`, hoy
  `get_transactions_service` devuelve `(lista, meta_paginación, resumen)`). La reparación implica
  reescribir esos tests contra el contrato actual, no solo renombrar un import.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: La suite de tests de `transaction_service.py` DEBE coleccionar y ejecutarse sin
  errores, reflejando el contrato de paginación actual (`page`/`per_page`, retorno de
  lista + metadatos de paginación + resumen).
- **FR-002**: Cada función pública de `auth_service.py` (`create_user_service`,
  `login_user_service`, `edit_user_service`, `update_profile_service`, `is_user_admin`) DEBE
  tener al menos un test unitario de camino feliz y uno de camino de error.
- **FR-003**: Los endpoints `POST /user/signup`, `POST /user/login` y `PUT /user/me` DEBEN tener
  al menos un test de integración de camino feliz, además del test de "no filtra errores
  internos" ya existente.
- **FR-004**: Los endpoints `POST /paypal/create-order` y `POST /paypal/capture-order` DEBEN
  tener al menos un test de integración de camino feliz (con las dependencias externas —
  `get_access_token`, la API de PayPal — mockeadas, nunca llamadas reales).
- **FR-005**: Ningún test nuevo o corregido por esta feature DEBE requerir cambios en el código
  de producción (`app/services/`, `app/routes/`) salvo que se descubra y se acuerde
  explícitamente un bug real — en cuyo caso se documenta por separado, no se corrige en silencio.
- **FR-006**: Después de esta feature, `pytest` sobre todo `backend/tests/` DEBE correr sin
  necesidad de ningún flag `--ignore`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100% de las funciones públicas de `auth_service.py` tiene al menos un test
  unitario pasando.
- **SC-002**: La suite completa de pytest (sin exclusiones) corre y pasa en menos de 30 segundos
  en un entorno de desarrollo estándar.
- **SC-003**: El 100% de los endpoints de `user_bp.py` y `paypal_bp.py` tiene al menos un test de
  camino feliz automatizado (no solo de manejo de error interno).
- **SC-004**: Cero errores de colección (`ImportError`/`CollectionError`) al correr `pytest` sobre
  todo el directorio de tests.

## Assumptions

- Se reutiliza el patrón de fixtures ya establecido en `backend/tests/conftest.py` (`app`, `db`,
  `client`, `sample_user`, `auth_headers`, `app_ctx`) — no se crean fixtures nuevas de alcance
  global.
- Las llamadas externas (n8n, PayPal) siempre se mockean en los tests nuevos; ninguno hace una
  petición HTTP real a un servicio de terceros.
- El alcance no incluye agregar tests de frontend ni de otros servicios (`category_service`,
  `analytics_service` ya tienen cobertura y no forman parte de este pedido).
- La reparación de `test_transaction_service.py` (T013) puede requerir reescribir varios casos de
  test existentes, no solo renombrar un identificador — se documenta como parte de esta feature,
  no como hallazgo nuevo separado.

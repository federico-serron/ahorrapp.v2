# Feature Specification: Restringir el listado de usuarios a administradores

**Feature Branch**: `002-admin-role-check`

**Created**: 2026-08-29

**Status**: Draft

**Input**: User description: "Agregar chequeo de rol admin (is_user_admin) a GET /user/users en backend/app/routes/user_bp.py::show_users(). Hoy cualquier usuario autenticado lista todos los usuarios. Ya hay un baseline documentado en 001-project-baseline como T002"

**Contexto**: hallazgo T002 de la auditoría de `specs/001-project-baseline/`. Viola el Principio II
de la constitución (aislamiento de datos por usuario / autorización explícita): hoy cualquier
usuario autenticado, sin importar su rol, puede ver el listado completo de usuarios de la
aplicación.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Un administrador consulta el listado de usuarios (Priority: P1)

Un usuario con rol de administrador necesita ver el listado completo de usuarios registrados
para tareas de soporte/gestión de la plataforma.

**Why this priority**: es el uso legítimo que la funcionalidad ya tiene y debe seguir
funcionando exactamente igual que hoy — esta feature no cambia el comportamiento para
administradores, solo lo restringe para el resto.

**Independent Test**: autenticarse como un usuario con rol `admin` y pedir el listado; debe
recibir la misma respuesta que recibe hoy cualquier usuario autenticado.

**Acceptance Scenarios**:

1. **Given** una sesión válida de un usuario con rol `admin`, **When** solicita el listado de
   usuarios, **Then** recibe la lista completa de usuarios registrados.

---

### User Story 2 - Un usuario sin permisos de administrador intenta ver el listado (Priority: P1)

Un usuario autenticado que **no** tiene rol de administrador intenta acceder al listado completo
de usuarios (por curiosidad, error, o mal uso deliberado de la sesión).

**Why this priority**: es el problema de seguridad concreto que esta feature corrige — hoy este
caso tiene éxito y no debería.

**Independent Test**: autenticarse como un usuario común (rol distinto de `admin`) y solicitar el
listado; debe ser rechazado sin recibir ningún dato de otros usuarios.

**Acceptance Scenarios**:

1. **Given** una sesión válida de un usuario cuyo rol no es `admin`, **When** solicita el listado
   de usuarios, **Then** la solicitud es rechazada y no recibe información de ningún usuario
   (ni el propio ni de terceros) en esa respuesta.
2. **Given** una sesión sin autenticar, **When** se solicita el listado de usuarios, **Then** la
   solicitud es rechazada (comportamiento ya existente, no cambia con esta feature).

### Edge Cases

- Un usuario que era `admin` cuando inició sesión pero cuyo rol fue degradado después (por otro
  administrador) DEBE ser rechazado en la siguiente solicitud, sin necesidad de volver a
  loguearse — el chequeo se hace contra el rol actual almacenado, no contra un dato guardado en
  la sesión/token.
- Un usuario cuya cuenta fue eliminada después de emitido su token no debe poder ejercer ningún
  permiso, admin incluido.
- El mensaje de rechazo no debe revelar si el usuario objetivo existe, cuántos usuarios hay, ni
  ningún detalle interno del sistema (consistente con el Principio IV de la constitución).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE permitir obtener el listado completo de usuarios únicamente a
  quienes tengan rol de administrador.
- **FR-002**: El sistema DEBE rechazar la solicitud de listado hecha por un usuario autenticado
  que no sea administrador, sin devolver ningún dato de usuarios en esa respuesta.
- **FR-003**: El sistema DEBE seguir rechazando solicitudes no autenticadas al listado de
  usuarios (comportamiento ya existente, sin cambios).
- **FR-004**: La verificación del rol DEBE evaluarse contra el estado actual del usuario en cada
  solicitud, no contra un valor cacheado o incluido en el token de sesión, de forma que un
  cambio de rol tenga efecto inmediato.
- **FR-005**: La respuesta de rechazo DEBE ser un mensaje genérico de permisos insuficientes, sin
  exponer detalles internos ni confirmar/negar la existencia de otros usuarios.
- **FR-006**: El listado devuelto a un administrador DEBE seguir excluyendo campos sensibles
  (como la contraseña) tal como ocurre hoy.

### Key Entities

- **User**: ya existente. El atributo relevante para esta feature es `role` (valores usados
  hoy: `'user'`, `'admin'`).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100% de las solicitudes de listado de usuarios hechas por cuentas no-admin son
  rechazadas sin exponer datos de usuarios.
- **SC-002**: Las cuentas admin pueden seguir obteniendo el listado completo sin ninguna
  regresión respecto al comportamiento actual.
- **SC-003**: Ningún mensaje de rechazo generado por esta funcionalidad contiene detalles
  internos del sistema o confirma la existencia de datos de terceros.

## Assumptions

- Se reutiliza la noción de rol `admin` ya existente en el modelo `User` (`role` string); esta
  feature no introduce un nuevo sistema de permisos ni roles adicionales.
- El código de rechazo apropiado es "acceso prohibido" (el usuario está autenticado pero no
  autorizado para esta acción), distinto del código ya usado para "no autenticado".
- No se cambia qué datos se listan ni el formato de la respuesta para administradores — solo se
  restringe quién puede pedirla.
- No está en el alcance de esta feature agregar paginación, filtros, ni un panel de
  administración nuevo; solo corregir el control de acceso del endpoint existente.

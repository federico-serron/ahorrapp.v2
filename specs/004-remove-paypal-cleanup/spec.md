# Feature Specification: Revocación de sesión, baja de PayPal y limpieza de vistas huérfanas

**Feature Branch**: `004-remove-paypal-cleanup`

**Created**: 2026-08-29

**Status**: Draft

**Input**: User description: "Corrige el bug T003 documentado en specs/001-project-baseline/tasks.md. En cuanto a T004 elimina lo relacionado con paypal ya que se usara en esta aplicacion, siempre y cuando lo que se deba eliminar no haga conflicto con otras partes del proyecto. Lo mismo con T006. En cuanto a T012 elimina las vistas no enrutadas"

**Contexto**: Cubre T003, T012 y una reinterpretación explícita de T004/T006 (confirmada con el
usuario: en vez de arreglar/conectar PayPal, se elimina por completo — no se va a usar en la
aplicación). Los tres son hallazgos de `specs/001-project-baseline/`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cerrar sesión invalida realmente el acceso (Priority: P1)

Un usuario hace logout desde un dispositivo y espera que, a partir de ese momento, la sesión
anterior ya no sirva para acceder a sus datos — ni siquiera si alguien más obtiene esa cookie
antes de que expire naturalmente.

**Why this priority**: es una falla de seguridad activa — hoy `logout()` no invalida nada real
(la línea de revocación está comentada), así que un token robado o compartido sigue funcionando
hasta su expiración natural, sin importar cuántas veces el usuario haga logout.

**Independent Test**: hacer login, guardar la cookie de sesión, hacer logout, y reintentar un
endpoint protegido con la cookie guardada — debe ser rechazado.

**Acceptance Scenarios**:

1. **Given** una sesión activa, **When** el usuario hace logout, **Then** un request posterior a
   cualquier endpoint protegido usando la cookie de esa sesión es rechazado.
2. **Given** dos sesiones activas del mismo usuario (dos logins), **When** una se cierra con
   logout, **Then** la otra sesión sigue funcionando con normalidad (la revocación es por token,
   no por usuario).

---

### User Story 2 - La aplicación ya no ofrece pagos con PayPal (Priority: P2)

Como PayPal no se va a usar en esta aplicación, ningún usuario debe encontrar un botón, ruta o
respuesta de API relacionada con PayPal en ningún momento — ni completa, ni a medio construir.

**Why this priority**: hoy existe una integración de PayPal a medio terminar (sin autenticación,
sin conectar con el resto del negocio) que no se va a completar; dejarla expuesta es superficie
de ataque y confusión sin ningún beneficio.

**Independent Test**: recorrer la aplicación de punta a punta (dashboard, perfil, categorías,
transacciones) y confirmar que no aparece ninguna opción de pago con PayPal; intentar golpear
las rutas de API de PayPal directamente y confirmar que ya no existen.

**Acceptance Scenarios**:

1. **Given** la aplicación corriendo, **When** un usuario navega por todas las pantallas
   accesibles, **Then** no encuentra ninguna mención ni botón de PayPal.
2. **Given** un cliente HTTP externo, **When** intenta llamar a cualquier ruta que antes
   pertenecía a PayPal, **Then** recibe una respuesta de "no encontrado" (la ruta ya no existe),
   no un error interno.
3. **Given** el resto de las funcionalidades existentes (login, transacciones, categorías,
   analíticas), **When** se elimina todo lo de PayPal, **Then** ninguna de ellas se ve afectada.

---

### User Story 3 - No quedan pantallas fantasma en el frontend (Priority: P3)

Quien mantiene el proyecto no quiere código de vistas que nunca se muestra a ningún usuario real
(porque ninguna ruta del router apunta a ellas), porque genera confusión sobre qué está
realmente en producción.

**Why this priority**: son 4 archivos de vista (`Home.jsx`, `HomeView.jsx`, `ContactView.jsx`,
`PaymentMethodsView.jsx`) que existen pero no están conectados a ninguna ruta — documentados como
huérfanos en el baseline (T012). Es limpieza, no afecta ninguna funcionalidad visible hoy.

**Independent Test**: confirmar que la aplicación renderiza igual que antes en todas sus rutas
activas después de borrar estos archivos, y que ningún otro archivo los importa.

**Acceptance Scenarios**:

1. **Given** las vistas no enrutadas, **When** se eliminan, **Then** la aplicación sigue
   funcionando igual en `/dashboard` y en cualquier otra ruta que sí esté activa en el router.
2. **Given** el resto del código, **When** se eliminan esas vistas, **Then** no queda ningún
   import roto apuntando a un archivo borrado.

### Edge Cases

- `PaymentMethodsView.jsx` (una de las vistas huérfanas de la User Story 3) es también el único
  punto de la interfaz que llegaba a mostrar el componente de PayPal — al eliminarla como parte
  de la limpieza de huérfanos, ya no queda ningún punto de entrada de UI hacia PayPal antes
  incluso de tocar el componente de PayPal en sí.
- El campo `is_premium` del usuario NO es exclusivo de PayPal (es un atributo genérico de cuenta)
  — no se elimina ni se modifica como parte de esta feature, aunque la idea original de T006 era
  conectarlo a un pago. Queda como está, sin ninguna funcionalidad que lo actualice todavía.
- Otros métodos de pago mostrados en la misma pantalla huérfana (MercadoPago, Stripe) son stubs
  de UI sin backend real — no se tocan, porque el pedido es específicamente sobre PayPal y sobre
  vistas huérfanas, no sobre rediseñar la sección de pagos.
- Variables de entorno de PayPal (backend y frontend) y las del `docker-compose.yml` quedan sin
  ningún código que las lea tras esta limpieza — se eliminan también, para no dejar configuración
  fantasma.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE invalidar el token de sesión de forma que, tras el logout, ese
  token específico ya no sea aceptado por ningún endpoint protegido, aunque no haya expirado.
- **FR-002**: La invalidación por logout DEBE ser específica del token cerrado, sin afectar otras
  sesiones activas del mismo usuario emitidas con otro login.
- **FR-003**: El sistema NO DEBE exponer ningún endpoint de API relacionado con PayPal después de
  esta feature.
- **FR-004**: El sistema NO DEBE mostrar ningún elemento de interfaz (botón, ruta, vista) para
  pagar con PayPal después de esta feature.
- **FR-005**: La eliminación de PayPal NO DEBE afectar el comportamiento de ninguna funcionalidad
  existente no relacionada (autenticación, transacciones, categorías, analíticas).
- **FR-006**: El sistema NO DEBE incluir ningún archivo de vista de frontend que no sea
  alcanzable desde el router de la aplicación.
- **FR-007**: La eliminación de las vistas huérfanas NO DEBE dejar imports rotos ni afectar
  ninguna ruta actualmente en uso.
- **FR-008**: Toda configuración (variables de entorno, ejemplos, definiciones de despliegue)
  que exista únicamente para soportar PayPal DEBE eliminarse junto con el código que la usaba.

### Key Entities

- **User**: sin cambios de esquema. `is_premium` se mantiene tal cual, sin relación funcional con
  esta feature.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100% de los intentos de reutilizar una sesión después de hacer logout son
  rechazados.
- **SC-002**: Cero rutas, componentes o textos relacionados con PayPal permanecen alcanzables
  desde la aplicación (backend o frontend) tras esta feature.
- **SC-003**: El 100% de los archivos de vista de frontend restantes es alcanzable desde al menos
  una ruta del router.
- **SC-004**: La suite de tests existente (descontando los tests que testeaban específicamente lo
  eliminado) sigue pasando al 100% después de esta feature.

## Assumptions

- "Eliminar lo relacionado con PayPal" incluye: el blueprint y servicio de backend, sus tests,
  las vistas/componentes de frontend específicos de PayPal, las acciones del store que lo
  invocan, las rutas del router que apuntaban a sus páginas de éxito/cancelación, y toda variable
  de entorno o configuración de despliegue exclusiva de PayPal.
- No se elimina ni se toca la infraestructura genérica de métodos de pago (`paymentMethods.js`,
  componentes de MercadoPago/Stripe) más allá de quitar la entrada específica de PayPal — no se
  pidió eliminar el concepto de "métodos de pago" en general.
- El campo `is_premium` en el modelo `User` se mantiene sin cambios (Principio IX de la
  constitución: no se reestructuran modelos sin aprobación explícita, y no fue lo que se pidió).
- La revocación de sesión (T003) usa el mecanismo ya presente en el código (`BLACKLIST` en
  `app/blacklist.py`, hoy declarado pero nunca conectado) en vez de introducir un almacén nuevo
  (ej. Redis) — consistente con el Principio IX (no agrandar la superficie de infraestructura sin
  necesidad).

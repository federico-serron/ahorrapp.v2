# Feature Specification: Baseline del Estado Actual del Proyecto

**Feature Branch**: `001-project-baseline`

**Created**: 2026-08-28

**Status**: Draft

**Input**: User description: "Documentar el estado actual del proyecto: qué endpoints/páginas ya existen, qué modelos de datos hay, qué está implementado y funcionando, y qué está a medio terminar. Esto es un baseline, no una feature nueva."

**Nota de alcance**: este documento no describe una funcionalidad nueva de producto. Es un
relevamiento factual del código existente (backend + frontend) al 2026-08-28, para que
cualquier persona (o el propio asistente en sesiones futuras) pueda saber en 5 minutos qué
existe, qué funciona de punta a punta, y qué quedó a medio terminar — sin tener que releer
todo el repositorio. Sirve como punto de referencia para planificar features futuras
respetando la Constitución del proyecto (`.specify/memory/constitution.md`).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Onboarding rápido de quien retoma el proyecto (Priority: P1)

Alguien (el propio usuario dueño del proyecto, o el asistente al iniciar una sesión nueva)
necesita saber en minutos qué endpoints y pantallas existen realmente hoy, sin tener que leer
todo el código fuente para reconstruir ese mapa mental.

**Why this priority**: sin este baseline, cada nueva conversación/feature arranca re-explorando
el código desde cero, con riesgo de reintroducir bugs ya conocidos (ej. asumir que el pago con
PayPal ya acredita saldo, cuando no es así) o de proponer estructuras que ya existen.

**Independent Test**: se puede validar leyendo únicamente este documento y comparando cada
afirmación contra el código fuente citado (ruta de archivo) — si coincide, el documento cumple
su propósito.

**Acceptance Scenarios**:

1. **Given** el documento de baseline, **When** un lector busca "qué endpoints de autenticación
   existen", **Then** encuentra la lista completa con método HTTP, ruta y si requieren sesión.
2. **Given** el documento de baseline, **When** un lector busca "qué se puede hacer hoy en el
   frontend", **Then** encuentra qué rutas del router están realmente conectadas y cuáles vistas
   existen como archivo pero no están enrutadas.

---

### User Story 2 - Identificar trabajo a medio terminar antes de planificar una feature nueva (Priority: P2)

Antes de pedir una feature nueva relacionada a pagos, categorías o analíticas, el usuario quiere
saber qué parte de esa área ya está construida pero incompleta, para no duplicar trabajo ni
asumir que algo funciona cuando en realidad es un stub.

**Why this priority**: evita que una feature nueva se planifique sobre una base que en realidad
no está terminada (ej. pedir "mostrar historial de pagos" sin saber que los pagos de PayPal hoy
no generan ninguna `Transaction` ni actualizan `is_premium`).

**Independent Test**: se puede probar tomando cualquier ítem de la sección "Funcionalidad a
medio terminar / inconsistente" y verificando que, efectivamente, el comportamiento descrito
ocurre al ejercitar esa parte del sistema.

**Acceptance Scenarios**:

1. **Given** la sección de funcionalidad a medio terminar, **When** el usuario decide planificar
   una feature sobre esa área, **Then** puede anticipar qué falta antes de escribir la spec de la
   nueva feature.

---

### Edge Cases

- ¿Qué pasa si el código cambia después de este relevamiento? → El documento queda desactualizado
  por diseño (es una fotografía a una fecha); no se audita automáticamente. Se recomienda repetir
  este comando cuando el desvío percibido sea grande.
- ¿Qué pasa con archivos de frontend que existen pero no están importados en ningún router
  (`Home.jsx`, `HomeView.jsx`, `ContactView.jsx`, `PaymentMethodsView.jsx`)? → Se documentan
  explícitamente como "huérfanos" para que no se asuma que son parte del flujo activo.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El documento DEBE listar todos los blueprints y endpoints HTTP registrados en
  `backend/app/__init__.py`, con método, ruta completa (prefijo + ruta), y si requieren JWT.
- **FR-002**: El documento DEBE listar todos los modelos de datos (`backend/app/models.py`) con
  sus campos clave y relaciones.
- **FR-003**: El documento DEBE listar las rutas de frontend efectivamente registradas en el
  router (`Layout.jsx`) y distinguirlas de vistas/componentes que existen como archivo pero no
  están enrutadas.
- **FR-004**: El documento DEBE marcar cada área funcional como "Implementado y funcionando",
  "A medio terminar / inconsistente", u "Huérfano/no conectado", con la evidencia (archivo:línea
  o comportamiento observado) que sustenta esa clasificación.
- **FR-005**: El documento DEBE reflejar el estado de testing actual (qué capas tienen tests
  automatizados y cuáles no), sin repetir el detalle ya cubierto por la Constitución.
- **FR-006**: El documento NO debe proponer cambios de código ni nuevas funcionalidades — es
  puramente descriptivo del estado presente.

### Key Entities

- **User**: `id, name, email, password (hash), role ('user'|'admin'), is_premium, phone,
  last_login, is_active`. Relación 1-N con `Transaction` y `Category`.
- **Transaction**: `id, user_id (FK), description, amount (float; negativo=gasto,
  positivo=ingreso), category (string libre, no FK), raw_input, date`. `user_id` nunca se expone
  en `serialize()`.
- **Category**: `id, user_id (FK), name (máx. 30), color (uno de: emerald, teal, blue, violet,
  rose, orange, yellow, gray; default gray)`. Límite de 50 categorías por usuario.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Una persona sin conocimiento previo del repo puede identificar el propósito y
  estado (activo/incompleto) de cada endpoint backend en menos de 5 minutos leyendo solo este
  documento.
- **SC-002**: El 100% de los blueprints registrados en `create_app()` están documentados con al
  menos un endpoint listado.
- **SC-003**: El 100% de las rutas del `BrowserRouter` de frontend están documentadas, y toda
  vista/componente de nivel página que no esté enrutada queda marcada como huérfana.
- **SC-004**: Cada ítem marcado como "a medio terminar" incluye evidencia verificable (archivo o
  comportamiento reproducible), no una suposición.

## Assumptions

- Este documento describe el estado del código en la rama `dev` al 2026-08-28 (commit
  `f262a96` y posteriores cambios de esta sesión). No cubre ramas paralelas ni trabajo en curso
  no commiteado al momento del relevamiento.
- "Funcionando" significa que el flujo fue verificado leyendo el código (rutas, servicios,
  tests existentes) — no se ejecutó la aplicación end-to-end como parte de este relevamiento.
- El frontend de MercadoPago y Stripe (`components/payments/PaymentMethods/`) se documenta como
  scaffolding de UI; no se verificó si tienen backend real detrás más allá de PayPal.

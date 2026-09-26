# Feature Specification: PWA instalable en Android e iOS

**Feature Branch**: `006-pwa-installable`

**Created**: 2026-09-26

**Status**: Draft

**Input**: User description: "Haremos de esta web app una PWA en donde los usuarios desde sus dispositivos android o ios podran descargarse nuestra webapp en su homepage y esta actuara exactamente como una app descargada desde el playstore o appstore. Sigue siendo una web app pero esta vez sera una PWA descargable desde el navegador. Ya existe un baseline documentado en specs/001-project-baseline y una constitución con los principios del proyecto, eso se construye sobre esa base, no la reemplaza."

**Contexto**: Implementa el Principio VIII de la constitución ("PWA Standalone con Capacitor a
Futuro"), que ya anticipaba esta necesidad sin haberla construido todavía. No reemplaza ni
reestructura nada del baseline (`specs/001-project-baseline/`) — agrega la capa de instalabilidad
sobre el frontend React/Vite existente, sin tocar el backend Flask ni los modelos de datos.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Instalar la app desde el navegador (Priority: P1)

Un usuario que visita la web app desde su celular (Android o iOS) puede agregarla a su pantalla
de inicio y a partir de ese momento la abre como si fuera una app instalada, sin pasar por
ninguna tienda de aplicaciones.

**Why this priority**: es el objetivo central del pedido — sin esto, no hay PWA instalable, solo
una web app común.

**Independent Test**: abrir la URL de la app desde el navegador de un teléfono Android y de un
iPhone; confirmar que el navegador ofrece (u permite explícitamente, en iOS) la opción de
"agregar a la pantalla de inicio", y que el ícono resultante es el de la app, con su nombre
correcto.

**Acceptance Scenarios**:

1. **Given** un usuario navegando la app desde Chrome en Android, **When** el navegador determina
   que la app cumple los criterios de instalabilidad, **Then** ofrece instalarla a la pantalla de
   inicio con el ícono y nombre correctos de la app.
2. **Given** un usuario navegando la app desde Safari en iOS, **When** usa la opción "Agregar a
   pantalla de inicio" del navegador, **Then** la app se agrega con el ícono y nombre correctos
   (iOS no ofrece instalación automática, pero el resultado manual debe ser igual de completo).

---

### User Story 2 - La app instalada se comporta como una app nativa (Priority: P1)

Un usuario que abre la app desde el ícono de su pantalla de inicio la ve funcionar sin la barra de
direcciones ni los controles del navegador — a pantalla completa, con su propio color de tema, y
con una pantalla de carga reconocible mientras arranca.

**Why this priority**: es lo que distingue una PWA instalada de simplemente tener un acceso
directo a una pestaña del navegador — sin esto, el pedido explícito de "que actúe exactamente
como una app descargada" no se cumple.

**Independent Test**: abrir la app desde el ícono instalado (no desde el navegador) y confirmar
que no aparece ninguna barra de direcciones ni controles de navegador visibles.

**Acceptance Scenarios**:

1. **Given** la app instalada en el homescreen, **When** el usuario la abre, **Then** se muestra
   en modo pantalla completa, sin la interfaz del navegador.
2. **Given** la app instalada, **When** el sistema operativo la muestra en el selector de
   apps recientes o en la pantalla de carga inicial, **Then** usa el ícono, nombre y color de
   tema configurados para la app, no los genéricos del navegador.

---

### User Story 3 - La app sigue siendo usable con conexión inestable o momentáneamente sin conexión (Priority: P2)

Un usuario que abre la app instalada con mala señal, o que pierde la conexión brevemente mientras
la usa, no ve una pantalla en blanco ni un error de red crudo — la interfaz visual de la app carga
igual (aunque los datos financieros reales requieren conexión para actualizarse).

**Why this priority**: es lo que se espera de una app "que actúa como una app nativa" — una app
nativa no muestra una pantalla en blanco al perder señal. Es P2 (no P1) porque el valor central
de la instalación (US1/US2) no depende de esto, pero el pedido de "actuar exactamente como una
app" sí lo incluye como expectativa razonable.

**Independent Test**: instalar la app, cargarla una vez con conexión, luego activar modo avión y
volver a abrirla — la interfaz (shell visual: layout, estilos, navegación) debe seguir
apareciendo, aunque los datos financieros no se actualicen sin conexión.

**Acceptance Scenarios**:

1. **Given** la app fue abierta al menos una vez con conexión, **When** el usuario la reabre sin
   conexión, **Then** ve el shell visual de la app (no una pantalla en blanco ni el error nativo
   del navegador), con un aviso de que no hay conexión para los datos que la requieren.
2. **Given** un usuario autenticado en un dispositivo, **When** pierde y recupera la conexión
   durante el uso, **Then** ninguna respuesta cacheada expone datos financieros de otra sesión o
   de un usuario distinto al que está autenticado en ese momento (ver Edge Cases).

### Edge Cases

- **Ningún dato autenticado se cachea de forma reutilizable entre sesiones**: el mecanismo de
  cache offline (Principio VIII y Security Requirements de la constitución) NO debe cachear
  respuestas de la API que contengan cookies, tokens ni datos de transacciones/categorías del
  usuario — solo el shell visual estático (HTML, CSS, JS, íconos, fuentes). Esto es
  especialmente sensible en un dispositivo compartido.
- Un usuario que desinstala y reinstala la app (o borra los datos del sitio del navegador) no
  pierde acceso a su cuenta — su sesión se resuelve igual que en cualquier primera visita
  (login), sin ningún dato local que la app "recuerde" indebidamente.
- Si el navegador del usuario no soporta instalación de PWA (navegadores muy antiguos, algunos
  navegadores de terceros en iOS que no son Safari), la app sigue funcionando como una web app
  normal — no instalable, pero sin errores ni funcionalidad rota.
- Un ícono o nombre de instalación incorrecto/genérico (el favicon por defecto de Vite, por
  ejemplo) no es aceptable — debe ser explícitamente el de AhorrApp.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE declarar los metadatos necesarios (nombre de la app, ícono, color
  de tema, modo de visualización) para que los navegadores compatibles reconozcan la app como
  instalable.
- **FR-002**: La app instalada DEBE abrirse en modo pantalla completa, sin los controles de
  navegación del navegador.
- **FR-003**: La app DEBE mostrar un ícono y nombre propios y reconocibles (no genéricos) tanto
  en el proceso de instalación como una vez instalada (homescreen, selector de apps recientes).
- **FR-004**: El shell visual de la app (estructura, estilos, navegación) DEBE seguir
  disponible aunque el dispositivo esté sin conexión, después de haber sido cargado al menos una
  vez con conexión.
- **FR-005**: El sistema NO DEBE cachear de forma persistente ninguna respuesta de la API que
  contenga datos de sesión (cookies, tokens) o datos financieros del usuario (transacciones,
  categorías, analíticas) — el cacheo offline se limita a los recursos estáticos del frontend.
- **FR-006**: Cuando la app se usa sin conexión y se requieren datos que no están disponibles
  localmente, el sistema DEBE informar al usuario que no hay conexión, en vez de mostrar una
  pantalla en blanco o un error crudo del navegador.
- **FR-007**: La app DEBE seguir funcionando como una web app normal (sin errores, sin
  funcionalidad rota) en navegadores que no soporten instalación de PWA.
- **FR-008**: Ningún dato ni comportamiento existente del baseline (autenticación, transacciones,
  categorías, analíticas, arquitectura de blueprints/servicios) DEBE cambiar como resultado de
  esta feature — es una capa agregada sobre el frontend, no un reemplazo de nada existente.

### Key Entities

No involucra entidades de datos nuevas ni cambios al modelo existente (`User`, `Transaction`,
`Category` quedan sin cambios). Los "activos" nuevos son de configuración/presentación: metadatos
de instalación de la app, y un conjunto de íconos en los tamaños que los distintos sistemas
requieren.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un usuario puede instalar la app desde Chrome en Android y desde Safari en iOS, y
  encontrarla luego en su homescreen con el ícono y nombre correctos.
- **SC-002**: El 100% de las aperturas de la app instalada ocurren en modo pantalla completa, sin
  la interfaz del navegador visible.
- **SC-003**: El shell visual de la app carga correctamente sin conexión en el 100% de los casos
  donde ya fue cargado antes con conexión.
- **SC-004**: Cero respuestas de la API que contienen datos de sesión o datos financieros quedan
  cacheadas de forma persistente y reutilizable entre sesiones o usuarios distintos.
- **SC-005**: Ninguna funcionalidad existente del baseline (login, transacciones, categorías,
  analíticas) presenta una regresión medible tras esta feature.

## Assumptions

- "Actuar exactamente como una app descargada desde el Play Store o App Store" se interpreta,
  para el alcance de esta feature, como: instalable desde el navegador, se abre en pantalla
  completa con ícono/nombre propios, y mantiene su interfaz visual disponible sin conexión — no
  como acceso a APIs exclusivamente nativas (cámara, notificaciones push nativas, biometría del
  sistema, etc.), que están fuera de alcance de una PWA y quedarían para una futura envoltura con
  Capacitor, ya prevista (no construida) por el Principio VIII de la constitución.
- Se usa el ícono ya existente (`frontend/public/ahorrapp.png`) como fuente para generar los
  tamaños adicionales requeridos (ej. ícono maskable para Android, `apple-touch-icon` para iOS) —
  no se pide ni se asume un rediseño de marca.
- El shell visual cacheado para uso offline es el bundle estático de la aplicación (HTML, CSS,
  JS, fuentes, íconos) — no incluye ninguna captura de datos dinámicos del usuario, consistente
  con FR-005 y con los Security Requirements ya definidos en la constitución para la PWA.
- No se requiere que la funcionalidad transaccional (crear/editar transacciones, ver analíticas
  actualizadas) funcione completamente sin conexión — eso implicaría sincronización diferida de
  escritura y está fuera de alcance de este pedido, que se centra en la instalabilidad y el
  comportamiento de "app" en cuanto a apariencia y disponibilidad del shell.

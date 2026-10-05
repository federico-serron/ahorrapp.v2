# Feature Specification: Servidor MCP para agentes de IA

**Feature Branch**: `007-mcp-server`

**Created**: 2026-10-05

**Status**: Draft

**Input**: User description: "Crea un MCP para nuestra app para que pueda ser usada por agentes de IA. Crea un endpoint en el backend '/mcp'"

**Contexto**: AhorrApp hoy solo se usa desde su propia interfaz web/PWA. Esta feature la abre para que
un agente de IA (Claude Desktop, un asistente propio, etc.) pueda consultarla y operarla en nombre
de su dueño, sin pasar por la UI. Construye sobre el baseline (`specs/001-project-baseline/`) y la
constitución; no reemplaza nada existente.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Conectar un agente a mis finanzas (Priority: P1)

Un usuario de AhorrApp quiere que su asistente de IA acceda a sus finanzas. Genera una credencial
desde la app, la pega en la configuración de su agente, y a partir de ahí el agente puede trabajar
con sus datos — y solo con los suyos.

**Why this priority**: sin esto no hay feature. Y es el punto donde se define la seguridad: una
credencial mal diseñada expone datos financieros a terceros.

**Independent Test**: generar una credencial, configurarla en un cliente de IA, y confirmar que el
agente lista las herramientas disponibles y puede leer datos de esa cuenta.

**Acceptance Scenarios**:

1. **Given** un usuario autenticado en la app, **When** genera una credencial de acceso para
   agentes, **Then** recibe un valor secreto que puede copiar, mostrado **una sola vez**.
2. **Given** un agente configurado con una credencial válida, **When** se conecta, **Then** puede
   descubrir qué operaciones ofrece la app y ejecutarlas sobre los datos de ese usuario.
3. **Given** un agente con una credencial de otro usuario, **When** pide datos, **Then** solo ve
   los datos del dueño de esa credencial — nunca los de otro.
4. **Given** una credencial revocada por su dueño, **When** el agente intenta usarla, **Then** es
   rechazada de inmediato.
5. **Given** un agente sin credencial o con una inválida, **When** intenta conectarse, **Then** es
   rechazado sin revelar si la credencial existe ni ningún detalle interno.

---

### User Story 2 - Registrar gastos hablando con el agente (Priority: P1)

El usuario le dice a su agente "gasté 850 en el super" y la transacción queda registrada en su
cuenta, con descripción, monto, categoría y signo correctos — igual que si la hubiera escrito en
la app.

**Why this priority**: es el caso de uso central de AhorrApp (entrada en lenguaje natural) llevado
al lugar donde el usuario ya está conversando. Sin esto, el MCP es solo un visor.

**Independent Test**: desde un agente conectado, pedir que registre un gasto y verificar en la app
web que aparece correctamente.

**Acceptance Scenarios**:

1. **Given** un agente conectado, **When** el usuario le pide registrar un gasto en lenguaje
   natural, **Then** la transacción queda guardada en su cuenta y es visible en la app web.
2. **Given** una transacción registrada vía agente, **When** se la compara con una creada desde la
   UI, **Then** sigue exactamente las mismas reglas (monto positivo en el campo, signo según
   ingreso/gasto, categoría de las del usuario).
3. **Given** el servicio de interpretación de lenguaje natural no disponible, **When** el agente
   intenta registrar, **Then** recibe un error claro y **no** se guarda una transacción a medias.

---

### User Story 3 - Consultar y analizar sus finanzas (Priority: P2)

El usuario le pregunta al agente "¿cuánto gasté este mes?" o "mostrame un gráfico de gastos por
categoría", y el agente responde con datos reales de su cuenta.

**Why this priority**: es el valor de consulta, y lo que habilita los gráficos. Depende de que US1
funcione, pero no de US2.

**Independent Test**: desde un agente conectado, pedir el resumen del mes y contrastar los números
contra los que muestra el dashboard.

**Acceptance Scenarios**:

1. **Given** un agente conectado, **When** el usuario pide sus transacciones, **Then** las recibe
   paginadas, con el mismo resumen de totales que muestra el dashboard.
2. **Given** un agente conectado, **When** el usuario pide datos analíticos de un rango de fechas,
   **Then** recibe los agregados por fecha y por categoría necesarios para construir un gráfico.
3. **Given** esos datos analíticos, **When** el agente los usa, **Then** puede representar el
   gráfico con sus propias capacidades, sin que la app le devuelva una imagen.

---

### User Story 4 - Administrar categorías desde el agente (Priority: P3)

El usuario le pide al agente crear o eliminar categorías, sin abrir la app.

**Why this priority**: es conveniencia. Es lo último en valor y lo primero que se puede recortar si
hiciera falta.

**Independent Test**: crear y eliminar una categoría desde el agente y verificar cada cambio en la
app web.

**Acceptance Scenarios**:

1. **Given** un agente conectado, **When** el usuario pide crear una categoría, **Then** queda
   creada respetando los límites vigentes (nombre, color y tope por usuario).
2. **Given** una categoría de **otro** usuario, **When** el agente intenta eliminarla, **Then** la
   operación es rechazada como inexistente.
3. **Given** una petición de eliminar una categoría, **When** el agente la ejecuta sin confirmación
   previa, **Then** el sistema la rechaza y exige confirmación explícita (FR-017).

---

### User Story 5 - Corregir y borrar transacciones desde el agente (Priority: P3)

El usuario se da cuenta de que un gasto quedó mal cargado — monto equivocado, categoría errada, o
directamente duplicado — y le pide al agente que lo corrija o lo elimine, sin abrir la app.

**Why this priority**: es la contracara necesaria de US2. Si el agente puede registrar
transacciones en lenguaje natural, va a equivocarse alguna vez, y el usuario necesita poder
arreglarlo por el mismo canal. Es P3 porque la app web ya permite corregir: esto es conveniencia,
no una capacidad que falte en el producto.

**Independent Test**: desde un agente conectado, pedir que corrija el monto de una transacción y
que elimine otra, verificando cada cambio en la app web, y comprobar que el borrado sin confirmar
es rechazado sin borrar nada.

**Acceptance Scenarios**:

1. **Given** un agente conectado, **When** el usuario le pide corregir la descripción, el monto o
   la categoría de una transacción, **Then** queda modificada y el cambio es visible en la app web,
   respetando las mismas reglas que la edición desde la UI (monto positivo en el campo, signo según
   ingreso/gasto).
2. **Given** una transacción de **otro** usuario, **When** el agente intenta editarla o
   eliminarla, **Then** la operación es rechazada como inexistente, sin revelar que existe.
3. **Given** una petición de eliminar una transacción, **When** el agente la ejecuta sin
   confirmación previa, **Then** el sistema la rechaza y exige confirmación explícita (FR-017), y
   la transacción sigue existiendo.
4. **Given** una instrucción como "borrá el gasto del super" que coincide con **varias**
   transacciones, **When** el agente intenta resolverla, **Then** recibe las coincidencias y no se
   elimina ninguna, hasta que el usuario precise cuál (FR-020, FR-022).
5. **Given** una corrección (no un borrado), **When** el agente la ejecuta, **Then** **no** se le
   exige confirmación de dos pasos: modificar es reversible, eliminar no.

> Esta user story se agregó en la revisión del 2026-10-05, al detectarse que FR-014 y FR-022 no
> estaban cubiertos por ninguna story y por lo tanto no tenían escenarios de aceptación ni test
> independiente. Es relevante porque SC-007 se verifica sobre borrados, y US4 solo cubría
> categorías.

### Edge Cases

- **Aislamiento entre usuarios**: toda operación del agente queda atada al dueño de la credencial.
  Un agente nunca puede leer ni escribir datos de otra cuenta, ni siquiera indicando un
  identificador ajeno.
- **Credencial comprometida**: el usuario puede revocarla, y la revocación tiene efecto inmediato
  en todas las instancias del backend. ⚠️ Hoy la revocación de sesiones **no es confiable con
  múltiples workers** (ver `specs/005-shared-jwt-blocklist/`): esta feature no puede apoyarse en
  ese mecanismo roto.
- **Operaciones destructivas e instrucciones ambiguas**: eliminar una transacción o una categoría es
  irreversible, y un agente puede malinterpretar una instrucción ("borrá el gasto del super" cuando
  hay cinco). El sistema no puede confiar en el criterio del agente: debe exigir confirmación
  explícita y, ante varias coincidencias, devolver las opciones en vez de elegir una
  (FR-017 a FR-021).
- **Eliminar una categoría en uso**: hay transacciones que la referencian. El usuario tiene que
  saber qué les pasa *antes* de confirmar, no después.
- **Errores hacia el agente**: los mensajes de error no deben filtrar detalles internos del sistema
  (consistente con el Principio IV de la constitución).
- **Costo de terceros**: registrar una transacción consume cuota del servicio de interpretación de
  lenguaje natural. Un agente en bucle podría dispararla.
- Una credencial **no** debe poder usarse para operaciones de cuenta sensibles (cambiar contraseña,
  listar usuarios): su alcance es finanzas, no administración de la cuenta.

## Requirements *(mandatory)*

### Functional Requirements

**Acceso y seguridad**

- **FR-001**: El sistema DEBE permitir a un usuario autenticado generar credenciales de acceso para
  agentes, de larga duración, desde la propia app, hasta un **tope de credenciales activas por
  usuario** (las revocadas no cuentan).
- **FR-002**: El valor secreto de una credencial DEBE mostrarse **una única vez** al generarla, y no
  ser recuperable después.
- **FR-003**: El usuario DEBE poder ver sus credenciales activas (sin el secreto) y **revocar**
  cualquiera de ellas.
- **FR-004**: Una credencial revocada DEBE dejar de funcionar de inmediato, en **todas** las
  instancias del backend, sin depender de un estado en memoria de un proceso.
- **FR-005**: Toda operación hecha con una credencial DEBE acotarse exclusivamente a los datos del
  usuario dueño de esa credencial.
- **FR-006**: Las credenciales NO DEBEN habilitar operaciones de administración de cuenta (cambiar
  contraseña, actualizar perfil, listar usuarios).
- **FR-007**: Los rechazos por credencial ausente, inválida o revocada DEBEN usar un mensaje
  genérico, sin revelar cuál de los tres casos ocurrió ni detalles internos.

**Capacidades expuestas al agente**

- **FR-008**: El agente DEBE poder descubrir qué operaciones ofrece la app y qué datos necesita cada
  una, sin documentación externa.
- **FR-023**: El sistema DEBE ofrecer una forma de conectar la credencial que funcione también en
  clientes de IA que **no permiten configurar encabezados HTTP a mano**, sin que el usuario tenga
  que editar nada del servidor ni exponer el secreto en la URL. Es decir: la compatibilidad no
  puede depender de que el cliente tenga un campo donde pegar un encabezado.
- **FR-009**: El agente DEBE poder consultar las transacciones del usuario de forma paginada, junto
  con el resumen de totales (ingresos, gastos, balance).
- **FR-010**: El agente DEBE poder registrar una transacción a partir de texto en lenguaje natural,
  con el mismo comportamiento que la app web.
- **FR-011**: El agente DEBE poder obtener datos analíticos de un rango de fechas, agregados por
  fecha y por categoría, suficientes para construir un gráfico.
- **FR-012**: El sistema DEBE devolver esos datos como información estructurada; **no** debe generar
  ni devolver imágenes de gráficos.
- **FR-013**: El agente DEBE poder listar, crear y eliminar las categorías del usuario, respetando
  las reglas vigentes (nombre máx. 30 caracteres, colores válidos, tope por usuario, sin
  duplicados).
- **FR-014**: El agente DEBE poder editar y eliminar transacciones existentes del usuario.
- **FR-022**: El agente DEBE poder **buscar** transacciones del usuario por texto de la descripción
  y/o rango de fechas, para poder identificar sin ambigüedad a cuál se refiere una instrucción
  antes de editarla o eliminarla. Sin esta capacidad, FR-020 no es realizable: el agente no tendría
  forma de resolver "el gasto del super" en un registro concreto más que adivinando.

> FR-022 se agregó después de la numeración original (revisión del 2026-10-05) y se ubica acá por
> afinidad temática. No se renumeraron FR-015 a FR-021 para no invalidar las referencias ya escritas
> en `plan.md`, `contracts/` y `tasks.md`.

**Confirmación de operaciones irreversibles**

> Un servidor MCP no puede *obligar* a un agente a consultar al usuario: el agente es el cliente y
> decide cómo comportarse. Por eso estos requisitos trabajan en dos capas — una que el sistema
> **impone** (no se puede destruir nada en un solo paso) y otra que **induce** la conducta correcta
> del agente. Solo la primera es verificable desde nuestro lado.

- **FR-017**: El sistema NO DEBE ejecutar una operación irreversible (eliminar una transacción,
  eliminar una categoría) en una sola llamada. DEBE exigir una confirmación explícita e inequívoca,
  de modo que el agente quede estructuralmente forzado a volver al usuario antes de destruir algo.
- **FR-018**: Antes de confirmarse, una operación irreversible DEBE poder consultarse en modo
  "previsualización": el sistema describe exactamente qué se va a afectar (qué transacción, qué
  categoría, cuántos registros), para que el usuario confirme sobre hechos y no sobre una
  interpretación del agente.
- **FR-019**: La descripción de cada operación que el agente descubre DEBE indicar explícitamente
  si es irreversible y DEBE instruir al agente a confirmar con el usuario antes de ejecutarla,
  usando los mecanismos estándar que el protocolo ofrezca para señalar operaciones destructivas.
- **FR-020**: Ante una instrucción ambigua —por ejemplo, un criterio que afecta a varios registros,
  o una categoría/transacción que no identifica a una sola— el sistema NO DEBE adivinar. DEBE
  devolver las opciones que coinciden y pedir que se precise cuál, en vez de elegir una por su
  cuenta.
- **FR-021**: Eliminar una categoría DEBE informar previamente qué pasa con las transacciones que
  la usan, para que el usuario confirme con esa consecuencia a la vista.

**Consistencia con el sistema actual**

- **FR-015**: Las operaciones del agente DEBEN reutilizar las mismas reglas de negocio que usa la
  app web, de modo que un cambio de regla aplique a ambos caminos sin duplicar lógica.
- **FR-016**: Esta feature NO DEBE alterar el comportamiento de la app web ni de sus endpoints
  existentes.

### Key Entities

- **Credencial de acceso para agentes** (nueva): representa un permiso de larga duración otorgado
  por un usuario a un agente. Atributos conceptuales: a qué usuario pertenece, un nombre que el
  usuario le pone para reconocerla, cuándo se creó, cuándo se usó por última vez, y si está
  revocada. **El secreto no se guarda en claro** — solo algo que permita verificarlo.
- **User**, **Transaction**, **Category**: sin cambios de esquema.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un usuario puede conectar un agente a su cuenta en menos de 5 minutos, partiendo de la
  app y sin leer documentación técnica.
- **SC-002**: El 100% de los intentos de acceder a datos de otro usuario son rechazados.
- **SC-003**: El 100% de las credenciales revocadas dejan de funcionar de inmediato, incluso con
  varias instancias del backend corriendo en paralelo.
- **SC-004**: Una transacción registrada por un agente es indistinguible de una creada desde la app
  web en todos sus campos.
- **SC-005**: Los datos analíticos que recibe el agente coinciden con los que muestra el dashboard
  para el mismo rango de fechas.
- **SC-006**: Cero regresiones en la funcionalidad existente de la app web.
- **SC-007**: El 100% de los intentos de ejecutar una operación irreversible sin confirmación
  explícita son rechazados, sin que se borre ni modifique ningún dato.
- **SC-008**: Ante una instrucción que coincide con más de un registro, el sistema devuelve las
  coincidencias y no ejecuta nada, en el 100% de los casos.

## Assumptions

- **Autenticación por tokens de acceso personales** (decisión del usuario): el agente envía una
  credencial de larga duración que el usuario genera y revoca desde la app. Se descartó reusar el
  JWT de 1 día (obligaría a renovar a diario) y OAuth 2.1 (mucho más trabajo del necesario hoy).
- **Clientes soportados: los que corren en la máquina del usuario** (decisión del usuario,
  2026-10-05). La credencial viaja en el encabezado `Authorization: Bearer`, que es exactamente lo
  que manda el protocolo. Lo que varía entre clientes no es el protocolo sino **cómo obtienen el
  token**, y eso parte el universo en dos:
  - **Clientes locales** (CLI, IDE y escritorio): o permiten configurar el encabezado a mano, o se
    los cubre con el modo de conexión de FR-023. **Quedan todos dentro de alcance.**
  - **Clientes alojados** (conectores de ChatGPT, Claude.ai web y móvil): no pueden lanzar un
    proceso local ni aceptar un token pegado. Solo se conectan vía **OAuth 2.1 con descubrimiento
    RFC 9728**, que el protocolo exige para la vía conformante. Eso implica un authorization
    server, PKCE y registro de clientes: es una feature aparte y **queda fuera de alcance de 007**.
    Si más adelante se quiere, el camino corto es delegar el authorization server a un IdP externo
    e implementar solo el metadata de RFC 9728 y la validación del token.
- **La revocación no puede apoyarse en el blocklist en memoria actual**, que no funciona con los
  5 workers de gunicorn de producción. Esta feature necesita un mecanismo de revocación que
  funcione entre procesos — probablemente persistido. Esto se solapa con
  `specs/005-shared-jwt-blocklist/`, que está pausada.
- **"Generar gráficos" = devolver datos, no imágenes** (decisión del usuario): `analytics_service`
  ya produce `by_date`, `by_category` y `summary`; el agente arma la visualización.
- **Modificar categorías queda fuera de alcance** (decisión del usuario). Se había detectado que el
  backend no tiene esa capacidad (existen listar, crear y eliminar, pero no actualizar); como no se
  necesita, **no se construye**. El MCP expone únicamente lo que el backend ya sabe hacer con
  categorías.
- **El agente no es confiable por sí solo**: no hay forma de obligarlo a consultar al usuario, así
  que la seguridad ante instrucciones ambiguas se apoya en que el *sistema* rechace ejecutar
  operaciones irreversibles sin confirmación explícita (FR-017/FR-018). Las descripciones de las
  herramientas (FR-019) ayudan pero no garantizan nada por sí solas.
- El agente opera siempre en nombre de **un** usuario. No hay escenario multi-usuario ni de
  administrador en esta feature.
- La interpretación de lenguaje natural sigue delegada al servicio externo ya integrado; esta
  feature no cambia ese contrato.
- Queda **fuera de alcance**: registrar/dar de baja usuarios, cambiar contraseñas, y cualquier
  operación de administración de cuenta.

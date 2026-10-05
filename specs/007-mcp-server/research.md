# Phase 0 — Research: Servidor MCP para agentes de IA

**Fecha**: 2026-10-05 | **Spec**: [spec.md](./spec.md)

Toda la investigación se hizo contra la documentación vigente del protocolo (revisiones
`2025-11-25` y `2026-07-28`) y del SDK oficial de Python, más lectura directa del código del
backend. Las decisiones que siguen resuelven todos los NEEDS CLARIFICATION del plan.

---

## Decisión 1 — Implementar el transporte en Flask, sin el SDK oficial de MCP

**Decisión**: escribir el endpoint `/mcp` como un blueprint Flask normal que habla JSON-RPC 2.0.
**No** se agrega la dependencia `mcp` (SDK oficial de Python).

**Rationale**:

1. **El SDK oficial es ASGI, nuestro backend es WSGI.** `MCPServer.streamable_http_app()` devuelve
   una app **Starlette**. Montarla dentro de Flask exigiría un adaptador ASGI↔WSGI y, sobre todo,
   resolver el ciclo de vida: la documentación del SDK es explícita en que Starlette **nunca
   ejecuta el lifespan de una sub-app montada**, y que sin entrar a `mcp.session_manager.run()`
   *cada* request falla con `RuntimeError: Task group is not initialized`. WSGI no tiene lifespan,
   así que habría que emular ese arranque a mano en un hilo de fondo.
2. **Producción corre `gunicorn --worker-class gevent`** (ver `Dockerfile`). El SDK está construido
   sobre `anyio`/`asyncio`; mezclar un event loop de asyncio dentro de greenlets de gevent
   monkey-patcheado es una fuente conocida de bloqueos difíciles de diagnosticar. Evitarlo es un
   beneficio concreto, no teórico.
3. **La superficie real del protocolo que necesitamos es chica.** Ver Decisión 2: con la revisión
   `2026-07-28` el transporte es POST stateless con respuesta JSON. Los métodos a implementar son
   `server/discover` / `initialize`, `tools/list` y `tools/call`, más errores. No hay sesiones, ni
   SSE, ni resumabilidad, ni notificaciones server→cliente en nuestro caso de uso.
4. **Encaja exactamente con el Principio I** (blueprints orquestan, services deciden) y con el
   Principio IX (estabilidad estructural): un `routes/mcp_bp.py` delgado + un
   `services/mcp_service.py`. Cero dependencias nuevas, cero cambios en el app factory más allá de
   registrar un blueprint.

**Alternativas consideradas**:

| Alternativa | Por qué se descartó |
|---|---|
| SDK `mcp` montado vía adaptador ASGI (`a2wsgi`) | 3 dependencias nuevas (`mcp`, `starlette`, `a2wsgi`, más `anyio`), el problema del lifespan sin resolver, y asyncio dentro de gevent. Todo para evitar escribir ~200 líneas de JSON-RPC. |
| MCP como proceso/contenedor ASGI aparte (uvicorn) | Rompe el modelo de despliegue actual (un solo contenedor sirve SPA + API). Obliga a compartir DB y secretos entre dos servicios y a duplicar la config. Cambio estructural que el Principio IX exige aprobar explícitamente, por un beneficio nulo a esta escala. |

**Costo que se asume y cómo se mitiga**: escribimos el cumplimiento del protocolo a mano, así que
los errores de conformidad son nuestros. Se mitiga con tests de contrato por cada método y código
de error (ver `contracts/`), más una validación manual contra un cliente MCP real en
`quickstart.md`.

---

## Decisión 2 — Una sola implementación stateless atiende las dos eras del protocolo

**Decisión**: `POST /mcp` stateless, que **siempre** responde `Content-Type: application/json`.
`GET` y `DELETE` sobre `/mcp` responden `405 Method Not Allowed`. Nunca se emite un
`Mcp-Session-Id`.

**Rationale** — las dos eras del protocolo convergen en este diseño:

- **Era moderna (`2026-07-28`)**: la revisión **eliminó** las sesiones, el stream SSE por GET y la
  resumabilidad. La spec es explícita: ante un `Mcp-Session-Id` el servidor debe *ignorarlo y no
  acuñar ni devolver IDs*; ante GET o DELETE al endpoint debe responder `405`. Los requests son
  stateless y por eso **no requieren sticky sessions** — que es justamente lo que nos deja servir
  esto desde 5 workers de gunicorn sin coordinación alguna.
- **Era legacy (`2025-03-26` … `2025-11-25`)**: el `Mcp-Session-Id` es **opcional para el
  servidor** ("the server *may* respond with an `MCP-Session-Id` header"). Si no lo emitimos, el
  cliente no lo manda. Y ante un request JSON-RPC el servidor puede elegir entre
  `text/event-stream` y `application/json`: el cliente **debe** soportar ambos. Elegimos siempre
  JSON.

La intersección de ambas es, literalmente, "POST con JSON-RPC, respuesta JSON, sin sesión". Una
sola ruta cubre las dos eras; lo único que se bifurca es el *handshake*:

| Era | Handshake | Versión del protocolo |
|---|---|---|
| Moderna | `server/discover` → `supportedVersions`, `capabilities`, `instructions` | header `MCP-Protocol-Version` + `params._meta` (deben coincidir) |
| Legacy | `initialize` → `protocolVersion`, `capabilities`, `serverInfo`; luego `notifications/initialized` | del body de `initialize` |

Se soportan **ambos** handshakes porque los clientes desplegados hoy (Claude Desktop y similares)
todavía hablan la era legacy, y el usuario quiere conectar un agente real, no un cliente
hipotético. La spec del protocolo contempla explícitamente que un servidor implemente las dos.

**Detalles de conformidad que la implementación debe respetar** (cada uno es un test de contrato):

- Si el header `MCP-Protocol-Version` no coincide con
  `params._meta.io.modelcontextprotocol/protocolVersion` → `400` con error JSON-RPC
  `HeaderMismatch`.
- Si la versión pedida no está soportada → `400` con `UnsupportedProtocolVersionError`, código
  **`-32022`**, y `data.supported` listando las nuestras.
- Si el método JSON-RPC no existe → **`404`** con código **`-32601`** (`Method not found`). El body
  JSON-RPC es lo que distingue este caso de un `404` de un servidor que no hostea MCP.
- Un request sin el header `MCP-Protocol-Version` se trata como era legacy (la spec permite asumir
  `2025-03-26`), nunca como error.
- Una *notificación* JSON-RPC (sin `id`), como `notifications/initialized`, se responde con
  **`202 Accepted`** y cuerpo vacío.

**Alternativa considerada**: soportar solo `2026-07-28`. Más limpio y menos código, pero ningún
cliente instalado hoy podría conectarse — haría fallar SC-001 ("conectar un agente en menos de 5
minutos"). Descartada.

---

## Decisión 3 — Credenciales: tokens opacos aleatorios con hash SHA-256, no JWT y no bcrypt

**Decisión**: el secreto es un token opaco de 256 bits de entropía (`secrets.token_urlsafe(32)`),
con un prefijo legible (`ahorr_pat_`). En la DB se guarda **únicamente** `sha256(token)`, indexado
y único. La verificación es un `SELECT` por ese hash.

**Rationale**:

- **Por qué no JWT**: un JWT es autocontenido y por diseño válido hasta expirar. FR-004 y SC-003
  exigen revocación **inmediata** en todas las instancias; con JWT eso obliga a una blocklist
  compartida — exactamente el problema sin resolver de `specs/005-shared-jwt-blocklist/`. Un token
  opaco se valida consultando la DB en cada request, así que **la revocación es cross-worker por
  construcción**: poner `revoked_at` en una fila la apaga para los 5 workers en el acto, sin estado
  en memoria. Ver Decisión 5.
- **Por qué SHA-256 y no bcrypt**: bcrypt es un hash deliberadamente lento, diseñado para secretos
  de baja entropía elegidos por humanos. Este token lo genera el servidor con 256 bits de entropía:
  no es atacable por fuerza bruta ni por diccionario, así que el factor de trabajo no aporta
  seguridad. Y sí tiene dos costos reales: (a) ~100 ms de CPU en **cada** request del agente, (b)
  bcrypt no permite buscar por hash, así que habría que traer todos los tokens y comparar uno por
  uno. SHA-256 permite lookup O(1) por índice único. Es el mismo criterio que usan los personal
  access tokens de GitHub.
  **Esto no relaja el Principio III**: las *contraseñas de usuario* siguen con bcrypt, intactas. Un
  token de alta entropía generado por el servidor no es una contraseña.
- **El secreto nunca se guarda en claro** (lo exige la spec en Key Entities) y se muestra una sola
  vez (FR-002), porque del hash no se puede volver al token.

**Alternativas consideradas**:

| Alternativa | Por qué se descartó |
|---|---|
| Reusar el JWT de cookie de 1 día | El usuario ya lo descartó en la spec: obliga a reconfigurar el agente a diario. Además un agente no es un navegador: no tiene dónde recibir una cookie `httpOnly`. |
| OAuth 2.1 (lo que la spec del protocolo recomienda) | Es la respuesta correcta para un servidor MCP público multi-cliente. Acá hay un usuario conectando su propio agente: exigiría authorization server, metadata RFC 9728, PKCE y refresh. Desproporcionado; decisión ya tomada por el usuario en la spec. |
| bcrypt sobre el token | Ver arriba: sin beneficio criptográfico, con costo por request y sin posibilidad de lookup indexado. |

---

## Decisión 4 — Confirmación de operaciones irreversibles: token firmado, sin estado en servidor

**Decisión**: toda operación irreversible es de **dos fases**, y la primera fase no toca datos.

1. El agente llama `delete_transaction` / `delete_category` **sin** `confirm_token`.
2. El servidor responde una **previsualización**: qué exactamente se va a afectar, más un
   `confirm_token` firmado con `itsdangerous` (ya es dependencia del proyecto, vía Flask), con TTL
   de 5 minutos. El token lleva firmado: `user_id`, la operación y el `id` del objetivo.
3. El agente debe volver a llamar con ese `confirm_token` para que la operación se ejecute.

El token es **firmado, no almacenado**: no hay estado de servidor, así que funciona idéntico en los
5 workers (misma propiedad que necesitábamos en la Decisión 3, por otra vía).

**Rationale**: esto es la capa que el sistema **impone** (FR-017/FR-018). Un token que el servidor
no emitió, que expiró, que pertenece a otro usuario o que apunta a otro objetivo no sirve: la
operación es rechazada sin tocar nada. Es imposible destruir algo en una sola llamada.

Honestidad sobre el alcance, ya anotada en la spec: esto fuerza **dos viajes**, no fuerza al agente
a *hablar con el usuario* entre uno y otro. Ningún servidor MCP puede forzar eso. Lo que sí
conseguimos es que el agente no pueda borrar nada "de paso", y que exista un punto donde la
consecuencia está descrita en texto antes de confirmarse.

Las otras dos capas, que **inducen** la conducta correcta:

- `annotations.destructiveHint: true` y `readOnlyHint: false` en los tools destructivos, y
  `readOnlyHint: true` en los de lectura (FR-019). La spec del protocolo advierte que las
  annotations son *hints* y que un cliente no debería decidir en base a ellas viniendo de un
  servidor no confiable — razón de más para que la garantía real esté en el token firmado.
- El texto de `description` de cada tool destructivo instruye explícitamente a confirmar con el
  usuario antes de llamar, y la previsualización se devuelve redactada para que el agente pueda
  leérsela al usuario tal cual.

**Alternativa considerada — `elicitation/create` vía `InputRequiredResult`**: la revisión
`2026-07-28` permite que `tools/call` devuelva `resultType: "input_required"` con `inputRequests` y
un `requestState`, lo que empuja al cliente a pedirle datos al usuario. Es conceptualmente lo más
cercano a "obligar a preguntar" que existe en el protocolo. **No se adopta como mecanismo
principal** porque: (a) solo existe en la era moderna, así que los clientes legacy quedarían sin
protección, justo los que se van a usar hoy; (b) depende de que el cliente declare la capability
`elicitation` y la implemente bien; (c) el `requestState` es, en la práctica, el mismo token
firmado que ya tenemos. Queda como mejora opcional **encima** del token, nunca en lugar de él.

---

## Decisión 5 — La revocación no depende de `specs/005-shared-jwt-blocklist/`

**Decisión**: esta feature **no toca** el `BLACKLIST` en memoria ni espera que 005 se implemente.

**Rationale**: era el riesgo técnico principal que la spec señalaba (FR-004, SC-003, Edge Cases y
Assumptions). Se disuelve como consecuencia de la Decisión 3: al no ser JWT, no hay nada que
"revocar" en una blocklist. El estado de la credencial **es** una fila en la DB, que los 5 workers
leen en cada request. `revoked_at IS NOT NULL` → rechazo inmediato y universal.

Esto deja un detalle que vale la pena registrar: `app/blacklist.py` sigue siendo un `set()` en
memoria y el `logout` de la app web sigue siendo poco confiable con múltiples workers. **Ese bug
sigue abierto** y sigue siendo el objeto de `specs/005-shared-jwt-blocklist/`; simplemente ya no
bloquea a esta feature.

**Costo asumido**: un `SELECT` indexado por request del agente. A esta escala es irrelevante, y es
el precio exacto de tener revocación inmediata.

---

## Decisión 6 — Reutilizar los services existentes sin modificarlos

**Decisión**: `mcp_service.py` es un **registry + dispatcher** de tools que delega en los services
actuales. No se duplica ni una regla de negocio.

| Tool MCP | Service que ya existe |
|---|---|
| `list_transactions` | `get_transactions_service(user_id, page, per_page)` |
| `create_transaction` | `create_transaction_service(user_id, raw_input)` |
| `update_transaction` | `update_transaction_service(user_id, transaction_id, data)` |
| `delete_transaction` | `delete_transaction_service(user_id, transaction_id)` |
| `get_analytics` | `get_analytics_service(user_id, start_date, end_date)` |
| `list_categories` | `get_categories_service(user_id)` |
| `create_category` | `create_category_service(user_id, name, color)` |
| `delete_category` | `delete_category_service(user_id, category_id)` |

**Rationale**: FR-015 (una regla, un lugar) y FR-016 (cero cambios en el comportamiento web). Como
efecto colateral, el aislamiento por usuario (FR-005, Principio II) ya viene dado: **todos** esos
services reciben `user_id` como primer parámetro y filtran por él. El `user_id` sale siempre de la
credencial, nunca de los argumentos del tool — un argumento `user_id` enviado por el agente se
ignora, no existe en ningún `inputSchema`.

**Hallazgo relevante para FR-021**: `Transaction.category` es un **String**, no una foreign key a
`Category`. Borrar una categoría **no borra ni modifica ninguna transacción**: las transacciones
conservan el nombre de la categoría como texto. La previsualización de `delete_category` debe decir
exactamente eso ("N transacciones usan esta categoría y la conservarán como texto; no se borra
ninguna"), porque la intuición natural — y la redacción de FR-021 — invita a suponer un borrado en
cascada que no ocurre.

---

## Decisión 7 — Costo de terceros: límite en `create_transaction`

**Decisión**: `create_transaction` admite **como máximo 10 creaciones por credencial en una ventana
móvil de 60 segundos**. El conteo se hace contra la DB (no en memoria, por los 5 workers):
`SELECT COUNT(*)` sobre `Transaction` filtrando por `user_id` y `date >= now() - 60s`. A partir de
la 11.ª se devuelve `isError` **sin llamar a n8n**.

**Por qué 10/60s**: un humano dictándole gastos a un agente no supera 2 o 3 por minuto, así que el
límite no se siente en uso normal; un agente en bucle, en cambio, lo toca en el primer segundo. El
umbral tiene que ser un número concreto porque sin él el criterio de aceptación no es testeable.

**Por qué contra `Transaction` y no una tabla de contadores**: las transacciones ya tienen `date`
indexado y `user_id` indexado, así que el conteo es barato y no agrega esquema. El efecto
secundario aceptado es que cuenta **todas** las transacciones del usuario en esa ventana, incluidas
las creadas desde la app web — lo cual es correcto para el objetivo real, que es proteger la cuota
del servicio externo, no castigar al agente en particular.

**Rationale**: es el Edge Case de "Costo de terceros" de la spec. Cada llamada a
`create_transaction` consume cuota del webhook de n8n y, detrás, de la API de Gemini. Un agente en
bucle puede dispararla sin intención. Es el único tool con costo marginal real; los demás solo
consultan Postgres.

**Nota de alcance**: el webhook de n8n sigue **sin autenticar** (pendiente registrado en
`project-state.md`). Esta feature no lo cambia y no lo empeora: el `user_id` sale del
JWT/credencial del lado del backend, nunca del payload. Pero conviene tenerlo presente al razonar
sobre costo.

---

## Decisión 8 — El service worker de la PWA debe excluir `/mcp`

**Decisión**: agregar `/^\/mcp/` al `navigateFallbackDenylist` de `frontend/vite.config.js`.

**Rationale**: en producción un único contenedor sirve el SPA y la API desde el **mismo origen**
(ver `Dockerfile`). El `navigateFallbackDenylist` existente ya lista los 4 blueprints reales
(`/user`, `/transaction`, `/category`, `/public`) precisamente por eso: sin la exclusión, el
service worker responde el shell del SPA a una navegación directa a una ruta de backend en vez de
dejarla llegar a Flask. `/mcp` es un quinto prefijo de backend y necesita el mismo tratamiento.

Esto es un **bug que no se reproduce en desarrollo**, donde frontend (`:5173`) y backend (`:5100`)
están en puertos distintos. El comentario ya presente en `vite.config.js` advierte exactamente de
esta trampa. Vale aclarar que el riesgo es acotado (afecta *navegaciones*, no los POST del agente),
pero la consistencia acá es gratis y la omisión es del tipo que se descubre tarde y en producción.

**Verificación relacionada**: el catch-all `@app.route('/<path:path>')` de `app/run.py` no se come
`/mcp`, por la misma razón por la que no se come `/user` — Werkzeug prefiere reglas estáticas sobre
reglas con convertidor. Igual queda como test.

---

## Decisión 9 — Puente stdio para los clientes que no permiten encabezados

**Decisión**: además del endpoint HTTP, se entrega un **puente stdio**: un comando local
(`backend/tools/ahorrapp_mcp_bridge.py`) que el cliente de IA lanza como subproceso, lee el token
de la variable de entorno `AHORRAPP_TOKEN` y reenvía cada mensaje JSON-RPC de stdin a
`POST /mcp` por HTTPS, devolviendo la respuesta por stdout. **No** se adopta OAuth 2.1 en esta
feature.

**El hallazgo que lo motiva** (R1 del análisis): en el cable, todos los clientes MCP son iguales
— `Authorization: Bearer <token>` en cada request, prohibido en query string. Lo que varía es
**cómo el cliente consigue el token**:

| Tipo de cliente | Cómo obtiene el token | Cubierto por |
|---|---|---|
| CLI / IDE | encabezados configurables a mano | el endpoint HTTP directo |
| Escritorio local | a veces encabezados; **siempre** `stdio` con `command`/`args`/`env` | el puente |
| Alojado (ChatGPT, Claude web/móvil) | **solo** OAuth 2.1 + RFC 9728 | nada: fuera de alcance |

**Por qué stdio es el mínimo común denominador**: un servidor stdio es simplemente un subproceso al
que el cliente le escribe JSON-RPC por stdin y le lee stdout. Es el transporte original del
protocolo y la forma en que todo host de escritorio corre un servidor local; la configuración
(`command`, `args`, `env`) es idéntica en Claude Desktop, Cursor, VS Code, Zed, Continue y los CLI.
Si un cliente soporta MCP, soporta stdio.

**Beneficio secundario que no es menor**: el token sale del archivo de configuración y pasa a una
variable de entorno. Un `.mcp.json` con un `Authorization: Bearer ahorr_pat_...` adentro es un
secreto en un archivo de texto que se commitea por accidente; `env` al menos lo separa.

**Por qué el puente es barato**: ~80 líneas de biblioteca estándar (`sys`, `json`, `urllib.request`).
No necesita el SDK de MCP ni conocer el protocolo: es un reenviador ciego de JSON-RPC. Como nuestro
transporte es stateless y responde siempre JSON (Decisión 2), el puente no tiene que manejar
sesiones, SSE ni reconexión — lee una línea, hace un POST, escribe una línea.

**Alternativas consideradas**:

| Alternativa | Por qué se descartó |
|---|---|
| **Token en el path de la URL** (`/mcp/<token>`) | Funcionaría con cualquier cliente que acepte una URL, sin puente. Pero el secreto termina en los logs de acceso del servidor, en los de cualquier proxy intermedio y en el historial del cliente. La spec del protocolo prohíbe el token en el query string por exactamente este motivo, y el path no es materialmente más seguro. Para datos financieros no vale la conveniencia. |
| **OAuth 2.1 + RFC 9728 ahora** | Es la vía que el protocolo prescribe (*"MCP servers MUST implement OAuth 2.0 Protected Resource Metadata (RFC9728)"*) y lo único que habilita los clientes alojados. Exige authorization server, metadata RFC 8414, PKCE, pantalla de consentimiento y además Client ID Metadata Documents **y** Dynamic Client Registration (deprecado, pero es lo que usan los clientes desplegados hoy). Es código crítico de seguridad y duplica el tamaño de la feature: va a una spec propia. |
| **Solo el endpoint HTTP** | Deja afuera a los clientes de escritorio sin campo de encabezados, que es justamente el caso de uso más probable para una app de finanzas personales. |

**Límite explícito que esto deja**: **los clientes alojados no se pueden conectar** (conectores de
ChatGPT, Claude.ai web y móvil). No es una omisión: es una consecuencia de no implementar OAuth, y
está registrado en Assumptions. El camino corto, si se quiere después, es delegar el authorization
server a un IdP externo e implementar de nuestro lado solo el metadata de RFC 9728 y la validación
del token.

---

## Resumen: NEEDS CLARIFICATION resueltos

| Incógnita | Resuelta en |
|---|---|
| ¿SDK oficial de MCP o implementación propia? | Decisión 1 |
| ¿Cómo se sirve streamable HTTP desde WSGI/gevent? | Decisiones 1 y 2 |
| ¿Qué revisión(es) del protocolo se soportan? | Decisión 2 |
| ¿Cómo se representa y verifica la credencial? | Decisión 3 |
| ¿Cómo se fuerza la confirmación sin estado compartido? | Decisión 4 |
| ¿Hace falta resolver 005 primero? | Decisión 5 (no) |
| ¿Qué le pasa a las transacciones al borrar una categoría? | Decisión 6 (nada) |
| ¿Cómo se contiene el costo de n8n? | Decisión 7 |
| ¿Cómo se cubren los clientes que no permiten encabezados? | Decisión 9 |
| ¿Se implementa OAuth 2.1? | Decisión 9 (no: fuera de alcance de 007) |

**Dependencias nuevas**: ninguna. `itsdangerous` (tokens firmados) y `secrets`/`hashlib`
(generación y hash) ya están disponibles.

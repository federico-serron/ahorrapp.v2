# Contract — Transporte: `POST /mcp` (Streamable HTTP, stateless)

**Spec**: [../spec.md](../spec.md) | **Decisiones**: [../research.md](../research.md) (1, 2, 3)

Un único endpoint. JSON-RPC 2.0 sobre HTTP POST. Respuesta **siempre** `application/json`: nunca
SSE, nunca sesiones.

---

## Métodos HTTP

| Método | Respuesta |
|---|---|
| `POST /mcp` | El contrato de abajo. |
| `GET /mcp` | `405 Method Not Allowed`. No ofrecemos stream server→cliente. |
| `DELETE /mcp` | `405 Method Not Allowed`. No hay sesión que terminar. |

Un header `Mcp-Session-Id` entrante se **ignora**; no se acuña ni se devuelve ninguno. Un
`Last-Event-ID` entrante se ignora: los streams no son resumibles porque no hay streams.

---

## Autenticación

```http
POST /mcp HTTP/1.1
Authorization: Bearer ahorr_pat_<secreto>
Content-Type: application/json
MCP-Protocol-Version: 2026-07-28
```

- El token **debe** ir en el header `Authorization`. Nunca en query string (lo prohíbe la spec del
  protocolo, y además terminaría en los logs de acceso).
- Verificación: `sha256(token)` → `SELECT` por `token_hash`. Válido solo si existe,
  `revoked_at IS NULL` y el `User` tiene `is_active = True`.
- En éxito se actualiza `last_used_at`.
- El `user_id` de la fila es el **único** origen del usuario para toda la request. Ningún argumento
  del agente puede alterarlo.

### Rechazos

| Caso | HTTP | Cuerpo |
|---|---|---|
| Sin header `Authorization`, formato inválido, token inexistente, revocado, o usuario inactivo | `401` | `{"error": "Credencial inválida."}` |

**Un solo mensaje para los cinco casos** (FR-007): no se revela si el token existía, si estaba
revocado o si la cuenta está inactiva. Consistente con el Principio IV. El `WWW-Authenticate:
Bearer` sí se incluye, porque es el mecanismo estándar y no filtra nada.

La autenticación se verifica **antes** de parsear el JSON-RPC, así que un token inválido nunca llega
a tocar la lógica de tools.

---

## Handshake — dos eras soportadas

### Era moderna: `server/discover`

```json
{ "jsonrpc": "2.0", "id": "d1", "method": "server/discover",
  "params": { "_meta": { "io.modelcontextprotocol/protocolVersion": "2026-07-28" } } }
```

Respuesta `200`:

```json
{ "jsonrpc": "2.0", "id": "d1",
  "result": {
    "resultType": "complete",
    "supportedVersions": ["2026-07-28", "2025-11-25", "2025-06-18", "2025-03-26"],
    "capabilities": { "tools": {} },
    "_meta": { "io.modelcontextprotocol/serverInfo": { "name": "ahorrapp", "version": "1.0.0" } },
    "instructions": "Finanzas personales de un único usuario. Las operaciones de borrado son IRREVERSIBLES y de dos pasos: primero se llama sin confirm_token para obtener una previsualización, se le muestra al usuario, y solo con su confirmación explícita se repite la llamada con el confirm_token. Ante una instrucción que coincida con más de un registro, no elijas: mostrale al usuario las opciones y pedile que precise."
  } }
```

El campo `instructions` es parte de FR-019: es el lugar que el protocolo da para instruir al agente,
y lo usamos para la regla de confirmación y la de ambigüedad.

### Era legacy: `initialize`

```json
{ "jsonrpc": "2.0", "id": 1, "method": "initialize",
  "params": { "protocolVersion": "2025-06-18", "capabilities": {},
              "clientInfo": { "name": "Claude Desktop", "version": "1.0" } } }
```

Respuesta `200`:

```json
{ "jsonrpc": "2.0", "id": 1,
  "result": { "protocolVersion": "2025-06-18", "capabilities": { "tools": {} },
              "serverInfo": { "name": "ahorrapp", "version": "1.0.0" },
              "instructions": "<el mismo texto que arriba>" } }
```

- `protocolVersion` devuelto = la que pidió el cliente si la soportamos; si no, la más alta nuestra.
- **No** se devuelve `Mcp-Session-Id`.
- `notifications/initialized` (notificación, sin `id`) → `202 Accepted`, cuerpo vacío.

---

## Validación del request

Orden de verificación, porque determina qué error ve el cliente:

1. **Auth** → `401` (arriba).
2. **JSON malformado** → `400`, JSON-RPC `-32700` (`Parse error`), `id: null`.
3. **No es un objeto JSON-RPC 2.0 válido** → `400`, `-32600` (`Invalid Request`).
4. **`MCP-Protocol-Version` presente y `params._meta` presente, y no coinciden** → `400` con error
   `HeaderMismatch`.
5. **Versión pedida no soportada** → `400`, código **`-32022`**:

   ```json
   { "jsonrpc": "2.0", "id": 1,
     "error": { "code": -32022, "message": "Unsupported protocol version",
                "data": { "supported": ["2026-07-28", "2025-11-25", "2025-06-18", "2025-03-26"],
                          "requested": "1900-01-01" } } }
   ```

6. **Header ausente** → se asume era legacy (`2025-03-26`). No es error.
7. **Método desconocido** → **`404`** (no 400), JSON-RPC `-32601` (`Method not found`). El cuerpo
   JSON-RPC es lo que distingue este 404 del de un servidor que no hostea MCP.
8. **Notificación** (sin `id`) → `202 Accepted`, cuerpo vacío.

---

## Métodos implementados

| Método | Descripción |
|---|---|
| `server/discover` | Handshake moderno. |
| `initialize` | Handshake legacy. |
| `notifications/initialized` | Notificación legacy → `202`. |
| `tools/list` | Catálogo de tools. Ver [mcp-tools.md](./mcp-tools.md). |
| `tools/call` | Ejecución de un tool. |
| `ping` | → `{"result": {}}`. Lo usan varios clientes para verificar salud. |

Cualquier otro (`resources/*`, `prompts/*`, `completion/*`) → `404` + `-32601`. No declaramos esas
capabilities, así que un cliente conforme no debería pedirlas.

---

## Errores de un tool: `isError`, no JSON-RPC

Un tool que falla por una razón de negocio **no** devuelve un error JSON-RPC. Devuelve `200` con
`isError: true`, que es lo que el protocolo define para que el modelo pueda leer y corregir el
problema:

```json
{ "jsonrpc": "2.0", "id": 2,
  "result": { "resultType": "complete", "isError": true,
              "content": [ { "type": "text", "text": "Transacción no encontrada." } ] } }
```

Mapeo desde las excepciones del proyecto (`app/exceptions.py`):

| Excepción | Texto devuelto al agente |
|---|---|
| `BadRequestError`, `ConflictError`, `NotFoundError` | El mensaje de la excepción. Son mensajes de negocio ya redactados para el usuario, sin detalle interno. |
| `RuntimeError` desde `n8n_service` | "El servicio de interpretación de texto no está disponible. Intentá de nuevo en un momento." — mensaje fijo, nunca `str(e)`. |
| Cualquier otra | "No se pudo completar la operación." + `current_app.logger.exception(...)`. |

El Principio IV aplica igual acá que en los endpoints web: **nunca** se interpola `str(e)` de una
excepción no controlada. Un error JSON-RPC (`error`, no `isError`) se reserva para fallos de
protocolo, donde el agente no puede hacer nada útil con el detalle.

---

## Lo que este contrato garantiza

| Requisito | Cómo |
|---|---|
| FR-005 / SC-002 | `user_id` sale solo de la credencial; ningún `inputSchema` acepta un `user_id`. |
| FR-004 / SC-003 | `SELECT` por `token_hash` en cada request ⇒ `revoked_at` corta en los 5 workers, sin estado en memoria. |
| FR-006 | No existe ningún tool de administración de cuenta. La credencial no abre `/user/*`. |
| FR-007 | Un único `401` con un único mensaje para los cinco casos de rechazo. |
| FR-008 | `server/discover` / `initialize` + `tools/list` describen todo; no hace falta doc externa. |

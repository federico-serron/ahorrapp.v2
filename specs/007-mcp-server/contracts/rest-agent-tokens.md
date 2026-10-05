# Contract — REST: gestión de credenciales de agente

**Spec**: [../spec.md](../spec.md) | Cubre FR-001, FR-002, FR-003

Estos endpoints los consume **la app web** (no el agente), con la cookie JWT de siempre. Son el
lugar donde el usuario genera, lista y revoca credenciales.

**Blueprint**: `app/routes/agent_token_bp.py`, registrado con `url_prefix='/agent-token'`.

Van en un blueprint propio y **no** en `user_bp` porque `user_bp` es administración de cuenta
(perfil, contraseña, login) y las credenciales son una preocupación distinta. Mantenerlos separados
también deja claro, al leer el código, que la credencial no habilita nada de `/user/*` (FR-006).

Autenticación: `@jwt_required()` con la configuración existente — cookies, `credentials:
"include"`, y en producción el header CSRF. Principio III intacto: **estos tres endpoints no
aceptan Bearer**. El Bearer vive solo en `/mcp`.

---

## `POST /agent-token/`

Crea una credencial. **Es la única vez que el secreto existe en claro.**

**Request**:

```json
{ "name": "Claude Desktop — laptop" }
```

**Respuesta `201`**:

```json
{ "msg": "Credencial creada. Copiala ahora: no vas a poder verla de nuevo.",
  "token": "ahorr_pat_xK3p...<43 chars>",
  "data": { "id": 3, "name": "Claude Desktop — laptop", "token_prefix": "ahorr_pat_xK3p",
            "created_at": "2026-10-05T14:02:11+00:00", "last_used_at": null, "revoked_at": null } }
```

`token` aparece **solo acá** (FR-002). No se loguea, no se guarda en claro, y no hay endpoint que
lo devuelva después.

**Errores**:

| Caso | HTTP | Cuerpo |
|---|---|---|
| `name` vacío o ausente | `400` | `{"error": "El nombre de la credencial es obligatorio."}` |
| Ya tiene 10 credenciales activas | `400` | `{"error": "Límite de 10 credenciales activas alcanzado. Revocá alguna para crear otra."}` |
| Sin JWT | `401` | el manejo estándar de Flask-JWT-Extended |

---

## `GET /agent-token/`

Lista las credenciales del usuario, activas primero.

**Respuesta `200`**:

```json
{ "data": [ { "id": 3, "name": "Claude Desktop — laptop", "token_prefix": "ahorr_pat_xK3p",
              "created_at": "2026-10-05T14:02:11+00:00",
              "last_used_at": "2026-10-05T14:30:02+00:00", "revoked_at": null } ] }
```

Nunca incluye el secreto ni su hash. `last_used_at` está para que el usuario note una credencial
que no reconoce o que dejó de usar.

---

## `DELETE /agent-token/<int:token_id>`

Revoca una credencial. Efecto **inmediato** en los 5 workers, porque `/mcp` consulta la DB en cada
request (Decisión 5 de research).

**Respuesta `200`**: `{"msg": "Credencial revocada."}`

**Errores**:

| Caso | HTTP | Cuerpo |
|---|---|---|
| No existe **o es de otro usuario** | `404` | `{"error": "Credencial no encontrada."}` |
| Ya estaba revocada | `200` | `{"msg": "Credencial revocada."}` — idempotente |

El 404 indistinguible para "no existe" y "es de otro" es el mismo patrón que ya usa
`delete_category_service` (Principio II + Principio IV): no confirma la existencia de un recurso
ajeno.

No se borra la fila: se setea `revoked_at`. Queda el registro histórico y la credencial revocada
sale del cómputo del límite de 10.

---

## Servicio

`app/services/agent_token_service.py`, siguiendo el Principio I (el blueprint solo orquesta):

| Función | Qué hace |
|---|---|
| `create_agent_token_service(user_id, name) -> tuple[str, dict]` | Genera el token, guarda el hash, devuelve `(token_en_claro, serialize())`. Es la única función que ve el secreto. |
| `list_agent_tokens_service(user_id) -> list[dict]` | Lista, activas primero. |
| `revoke_agent_token_service(user_id, token_id) -> None` | Setea `revoked_at`. `NotFoundError` si no es del usuario. |
| `verify_agent_token(raw_token) -> int` | Usada por `/mcp`. Hashea, busca, valida `revoked_at` y `is_active`, actualiza `last_used_at`, devuelve el `user_id`. `UnauthorizedError` en cualquier fallo, **con un único mensaje**. |

Todas llevan docstring con Args/Returns/Raises, como pide el Development Workflow de la
constitución, y todas tienen tests (Principio VII) — incluyendo el caso de ownership ajeno.

---

## Frontend

Una sección nueva en la pestaña **Configuración** del dashboard
(`frontend/src/views/dashboard/Dashboard.jsx`), donde ya viven el perfil y la marca de agua de
versión.

Reglas que aplican (Principio X):

- Estado **solo** vía acciones de `flux.js`: `createAgentToken`, `getAgentTokens`,
  `revokeAgentToken`. Sin `useState` paralelo duplicando datos del servidor.
- Todas las requests con `credentials: "include"`.
- El token recién creado se muestra una vez, con botón de copiar y un aviso de que no se podrá
  recuperar. **No** se guarda en `localStorage` ni en el store persistido — se mantiene en estado
  local efímero del componente y se descarta al cerrar el aviso. Esto no viola el Principio X: no
  es estado de servidor ni dato de sesión, es un valor de un solo uso en pantalla.
- Revocar pide confirmación en la UI antes de ejecutar.

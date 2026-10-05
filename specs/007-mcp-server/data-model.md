# Phase 1 — Data Model: Servidor MCP para agentes de IA

**Fecha**: 2026-10-05 | **Spec**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)

## Alcance del cambio de esquema

Una tabla nueva. **Cero cambios** en `User`, `Transaction` y `Category`.

Esto está dentro del Principio IX de la constitución, que permite explícitamente "cambios de
esquema incrementales vía Alembic (nuevas columnas/tablas)" y solo prohíbe reescribir los modelos
existentes.

---

## Entidad nueva: `AgentToken`

Representa una credencial de larga duración que un usuario le otorga a un agente de IA.

**Archivo**: `backend/app/models.py` (se agrega al final, junto a los modelos existentes)

| Campo | Tipo | Constraints | Notas |
|---|---|---|---|
| `id` | `int` | PK | |
| `user_id` | `int` | FK → `user.id`, NOT NULL, indexado | Dueño de la credencial. Es la fuente de `user_id` para **toda** operación del agente. |
| `name` | `str(60)` | NOT NULL | Nombre que le pone el usuario para reconocerla ("Claude Desktop en la laptop"). |
| `token_hash` | `str(64)` | NOT NULL, **unique**, indexado | `sha256(token)` en hex. El único rastro del secreto. |
| `token_prefix` | `str(16)` | NOT NULL | Primeros caracteres visibles del token, para que el usuario identifique cuál es cuál en la lista sin exponer el secreto. |
| `created_at` | `datetime` | NOT NULL, default `now(utc)` | |
| `last_used_at` | `datetime` | nullable, default `None` | Se actualiza al usarse. Le permite al usuario detectar una credencial olvidada o comprometida. |
| `revoked_at` | `datetime` | nullable, default `None` | `NOT NULL` ⇒ credencial muerta. **Es el mecanismo de revocación completo** (ver Decisión 5 de research). |

### Reglas de validación

- `name`: obligatorio, se recorta a 60 caracteres. No puede quedar vacío tras el `strip()`.
- `token_hash`: lo genera el servidor; nunca viene del cliente.
- Límite por usuario: **10** credenciales activas (no revocadas). Evita que la lista crezca sin
  control; sigue el mismo criterio que `MAX_CATEGORIES_PER_USER` en `category_service`.
- Una credencial revocada **no se borra**: queda como registro histórico y se excluye del límite.

### Estados

```text
         generada
            │
            ▼
      ┌───────────┐   usada por el agente
      │  activa   │ ──────────────────────▶ (actualiza last_used_at)
      └───────────┘
            │ el usuario revoca
            ▼
      ┌───────────┐
      │ revocada  │ ──▶ rechazo inmediato en los 5 workers (revoked_at IS NOT NULL)
      └───────────┘        estado terminal: no se reactiva
```

### `serialize()`

```text
{ id, name, token_prefix, created_at, last_used_at, revoked_at }
```

**Nunca** incluye `token_hash` ni `user_id`, siguiendo el criterio ya establecido en los otros tres
modelos (`user_id` no se expone; ver comentario en `Transaction.serialize()`).

El token en claro **no es parte de `serialize()`**: se devuelve una sola vez, por separado, en la
respuesta del endpoint de creación (FR-002). Del `token_hash` no se puede volver al token, así que
una vez entregado no hay forma de recuperarlo — ni para el usuario ni para nosotros.

### Relación

```python
# En User:
agent_tokens: Mapped[list['AgentToken']] = relationship(
    'AgentToken', back_populates='user', lazy='dynamic'
)
```

Se usa `lazy='dynamic'`, igual que `transactions` y `categories`, por consistencia con el modelo
existente.

### Migración

Alembic, incremental: `flask db migrate -m "add agent_token table"` + `flask db upgrade`. Una tabla
nueva, sin `ALTER` sobre tablas existentes, así que no hay riesgo para los datos actuales.

> ⚠️ Antes de correr `pytest`, releer el comentario de cabecera de `backend/tests/conftest.py`. La
> fixture `db` hace `drop_all()` y ya vació la base de desarrollo una vez. El `assert` de
> `sqlite:///:memory:` es la red de seguridad; no removerlo.

---

## Entidades sin cambios

| Modelo | Uso en esta feature |
|---|---|
| `User` | Solo se le agrega la relación inversa. Ningún campo cambia. |
| `Transaction` | Se lee, crea, edita y borra **a través de los services existentes**. Sin cambios de esquema. |
| `Category` | Se lista, crea y borra a través de los services existentes. Sin cambios de esquema. |

**Detalle que importa para FR-021**: `Transaction.category` es un `String(60)`, **no** una foreign
key a `Category`. Borrar una categoría no tiene ningún efecto en cascada: las transacciones
conservan el nombre como texto. La previsualización de `delete_category` tiene que decir eso
explícitamente, porque lo intuitivo es suponer lo contrario.

---

## Objeto efímero: `confirm_token`

No es una entidad persistida. Es un valor **firmado** con `itsdangerous`, que el servidor emite en
la fase de previsualización y verifica en la fase de ejecución (Decisión 4 de research).

**Payload firmado**:

```text
{ "op": "delete_transaction" | "delete_category",
  "uid": <user_id de la credencial>,
  "tid": <id del objeto a afectar> }
```

**Propiedades**:

- **TTL 5 minutos**, verificado con `URLSafeTimedSerializer.loads(max_age=300)`.
- **Sin estado de servidor** → vale igual en los 5 workers, sin coordinación ni DB.
- Firmado con `JWT_SECRET_KEY` y un `salt` propio (`mcp-confirm`), para que un token de confirmación
  no pueda confundirse con ninguna otra cosa firmada por la app.
- La verificación exige que `uid` coincida con el usuario de la credencial **y** que `tid` coincida
  con el objetivo de la llamada. Un token válido para otra transacción, u obtenido con otra
  credencial, es rechazado.

Un `confirm_token` ausente, expirado, mal firmado, de otro usuario o apuntando a otro objeto ⇒ la
operación se rechaza **sin tocar datos**. Eso es SC-007.

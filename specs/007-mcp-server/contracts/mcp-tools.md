# Contract — Catálogo de tools expuestos por `tools/list`

**Spec**: [../spec.md](../spec.md) | **Decisiones**: [../research.md](../research.md) (4, 6)

9 tools. Cada uno delega en un service existente (Decisión 6). Ninguno acepta `user_id`: el usuario
sale siempre de la credencial.

**Convención de annotations** (FR-019):

- Lectura → `readOnlyHint: true`.
- Crea o modifica sin destruir → `readOnlyHint: false`, `destructiveHint: false`.
- Irreversible → `readOnlyHint: false`, `destructiveHint: true`, y confirmación de dos fases.

Recordatorio del protocolo: las annotations son **hints**, no garantías, y un cliente no debería
tomar decisiones de seguridad basándose en ellas. La garantía real vive en el `confirm_token`.

---

## Lectura

### `list_transactions`

> Lista las transacciones del usuario, de la más reciente a la más antigua, con el resumen de
> totales (ingresos, gastos, balance y categoría de mayor gasto).

- `inputSchema`: `page` (int, ≥1, default 1), `per_page` (int, 1–50, default 5)
- `annotations`: `readOnlyHint: true`
- Delega en: `get_transactions_service(user_id, page, per_page)`
- Devuelve: `{ data: [...], pagination: {...}, summary: {...} }` — la misma forma que
  `GET /transaction/`, para que SC-004 y SC-005 sean verificables por comparación directa.

### `find_transactions`

> Busca transacciones del usuario por texto en la descripción y/o rango de fechas. Usalo **antes**
> de editar o borrar, para identificar sin ambigüedad de qué transacción habla el usuario.

- `inputSchema`: `query` (string, opcional), `start_date` / `end_date` (`YYYY-MM-DD`, opcional),
  `limit` (int, 1–50, default 20)
- `annotations`: `readOnlyHint: true`
- Cubre **FR-022** y es lo que hace realizable FR-020: es el camino por el que el agente resuelve
  una referencia difusa ("el gasto del super") en un `id` concreto, en vez de adivinar.

### `get_analytics`

> Devuelve los datos agregados de un rango de fechas: por fecha y por categoría, más el resumen.
> Devuelve **datos**, no imágenes: el gráfico lo construye el cliente.

- `inputSchema`: `start_date`, `end_date` (`YYYY-MM-DD`, **requeridos**)
- `annotations`: `readOnlyHint: true`
- Delega en: `get_analytics_service(user_id, start_date, end_date)`
- Devuelve: `{ by_date, by_category, group_by, summary }` — idéntico a `GET /transaction/analytics`
  (FR-011, FR-012, SC-005).

### `list_categories`

> Lista las categorías del usuario con su color.

- `inputSchema`: `{}`
- `annotations`: `readOnlyHint: true`
- Delega en: `get_categories_service(user_id)`

---

## Escritura no destructiva

### `create_transaction`

> Registra una transacción a partir de texto en lenguaje natural, por ejemplo "gasté 850 en el
> super". El importe, la descripción, la categoría y si es ingreso o gasto se deducen del texto.

- `inputSchema`: `text` (string, requerido, 1–500 caracteres)
- `annotations`: `readOnlyHint: false`, `destructiveHint: false`, `idempotentHint: false`
- Delega en: `create_transaction_service(user_id, raw_input)` — el **mismo** camino que la app web,
  incluida la llamada a n8n. Eso es lo que hace cierto SC-004.
- **Límite de ritmo** por credencial (Decisión 7). Al excederlo: `isError: true` con "Demasiadas
  transacciones seguidas. Esperá un momento antes de registrar otra."
- Si n8n no responde: `isError: true` y **no se guarda nada a medias** (el service solo hace
  `commit` después de parsear). Eso cubre el escenario 3 de US2.

### `create_category`

> Crea una categoría. El color debe ser uno de: emerald, teal, blue, violet, rose, orange, yellow,
> gray.

- `inputSchema`: `name` (string, requerido, máx. 30), `color` (enum de los 8, default `gray`)
- `annotations`: `readOnlyHint: false`, `destructiveHint: false`
- Delega en: `create_category_service(user_id, name, color)` — que ya valida duplicados
  case-insensitive, el tope de 50 por usuario y el color contra `VALID_COLORS`. El `enum` en el
  schema es ayuda para el agente, **no** el control real (Principio V: la validación vive en el
  service).

### `update_transaction`

> Modifica la descripción, el importe o la categoría de una transacción existente. Identificá la
> transacción con `find_transactions` antes de llamar.

- `inputSchema`: `transaction_id` (int, requerido), `description` (string, opcional), `amount`
  (number > 0, opcional), `is_income` (bool, opcional), `category` (string, opcional)
- `annotations`: `readOnlyHint: false`, `destructiveHint: false`, `idempotentHint: true`
- Delega en: `update_transaction_service(user_id, transaction_id, data)`
- Es modificación, no destrucción: **no** requiere `confirm_token`. Una transacción de otro usuario
  responde "Transacción no encontrada." (el service ya lo hace).

---

## Irreversibles — confirmación de dos fases

Las dos únicas operaciones que destruyen datos. Ambas siguen el mismo patrón (Decisión 4): llamada
sin `confirm_token` ⇒ previsualización; llamada con `confirm_token` ⇒ ejecución. **No existe forma
de borrar en una sola llamada.**

### `delete_transaction`

> ⚠️ IRREVERSIBLE. Borra una transacción. Llamá primero SIN `confirm_token` para ver exactamente
> qué se va a borrar, mostrale esa previsualización al usuario, y volvé a llamar con el
> `confirm_token` SOLO si confirma explícitamente.

- `inputSchema`: `transaction_id` (int, requerido), `confirm_token` (string, opcional)
- `annotations`: `readOnlyHint: false`, `destructiveHint: true`, `idempotentHint: true`
- Delega en: `delete_transaction_service(user_id, transaction_id)` — solo en la fase 2.

**Fase 1** (sin `confirm_token`) — no toca datos:

```json
{ "resultType": "complete", "isError": false,
  "content": [ { "type": "text",
    "text": "CONFIRMACIÓN REQUERIDA — esta acción es irreversible.\nSe borrará:\n  Super Carrefour — $-850.00 — Alimentación — 2026-10-03\nMostrale esto al usuario y volvé a llamar con confirm_token solo si confirma." } ],
  "structuredContent": { "requires_confirmation": true,
    "preview": { "id": 42, "description": "Super Carrefour", "amount": -850.0,
                 "category": "Alimentación", "date": "2026-10-03T10:12:00+00:00" },
    "confirm_token": "<firmado, TTL 5 min>" } }
```

**Fase 2** (con `confirm_token` válido): borra y devuelve confirmación.

**Token inválido, expirado, de otro usuario o de otra transacción** ⇒ `isError: true`, **sin tocar
datos** (SC-007).

### `delete_category`

> ⚠️ IRREVERSIBLE. Borra una categoría. Llamá primero SIN `confirm_token` para ver qué se va a
> borrar y qué pasa con las transacciones que la usan. Volvé a llamar con el `confirm_token` SOLO
> si el usuario confirma explícitamente.

- `inputSchema`: `category_id` (int, opcional), `name` (string, opcional), `confirm_token` (string,
  opcional). Exactamente uno de `category_id` o `name`.
- `annotations`: `readOnlyHint: false`, `destructiveHint: true`, `idempotentHint: true`
- Delega en: `delete_category_service(user_id, category_id)` — solo en la fase 2.

**Fase 1** — la previsualización incluye el conteo de transacciones afectadas (FR-021):

```json
{ "resultType": "complete", "isError": false,
  "content": [ { "type": "text",
    "text": "CONFIRMACIÓN REQUERIDA — esta acción es irreversible.\nSe borrará la categoría \"Ocio\" (violet).\n17 transacciones usan esta categoría. NO se borran ni se modifican: conservan \"Ocio\" como texto, pero la categoría deja de estar disponible para elegir.\nMostrale esto al usuario y volvé a llamar con confirm_token solo si confirma." } ],
  "structuredContent": { "requires_confirmation": true,
    "preview": { "id": 7, "name": "Ocio", "color": "violet",
                 "transactions_using_it": 17, "transactions_deleted": 0 },
    "confirm_token": "<firmado, TTL 5 min>" } }
```

El texto dice explícitamente que **no** hay borrado en cascada, porque `Transaction.category` es un
String y no una FK (Decisión 6). Es la consecuencia contraintuitiva que el usuario necesita conocer
*antes* de confirmar.

**Ambigüedad por `name`** (FR-020, SC-008) — si `name` matchea más de una categoría, no se elige
ninguna y **no se emite `confirm_token`**:

```json
{ "resultType": "complete", "isError": true,
  "content": [ { "type": "text",
    "text": "Hay 2 categorías que coinciden con \"ocio\":\n  id=7  Ocio (violet)\n  id=19 Ocio nocturno (rose)\nNo se borró nada. Preguntale al usuario cuál quiere y volvé a llamar con category_id." } ] }
```

---

## Tabla de cobertura

| Tool | FR | Service |
|---|---|---|
| `list_transactions` | FR-009 | `get_transactions_service` |
| `find_transactions` | FR-022, FR-020 | query directa (solo lectura, filtrada por `user_id`) |
| `get_analytics` | FR-011, FR-012 | `get_analytics_service` |
| `list_categories` | FR-013 | `get_categories_service` |
| `create_transaction` | FR-010 | `create_transaction_service` |
| `create_category` | FR-013 | `create_category_service` |
| `update_transaction` | FR-014 | `update_transaction_service` |
| `delete_transaction` | FR-014, FR-017, FR-018 | `delete_transaction_service` |
| `delete_category` | FR-013, FR-017, FR-018, FR-021 | `delete_category_service` |

**No se expone**: nada de `/user/*` — ni perfil, ni contraseña, ni listado de usuarios (FR-006). Y
no hay tool para modificar categorías: el usuario lo sacó del alcance, y el backend tampoco lo
tiene.

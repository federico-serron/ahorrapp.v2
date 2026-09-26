# Contract: caminos felices faltantes en `user_bp.py` / `paypal_bp.py`

Cada fila es un caso hoy sin cobertura de camino feliz/rechazo de negocio (solo tienen el test de
"no filtra error interno" de T005).

## `user_bp.py`

| Endpoint | Caso | Resultado esperado |
|---|---|---|
| `POST /user/signup` | Datos válidos y únicos | `201` + `{msg, user: {...sin password...}}` |
| `POST /user/signup` | Email ya registrado | `400` + mensaje de conflicto (vía `ConflictError`) |
| `POST /user/login` | Credenciales correctas | `200` + cookie de sesión seteada + `{msg, user}` |
| `POST /user/login` | Password incorrecta | `400` (vía `ConflictError`, no filtra cuál campo está mal) |
| `PUT /user/me` | `name` válido | `200` + perfil actualizado |
| `PUT /user/me` | `name` con caracteres inválidos | `400` |

## `paypal_bp.py`

Mockear `get_access_token` y `create_order_service`/`capture_order_service` en
`app.routes.paypal_bp` (mismo patrón que los tests de error-leak existentes). Estos servicios
devuelven un objeto tipo `requests.Response` (no un dict) — mockear con un `MagicMock` que tenga
`.status_code` y `.json()`.

| Endpoint | Caso | Resultado esperado |
|---|---|---|
| `POST /paypal/create-order` | `create_order_service` devuelve una respuesta con `status_code=201` y un `approval link` en el body | El blueprint reenvía ese body y status tal cual |
| `POST /paypal/capture-order` | `capture_order_service` devuelve una respuesta con `status_code=200` y `{"status": "COMPLETED", ...}` | El blueprint reenvía ese body y status tal cual |

Nota: no se agrega cobertura de "orden no encontrada" ni ningún otro caso de negocio de PayPal
más allá del camino feliz — la protección con `@jwt_required` y la asociación a un usuario quedan
fuera de esta feature (son T004 del baseline, un cambio de comportamiento, no de tests).

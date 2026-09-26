# Contract: Revocación de sesión (logout)

## Antes de esta feature

| Acción | Resultado |
|---|---|
| `POST /user/logout` | `200`, cookie de sesión borrada del navegador, pero el JWT en sí **sigue siendo válido** hasta su expiración natural (1 día) si alguien lo reutiliza manualmente (ej. copiándolo antes del logout). |
| Reutilizar el token viejo en `GET /user/me` (u otro endpoint protegido) tras logout | `200` — el token todavía funciona. |

## Después de esta feature

| Acción | Resultado |
|---|---|
| `POST /user/logout` | `200`, cookie borrada, Y el `jti` de ese token específico se agrega a `BLACKLIST`. |
| Reutilizar el token viejo en cualquier endpoint protegido tras logout | `401` — Flask-JWT-Extended rechaza el token porque su `jti` está en el blocklist. |
| Un segundo token del mismo usuario (otra sesión de login, no cerrada) | Sigue funcionando con normalidad — la revocación es por `jti` individual, no por usuario. |

## Mecanismo

- `app/__init__.py` registra `@jwt.token_in_blocklist_loader` sobre la instancia `jwt` ya
  existente, con un callback que devuelve `jwt_payload["jti"] in BLACKLIST`.
- `user_bp.py::logout()` ejecuta `jti = get_jwt()["jti"]; BLACKLIST.add(jti)` antes de limpiar la
  cookie.
- El blocklist es un `set()` en memoria (ver `research.md` Decisión 1) — se resetea si el proceso
  reinicia; aceptable para el estado actual del proyecto.

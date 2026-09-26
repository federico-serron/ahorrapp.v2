# Contract: `GET /user/users`

## Antes de esta feature

| Condición | Respuesta |
|---|---|
| Sin cookie de sesión válida | `401` (por `@jwt_required`) |
| Con cookie de sesión válida (cualquier rol) | `200` + array completo de usuarios serializados |

## Después de esta feature

| Condición | Respuesta |
|---|---|
| Sin cookie de sesión válida | `401` (sin cambios — lo maneja `@jwt_required`) |
| Cookie válida, usuario con `role != 'admin'` | `403` + `{ "error": "Usuario no tiene permisos para acceder" }` |
| Cookie válida, usuario cuya cuenta ya no existe (borde) | `403` + mismo mensaje genérico (no distingue de "sin permisos") |
| Cookie válida, usuario con `role == 'admin'` | `200` + array completo de usuarios serializados (sin cambios) |

## Body de éxito (sin cambios)

```json
[
  { "id": 1, "name": "...", "email": "...", "role": "user", "is_premium": false, "phone": null, "last_login": "...", "is_active": true }
]
```

## Body de rechazo (403)

```json
{ "error": "Usuario no tiene permisos para acceder" }
```

Ningún campo del body de rechazo depende de si el usuario objetivo existe o no, ni incluye datos
de otros usuarios.

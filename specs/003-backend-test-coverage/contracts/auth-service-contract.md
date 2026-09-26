# Contract: `backend/app/services/auth_service.py`

Cada función pública debe tener al menos un test de camino feliz y uno de camino de error
(FR-002). Este documento fija qué caso cubre cada uno — no es el código del test, es lo que debe
quedar verificado.

## `create_user_service(**kwargs)`

| Caso | Entrada | Resultado esperado |
|---|---|---|
| Feliz | `name`, `email`, `password` válidos y únicos | Usuario creado, password hasheada con bcrypt (no en texto plano), retorna `serialize()` |
| Error | Falta `name`/`email`/`password` | `BadRequestError` |
| Error | `email` ya existe | `ConflictError` |

## `login_user_service(email, password)`

| Caso | Entrada | Resultado esperado |
|---|---|---|
| Feliz | Credenciales correctas | Devuelve un JWT (string) válido |
| Error | Falta `email` o `password` | `BadRequestError` |
| Error | Email no existe | `NotFoundError` |
| Error | Password incorrecta | `ConflictError` |

## `edit_user_service(user_id, **kwargs)`

| Caso | Entrada | Resultado esperado |
|---|---|---|
| Feliz | `password` nueva | Password actualizada (hash distinto al anterior) |
| Error | `user_id` inexistente | `NotFoundError` |
| Error | Campo no editable (ej. `email`) | `BadRequestError` |

## `update_profile_service(user_id, name=None, phone=None)`

| Caso | Entrada | Resultado esperado |
|---|---|---|
| Feliz | `name` válido (solo letras) | Nombre actualizado |
| Feliz | `phone` vacío (`''`) | `phone` se limpia a `None` |
| Error | `user_id` inexistente | `NotFoundError` |
| Error | `name` con caracteres no permitidos | `BadRequestError` |
| Error | `phone` con caracteres no permitidos | `BadRequestError` |

## `is_user_admin(user_id)`

| Caso | Entrada | Resultado esperado |
|---|---|---|
| Feliz | `user_id` de un usuario con `role='admin'` | Devuelve `True` |
| Error | `user_id` inexistente | `NotFoundError` |
| Error | `user_id` de un usuario con `role != 'admin'` | `UnauthorizedError` |

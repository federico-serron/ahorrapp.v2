# Data Model: Restringir el listado de usuarios a administradores

No se agregan ni modifican entidades. Se documenta el atributo existente que esta feature
utiliza como criterio de autorización.

## User (existente, sin cambios de esquema)

Campo relevante para esta feature:

| Campo | Tipo | Uso en esta feature |
|---|---|---|
| `role` | `String(20)`, default `'user'` | Se compara contra `'admin'` dentro de `is_user_admin(user_id)` para decidir si la solicitud a `GET /user/users` procede. |

No hay transición de estados ni reglas de validación nuevas — `role` ya se asigna en
`create_user_service` (default `'user'`) y se asume gestionado manualmente (no hay endpoint de
"promover a admin" en el alcance de este proyecto todavía).

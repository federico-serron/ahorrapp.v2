# Quickstart: Validar la restricción admin en `GET /user/users`

## Prerrequisitos

- Backend corriendo (`cd backend && venv/Scripts/python.exe -m app.run`), con la migración de
  esquema al día (`flask db upgrade`) — no hace falta ninguna migración nueva para esta feature.
- Dos usuarios de prueba: uno con `role='user'` (el default) y uno con `role='admin'` (se puede
  crear vía signup normal y luego actualizar el `role` directamente en la base, ya que no existe
  todavía un endpoint para promover usuarios).

## Validación automatizada (la principal)

```bash
cd backend
venv/Scripts/python.exe -m pytest -q tests/test_user_bp.py --ignore=tests/test_transaction_service.py
```

Casos esperados (ver `contracts/get-user-users.md`):
- Usuario `admin` autenticado → `200` + lista completa.
- Usuario `user` autenticado → `403` + mensaje genérico, sin datos de usuarios en el body.
- Sin autenticar → `401` (comportamiento preexistente, no debe romperse).

## Validación manual (opcional, end-to-end)

1. Loguearse como un usuario común (`POST /user/login`) y golpear `GET /user/users` con esa
   cookie → debe devolver `403`.
2. Cambiar el `role` de ese usuario a `'admin'` directamente en la base de datos (sin volver a
   loguearse, para confirmar FR-004: el chequeo es fresco, no cacheado en el token).
3. Repetir `GET /user/users` con la misma cookie de sesión ya emitida → ahora debe devolver
   `200` con el listado completo, confirmando que el rol se evalúa en cada request.

## Resultado esperado

Ver `contracts/get-user-users.md` para el detalle exacto de status codes y bodies antes/después.

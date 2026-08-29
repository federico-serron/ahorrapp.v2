# Research: Restringir el listado de usuarios a administradores

No hay `NEEDS CLARIFICATION` pendientes de la spec ni del Technical Context — el alcance es
chico y el patrón a seguir ya existe en el propio repo. Este documento registra las decisiones
tomadas y por qué.

## Decisión 1: Reutilizar `is_user_admin(user_id)` en vez de escribir un nuevo chequeo

- **Decision**: Llamar a `is_user_admin(user_id)` (ya definida en `backend/app/services/auth_service.py:171-180`)
  desde `show_users()`, en vez de escribir una comparación de rol inline en el blueprint.
- **Rationale**: Ya existe, ya está probada conceptualmente (aunque sin tests propios — eso se
  agrega en esta feature), y mantiene la lógica de autorización en la capa de servicio, tal como
  exige el Principio I de la constitución. Consolida en un solo lugar la regla "qué es un admin".
- **Alternatives considered**: Comparar `user.role == 'admin'` directamente en el blueprint —
  descartado porque duplicaría lógica que ya vive en el servicio y violaría la separación
  blueprint/servicio.

## Decisión 2: Mapear el rechazo a HTTP 403, no 401 ni 404

- **Decision**: Cuando `is_user_admin` levanta `UnauthorizedError`, el blueprint responde
  `403 Forbidden` con un mensaje genérico.
- **Rationale**: El usuario SÍ está autenticado (ya pasó `@jwt_required`); lo que falta es
  autorización para esta acción puntual. 401 es para "no autenticado" (ya cubierto por
  `@jwt_required`, que corta antes de llegar a esta lógica). 404 escondería la existencia del
  endpoint, lo cual no es necesario para un endpoint interno de listado — no hay un recurso
  específico cuya existencia haya que ocultar (no es `/user/<id>`, es un listado).
- **Alternatives considered**: 404 genérico para "esconder" el endpoint — descartado por ser
  innecesariamente opaco para un caso que no maneja datos de un recurso específico ajeno.

## Decisión 3: Excepción `NotFoundError` de `is_user_admin` (usuario no encontrado)

- **Decision**: Si `is_user_admin` levanta `NotFoundError` (el `user_id` del JWT no corresponde a
  ningún usuario existente — caso borde: cuenta borrada después de emitido el token), el
  blueprint responde igual que el caso "sin permisos" (403 genérico), no con un 404 distintivo.
- **Rationale**: Evita revelar si el problema es "no sos admin" vs "tu cuenta ya no existe";
  ambos casos terminan en "no podés hacer esto", consistente con FR-005 de la spec (no confirmar
  ni negar existencia).
- **Alternatives considered**: Devolver 404 "usuario no encontrado" — descartado porque expondría
  información sobre el estado de la cuenta del propio solicitante, y complica innecesariamente el
  contrato del endpoint para un caso borde poco frecuente.

## Decisión 4: No tocar el frontend

- **Decision**: No se agrega ningún manejo especial de 403 en el frontend.
- **Rationale**: Se confirmó (`grep` sobre `frontend/src`) que ningún código de frontend llama a
  `GET /user/users` hoy. No hay UI que consuma este endpoint, por lo tanto no hay UI que ajustar
  ni romper.

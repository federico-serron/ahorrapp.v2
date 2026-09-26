# Research: Revocación de sesión, baja de PayPal y limpieza de vistas huérfanas

## Decisión 1: Blocklist en memoria (`set()`), no Redis ni tabla en DB

- **Decision**: Registrar `@jwt.token_in_blocklist_loader` en `app/__init__.py` sobre la
  instancia `jwt` (ya creada), con un callback `check_if_token_revoked(jwt_header, jwt_payload)`
  que devuelve `jwt_payload["jti"] in BLACKLIST`. En `user_bp.py::logout()`, descomentar
  `jti = get_jwt()["jti"]; BLACKLIST.add(jti)`. Se confirmó la firma exacta del callback y el uso
  de `get_jwt()["jti"]` contra la documentación oficial de Flask-JWT-Extended 4.7.1 (vía
  Context7) — coincide con el patrón ya esbozado (comentado) en el código actual.
- **Rationale**: `app/blacklist.py` ya declara `BLACKLIST = set()` — la pieza que falta es
  conectarlo, no diseñar un mecanismo nuevo. Una tabla en DB o Redis sería más robusto (persiste
  entre reinicios, se comparte entre workers) pero es infraestructura nueva no pedida ni
  necesaria para el tamaño actual de la app — el Principio IX de la constitución exige no
  agrandar la superficie sin necesidad.
- **Alternatives considered**:
  - Redis (patrón oficial recomendado por la librería para producción) — descartado por ahora,
    demasiada infraestructura nueva para lo que se pide.
  - Tabla `TokenBlocklist` en la DB existente (patrón alternativo de la misma librería) — más
    cercano al stack actual (ya hay Postgres/SQLAlchemy), pero implica una migración nueva para
    un problema que el `set()` ya resuelve funcionalmente hoy. Se deja como mejora futura si el
    proyecto crece a múltiples workers/instancias.
- **Limitación documentada**: el blocklist en memoria se pierde si el proceso de Flask reinicia
  (todos los tokens "revocados" vuelven a ser válidos hasta su expiración natural), y no se
  comparte entre múltiples workers/instancias si en el futuro se escala horizontalmente. Aceptable
  para el estado actual del proyecto (single-instance); documentado para revisar si eso cambia.

## Decisión 2: Orden de eliminación — vistas huérfanas antes que el componente PayPal

- **Decision**: Se borra primero `PaymentMethodsView.jsx` (parte de US3, vista huérfana) y recién
  después el componente `components/payments/PaymentMethods/PayPal/` (parte de US2) — aunque
  ambas tareas pueden hacerse en cualquier orden sin romper nada, porque `PaymentMethodsView.jsx`
  ya está huérfana (no la importa ningún archivo activo) desde antes de esta feature.
- **Rationale**: Aclarar la secuencia evita cualquier confusión sobre si hay una dependencia real
  entre US2 y US3 — no la hay; `Home.jsx` (también huérfana) es la única que importa
  `PaymentMethodsView.jsx`, y ninguna de las dos está en el árbol de render real de la app
  (`Layout.jsx` no las menciona).
- **Alternatives considered**: N/A — es solo una nota de secuencia, no una decisión técnica con
  alternativas reales.

## Decisión 3: Qué queda de la infraestructura genérica de pagos

- **Decision**: `frontend/src/config/paymentMethods.js` pierde solo la entrada `PAYPAL`; las
  entradas `MERCADOPAGO` y `STRIPE`, y sus componentes de UI en
  `components/payments/PaymentMethods/`, quedan intactos.
- **Rationale**: El pedido es específicamente sobre PayPal; MercadoPago y Stripe son stubs de UI
  sin backend real detrás (no se investigó más porque están fuera del pedido explícito), y
  tocarlos sería exceder el alcance acordado con el usuario.
- **Alternatives considered**: Eliminar toda la sección de métodos de pago ya que ninguno tiene
  backend funcional — descartado por ser una decisión de producto no pedida; se documenta como
  posible limpieza futura, no se ejecuta acá.

## Decisión 4: Variables de entorno de PayPal — se eliminan, no se dejan comentadas

- **Decision**: Se borran las líneas `PAYPAL_*` de `backend/.env.example`,
  `VITE_PAYPAL_CLIENT_ID` de `frontend/.env.example`, y las 5 entradas `PAYPAL_*` del bloque
  `environment` en `docker-compose.yml` — no se dejan comentadas "por si acaso".
- **Rationale**: Consistente con el Principio VI (gestión de secretos/configuración): no dejar
  configuración fantasma que sugiera una funcionalidad que ya no existe.
- **Alternatives considered**: N/A.

<!--
Sync Impact Report
Version change: [TEMPLATE] → 1.0.0 (initial ratification)
Modified principles: n/a (first concrete version; all placeholders replaced)
Added sections:
  - Core Principles I-X (Layered Architecture, Aislamiento de Datos por Usuario,
    Autenticación Segura por Cookies, Manejo de Errores sin Fuga de Información,
    Validación Explícita en el Borde del Servicio, Gestión de Secretos y Configuración
    por Entorno, Cobertura de Tests para Lógica de Negocio, PWA Standalone con
    Capacitor a Futuro, Estabilidad de Estructura y Modelos, Disciplina de Estado y
    Requests en Frontend)
  - Security Requirements
  - Development Workflow
  - Governance (amendment procedure, versioning policy, conflict-flagging rule)
Removed sections: none (template placeholders only)
Templates requiring follow-up: none checked automatically in this run — recommend
  reviewing .specify/templates/plan-template.md and tasks-template.md for consistency
  with Principles II, III, VII, IX and X on next feature planning pass.
Deferred TODOs: none
-->

# AhorrApp Constitution

## Core Principles

### I. Layered Architecture (Blueprints Orquestan, Services Deciden)
Los blueprints (`app/routes/`) SOLO parsean requests, llaman a un service y mapean
excepciones a códigos HTTP. Toda lógica de negocio, queries y reglas de validación
viven en `app/services/`. Los modelos (`app/models.py`) son solo definición de datos
y serialización — sin lógica de negocio.
Rationale: es el patrón ya establecido y probado (`category_service`,
`transaction_service`); mezclar lógica en blueprints dificulta testear y viola la
separación de responsabilidades ya escrita en CLAUDE.md.

### II. Aislamiento de Datos por Usuario (NON-NEGOTIABLE)
Toda query que devuelva o modifique datos pertenecientes a un usuario DEBE filtrar
explícitamente por `user_id` del JWT autenticado. Ningún endpoint puede devolver o
afectar datos de otro usuario salvo que el actor tenga rol `admin` verificado
explícitamente (ej. `is_user_admin()`).
Rationale: es el invariante de seguridad más crítico de una app financiera. Ya se
cumple en category/transaction; se exige como no-negociable para todo código nuevo
para cerrar brechas como la detectada en `GET /user/users` (listado sin chequeo de rol).

### III. Autenticación Segura por Cookies (NON-NEGOTIABLE)
JWT únicamente vía cookies httpOnly (`credentials: "include"` en frontend, nunca
`localStorage`/`sessionStorage`). Passwords SIEMPRE hasheadas con bcrypt, nunca en
texto plano ni logueadas. El identity del JWT SIEMPRE se castea con
`int(get_jwt_identity())` antes de usarse. Los flags de cookie (`Secure`,
`SameSite`, `CSRF_PROTECT`) deben reforzarse en producción respecto a desarrollo.
Rationale: ya establecido en CLAUDE.md; principio reforzado porque se detectó una
violación real (`edit_user()` sin `int()`) que debe evitarse en código futuro.

### IV. Manejo de Errores sin Fuga de Información
Los endpoints solo capturan/lanzan excepciones tipadas de `app/exceptions.py`. Los
mensajes de error devueltos al cliente deben ser genéricos y controlados — está
prohibido interpolar `str(exception)` de excepciones no controladas en la respuesta
HTTP. Errores inesperados se loguean server-side y devuelven un mensaje genérico 500.
Rationale: hoy varios endpoints devuelven `str(e)` crudo al cliente, exponiendo
detalles internos (stack de SQLAlchemy, rutas, etc.) útiles para reconocimiento por
un atacante.

### V. Validación Explícita en el Borde del Servicio
Todo input externo (body de requests, respuestas de integraciones como n8n/PayPal)
DEBE validarse en la capa de servicio antes de persistir o usarse: campos
requeridos, tipos, longitud máxima, y preferentemente whitelist sobre blacklist
(como `VALID_COLORS`). Respuestas de servicios externos se validan por forma y
contenido antes de confiar en ellas (patrón ya usado en `n8n_service.py`).
Rationale: patrón ya demostrado y correcto; se formaliza para que toda feature
nueva lo replique en vez de confiar ciegamente en inputs.

### VI. Gestión de Secretos y Configuración por Entorno
Ningún secreto (API keys, JWT secret, credenciales de DB/PayPal) se hardcodea en el
código fuente. Todo se lee vía variables de entorno (`os.getenv`) y los archivos
`.env*` permanecen fuera de git. La configuración de seguridad (cookies, CORS,
CSRF) se define por clase de entorno (`Development`/`Testing`/`Production`) y
nunca se relaja en producción respecto al default seguro.
Rationale: ya se respeta correctamente (`.gitignore`, clases `Config`); se
formaliza como no-negociable para prevenir regresiones al agregar integraciones
nuevas.

### VII. Cobertura de Tests para Lógica de Negocio (NON-NEGOTIABLE)
Todo nuevo método en `app/services/` que contenga una regla de negocio, validación
o control de autorización DEBE tener tests unitarios con pytest antes de mergear
(happy path + al menos un caso de rechazo/ownership). Se sigue el patrón de
fixtures de `conftest.py` (DB en memoria, aislamiento por test).
Rationale: patrón ya maduro en category/transaction pero ausente en `auth_service`
y en los blueprints de usuario — se exige para cerrar ese gap hacia adelante.

### VIII. PWA Standalone con Capacitor a Futuro
La app se diseña como Progressive Web App instalable en el homescreen de Android e
iOS (manifest.json, service worker, iconos y meta viewport correctos) — no se
construirá una app nativa separada. El mismo código React/Vite debe funcionar
standalone en modo homescreen. El proyecto se mantiene "Capacitor-ready": evitar
APIs exclusivas de navegador de escritorio que Capacitor no pueda puentear, usar
rutas/assets relativos compatibles con WebView, y no hardcodear hostnames absolutos
fuera de configuración. El service worker NO debe cachear respuestas autenticadas
con datos financieros del usuario (riesgo de fuga entre sesiones en dispositivo
compartido).
Rationale: decisión de producto — una sola base de código web que se empaqueta
luego con Capacitor, en vez de mantener una app nativa aparte.

### IX. Estabilidad de Estructura y Modelos (cambios requieren aprobación explícita)
La estructura de carpetas actual (backend: `routes/` → `services/` → `models.py`;
frontend: `components/`, `views/`, `js/store`) y los modelos de datos actuales
(`User`, `Transaction`, `Category` y sus campos) se consideran estables. No se
reestructuran ni migran a otro patrón salvo que se identifique una alternativa
concretamente mejor y el usuario la apruebe explícitamente antes de implementarla.
Cambios de esquema son incrementales vía Alembic (nuevas columnas/tablas), nunca
reescrituras del modelo existente.
Rationale: el usuario requiere previsibilidad arquitectónica; ningún refactor
estructural mayor se decide unilateralmente.

### X. Disciplina de Estado y Requests en Frontend
Todo estado de la app se lee/modifica exclusivamente vía acciones de `flux.js`
(Flux store) — no se duplican fuentes de verdad para datos del servidor con
`useState` paralelo. Ningún token o dato de sesión se persiste en
`localStorage`/`sessionStorage`; la única fuente de sesión es la cookie httpOnly
(refuerza Principio III). Toda request mutante (POST/PUT/DELETE) DEBE enviar
`credentials: "include"` y el header CSRF de forma consistente. La validación en
el cliente es UX, nunca el control de seguridad real (ese vive en el backend,
Principio V) — no se confía en ella como única barrera. No puede coexistir más de
un hook/módulo resolviendo la misma responsabilidad; al detectar duplicación se
elimina la versión no usada en vez de agregar una tercera variante.
Rationale: se detectaron violaciones reales — un hook (`useAuthLocalStorage.js`)
que decodifica JWT desde `localStorage`, duplicado con otro `useAuth` basado en
cookies, y llamadas de pago sin `credentials`/CSRF consistentes con el resto del
store.

## Security Requirements

- CORS restringido a origins explícitos por entorno (`CORS_ORIGINS`), nunca `*` en
  producción.
- CSRF protection obligatorio en producción para cookies
  (`JWT_COOKIE_CSRF_PROTECT=True`).
- La revocación de sesión (blacklist de JWT) debe estar activa y funcional en
  `logout`, no comentada/inerte.
- Toda integración externa nueva (pagos, webhooks, IA) debe tener timeout y manejar
  fallos de red sin crashear el request.
- El manifest y el service worker de la PWA no deben exponer ni cachear tokens,
  cookies o datos de transacciones fuera del ciclo de vida de la sesión autenticada.

## Development Workflow

- Nuevo endpoint = blueprint delgado + función de service documentada (docstring
  con Args/Returns/Raises) + excepciones mapeadas a HTTP + tests.
- Migraciones de DB vía Alembic (`flask db migrate`), nunca editar el schema a mano.
- No se agregan dependencias ni servicios externos nuevos sin actualizar
  `.env.example` y este documento si cambia una regla de seguridad.
- Nuevo código frontend que toque sesión, requests mutantes o estado global debe
  seguir el Principio X antes de mergear.

## Governance

Esta constitución prevalece sobre preferencias de estilo individuales; en caso de
conflicto, gana la constitución salvo enmienda explícita.

Enmiendas se realizan vía `/speckit-constitution`, con versionado semántico:
- MAJOR: se elimina o redefine un principio existente de forma incompatible.
- MINOR: se agrega un principio nuevo o se expande materialmente una guía existente.
- PATCH: aclaraciones de redacción sin cambio semántico.

**Regla de conflicto (obligatoria):** si una feature nueva entra en conflicto con
un principio de esta constitución, el asistente DEBE detenerse antes de
implementar y preguntar al usuario citando explícitamente el principio en
conflicto (ej. "Principio II exige X, la feature propone Y — ¿cómo procedemos?").
No se resuelve el conflicto unilateralmente.

**Version**: 1.0.0 | **Ratified**: 2026-08-28 | **Last Amended**: 2026-08-28

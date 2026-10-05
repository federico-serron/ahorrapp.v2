# Implementation Plan: Servidor MCP para agentes de IA

**Branch**: `007-mcp-server` | **Date**: 2026-10-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-mcp-server/spec.md`

## Summary

Exponer AhorrApp a agentes de IA mediante un endpoint `POST /mcp` que habla el protocolo MCP sobre
Streamable HTTP, autenticado con tokens de acceso personales que el usuario genera y revoca desde la
app. El agente obtiene 9 herramientas que delegan en los services existentes, sin duplicar una sola
regla de negocio.

El enfoque técnico sale de dos hallazgos de la investigación:

1. **La revisión `2026-07-28` del protocolo eliminó las sesiones, el SSE por GET y la
   resumabilidad**, y en las revisiones anteriores el session id era opcional para el servidor. La
   intersección de ambas eras es "POST con JSON-RPC, respuesta JSON, sin sesión" — un endpoint
   stateless que se implementa en Flask/WSGI sin el SDK ASGI y que funciona tal cual con los 5
   workers de gunicorn.
2. **Usar tokens opacos en lugar de JWT disuelve el riesgo técnico principal que la spec
   señalaba.** La revocación pasa a ser una fila en la DB que los 5 workers leen en cada request, así
   que esta feature **ya no depende** de `specs/005-shared-jwt-blocklist/`.

Detalle completo en [research.md](./research.md).

## Technical Context

**Language/Version**: Python 3.11 (backend, según `Dockerfile`), JavaScript/React 18 (frontend)

**Primary Dependencies**: Flask 3.1.1, Flask-SQLAlchemy 3.1.1, Flask-JWT-Extended 4.7.1,
Flask-Migrate 4.1.0, `itsdangerous` 2.2.0 (ya presente, vía Flask) para los tokens de confirmación.
**Ninguna dependencia nueva** — en particular, **no** se usa el SDK `mcp` (ver Decisión 1).

**Storage**: PostgreSQL en producción, SQLite en desarrollo. Una tabla nueva (`agent_token`) vía
Alembic.

**Testing**: pytest con las fixtures de `backend/tests/conftest.py` (SQLite en memoria, aislamiento
por test). Vitest en frontend para la sección de credenciales.

**Target Platform**: contenedor Linux único que sirve SPA + API, `gunicorn --workers 5
--worker-class gevent`, puerto 5100.

**Project Type**: web app fullstack (backend Flask + frontend React/Vite), con un endpoint de
protocolo nuevo.

**Performance Goals**: un `SELECT` indexado extra por request del agente (verificación de la
credencial). Las operaciones de lectura responden en el mismo orden que sus equivalentes REST.
`create_transaction` hereda el timeout de 30 s de `n8n_service`.

**Constraints**:

- **Stateless obligatorio**: 5 workers de gunicorn sin sticky sessions ⇒ nada de estado en memoria
  compartido. Aplica a la verificación de credenciales y a los tokens de confirmación.
- **gevent, no asyncio**: se evita introducir un event loop de asyncio dentro de greenlets
  monkey-patcheados.
- **Respuesta siempre JSON**, nunca SSE.
- **El puente stdio solo usa biblioteca estándar** y no importa nada de `app/`: tiene que poder
  copiarse a la máquina del usuario por separado.
- **Clientes alojados fuera de alcance** (ChatGPT, Claude web/móvil): requieren OAuth 2.1 con
  RFC 9728, que es una feature aparte.
- **Cero cambios** en el comportamiento de los endpoints web existentes (FR-016).

**Scale/Scope**: 1 tabla nueva, 2 blueprints nuevos, 2 services nuevos, 9 tools MCP, 1 puente
stdio, 1 sección de frontend, 1 línea de config de PWA.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Estado | Cómo se cumple |
|---|---|---|
| **I. Layered Architecture** | ✅ | `mcp_bp.py` y `agent_token_bp.py` solo parsean y mapean errores. La lógica vive en `mcp_service.py` y `agent_token_service.py`. Los tools delegan en los services existentes. |
| **II. Aislamiento por usuario** (NON-NEGOTIABLE) | ✅ | El `user_id` sale **solo** de la credencial. Ningún `inputSchema` acepta `user_id`. Los services ya filtran por `user_id` y no se modifican. |
| **III. Autenticación por cookies** (NON-NEGOTIABLE) | ✅ **Resuelto por enmienda v1.1.0** | El conflicto con el Bearer que exige MCP se resolvió con una excepción acotada para clientes no-navegador, aprobada por el usuario el 2026-10-05. Ver abajo. |
| **IV. Errores sin fuga** | ✅ | Un único `401` genérico para los 5 casos de rechazo (FR-007). Las excepciones de negocio se mapean a `isError` con su mensaje ya redactado; las inesperadas a un texto fijo + `logger.exception`. Nunca `str(e)` crudo. |
| **V. Validación en el borde** | ✅ | `inputSchema` por tool (ayuda al agente) **más** la validación real en los services, que no se toca. Whitelist de colores vía `VALID_COLORS`, como ya está. |
| **VI. Secretos por entorno** | ✅ | No hay secretos nuevos en código. El `confirm_token` se firma con `JWT_SECRET_KEY`, que ya viene de `os.getenv`. Los tokens de agente los genera el usuario y se guardan hasheados. |
| **VII. Tests de lógica de negocio** (NON-NEGOTIABLE) | ✅ | Tests para las 4 funciones de `agent_token_service` y para cada tool, con happy path + rechazo por ownership. Más tests de contrato del transporte. |
| **VIII. PWA / Capacitor** | ✅ | Se agrega `/^\/mcp/` al `navigateFallbackDenylist` (Decisión 8). Sin `runtimeCaching` nuevo, así que no se cachea nada autenticado. |
| **IX. Estabilidad de estructura y modelos** | ✅ | Una tabla nueva vía Alembic — expresamente permitido ("nuevas columnas/tablas"). `User`, `Transaction` y `Category` sin cambios de esquema. Ningún refactor. |
| **X. Estado y requests en frontend** | ✅ | 3 acciones nuevas en `flux.js`, `credentials: "include"`, nada en `localStorage`. El token recién creado es estado efímero de componente, no estado de servidor. |

### ✅ Conflicto con el Principio III — resuelto (enmienda v1.1.0, 2026-10-05)

> **Estado**: el usuario aprobó la enmienda el 2026-10-05. Ya está aplicada en
> `.specify/memory/constitution.md` (versión 1.1.0, con su Sync Impact Report). El registro de
> abajo se conserva porque documenta *por qué* se enmendó un principio NON-NEGOTIABLE.

La constitución obliga a detenerme antes de implementar y citar el conflicto. Acá estaba:

- **Lo que dice el Principio III (NON-NEGOTIABLE)**: *"JWT únicamente vía cookies httpOnly
  (`credentials: "include"` en frontend, nunca `localStorage`/`sessionStorage`)"*.
- **Lo que la feature necesita**: el endpoint `/mcp` tiene que aceptar
  `Authorization: Bearer <token>` en un header. La spec del protocolo MCP lo exige en cada request y
  además prohíbe el token en la query string.

**Por qué no hay alternativa técnica**: un agente de IA no es un navegador. No tiene un almacén de
cookies con política de same-site, no puede recibir una cookie `httpOnly`, y ningún cliente MCP
existente implementa autenticación por cookie. Mantener el principio al pie de la letra significa
que la feature no se puede construir.

**Por qué el espíritu del principio queda intacto**: el Principio III protege contra robo de token
por XSS en el navegador. Lo que propongo no toca ese terreno:

1. El token del agente **no es un JWT**. Es un secreto opaco aleatorio del que solo guardamos el
   `sha256`.
2. **Nunca entra al navegador** como credencial: se muestra una vez para copiar y pegar en la
   configuración del agente. No se guarda en `localStorage` ni en `sessionStorage`.
3. El Bearer se acepta **solo en `/mcp`**. `JWT_TOKEN_LOCATION` sigue siendo `["cookies"]` y los
   endpoints web no cambian. La app web sigue siendo 100% cookie-only.
4. La credencial **no habilita** ninguna operación de cuenta (FR-006), así que su alcance es menor
   que el de la cookie de sesión.
5. Como no es JWT, la revocación es inmediata y real — **más fuerte** que la del JWT actual, cuya
   blocklist en memoria no funciona con 5 workers.

**Enmienda aplicada** (MINOR → constitución v1.1.0), agregada al Principio III. El texto final en la
constitución desglosa esto en cinco condiciones acumulativas y aclara explícitamente que la
excepción no relaja bcrypt para contraseñas ni permite tokens en `localStorage` ni en query
strings:

> La autenticación por cookie aplica a clientes de navegador. Un cliente no-navegador (agente de IA
> vía MCP) puede autenticarse con un token de acceso personal opaco en el header `Authorization:
> Bearer`, siempre que: el token no sea un JWT y se almacene solo hasheado; sea revocable con
> efecto inmediato en todas las instancias; su alcance excluya toda operación de administración de
> cuenta; y se acepte únicamente en los endpoints destinados a esos clientes, sin ampliar
> `JWT_TOKEN_LOCATION` para el resto de la app.

**Resuelto**: enmienda aprobada y aplicada. La implementación está desbloqueada; el gate T001 de
[tasks.md](./tasks.md) queda cerrado.

### Re-evaluación post-diseño (Phase 1)

Sin violaciones nuevas. Dos notas que aparecieron al diseñar:

- **SHA-256 en vez de bcrypt** para el hash del token. Podría leerse como un roce con el Principio
  III ("passwords SIEMPRE hasheadas con bcrypt"), pero el principio habla de *contraseñas*: secretos
  de baja entropía elegidos por humanos. Acá es un secreto de 256 bits generado por el servidor,
  donde el factor de trabajo no aporta nada y sí impide el lookup indexado. Las contraseñas de
  usuario siguen con bcrypt, sin cambios. Rationale completo en la Decisión 3.
- **`specs/005-shared-jwt-blocklist/` sigue pendiente** pero ya no bloquea (Decisión 5). El bug de
  `logout` de la app web con 5 workers sigue abierto; esta feature no lo arregla ni lo empeora.

## Project Structure

### Documentation (this feature)

```text
specs/007-mcp-server/
├── spec.md
├── plan.md                      # Este archivo
├── research.md                  # Phase 0 — 8 decisiones
├── data-model.md                # Phase 1 — AgentToken + confirm_token
├── quickstart.md                # Phase 1 — validación end-to-end
├── contracts/                   # Phase 1
│   ├── mcp-transport.md         #   POST /mcp: JSON-RPC, auth, errores
│   ├── stdio-bridge.md          #   puente stdio para clientes sin encabezados
│   ├── mcp-tools.md             #   los 9 tools
│   └── rest-agent-tokens.md     #   /agent-token/* para la app web
├── checklists/
│   └── requirements.md
└── tasks.md                     # Phase 2 — lo crea /speckit-tasks
```

### Source Code (repository root)

```text
backend/
├── app/
│   ├── __init__.py                      # MODIFICADO: registrar 2 blueprints
│   ├── models.py                        # MODIFICADO: + AgentToken, + relación en User
│   ├── routes/
│   │   ├── mcp_bp.py                    # NUEVO: POST /mcp (+ 405 en GET/DELETE)
│   │   └── agent_token_bp.py            # NUEVO: /agent-token/ (CRUD para la app web)
│   └── services/
│       ├── mcp_service.py               # NUEVO: dispatcher JSON-RPC + registry de tools
│       ├── mcp_tools.py                 # NUEVO: los 9 tools, delegando en los services
│       └── agent_token_service.py       # NUEVO: generar / listar / revocar / verificar
├── tools/
│   └── ahorrapp_mcp_bridge.py           # NUEVO: puente stdio (solo stdlib, no importa app/)
├── migrations/versions/<hash>_add_agent_token.py   # NUEVO (Alembic)
└── tests/
    ├── test_agent_token_service.py      # NUEVO
    ├── test_mcp_transport.py            # NUEVO: conformidad JSON-RPC, auth y ruteo
    ├── test_mcp_tools.py                # NUEVO: los 9 tools + aislamiento
    ├── test_mcp_confirmation.py         # NUEVO: dos fases y ambigüedad
    └── test_mcp_bridge.py               # NUEVO: el puente como subproceso

frontend/
├── vite.config.js                       # MODIFICADO: + /^\/mcp/ al denylist
└── src/
    ├── js/store/flux.js                 # MODIFICADO: 3 acciones nuevas
    ├── components/dashboard/
    │   ├── AgentTokensPanel.jsx          # NUEVO
    │   └── AgentTokensPanel.test.jsx     # NUEVO
    └── views/dashboard/Dashboard.jsx     # MODIFICADO: montar el panel en Configuración
```

**Structure Decision**: se mantiene exactamente la estructura existente
(`routes/` → `services/` → `models.py` en backend; `components/`, `views/`, `js/store` en frontend),
como exige el Principio IX. Nada se mueve ni se renombra.

Dos decisiones de organización que vale justificar:

- **`mcp_service.py` y `mcp_tools.py` separados**: el dispatcher (parseo JSON-RPC, versiones,
  errores de protocolo) y las herramientas (lógica de cada tool) cambian por razones distintas.
  Juntarlos daría un archivo grande donde la conformidad de protocolo se mezcla con reglas de
  negocio.
- **`agent_token_bp.py` separado de `user_bp.py`**: `user_bp` es administración de cuenta. Tenerlos
  aparte hace legible en el código que la credencial no abre nada de `/user/*` (FR-006).

## Orden de implementación sugerido

Sigue las prioridades de las user stories. Cada paso deja algo verificable.

| Paso | Qué | Habilita |
|---|---|---|
| 0 | `/^\/mcp/` en el denylist de la PWA + endurecer `JWT_TOKEN_LOCATION` en el config de tests | Decisión 8; hallazgo C1 del análisis |
| 1 | `AgentToken` + migración + `agent_token_service` + tests | base de todo |
| 2 | `mcp_bp` + dispatcher + auth Bearer + tests de conformidad y de ruteo | base del protocolo |
| 3 | `/agent-token/*` + panel de frontend | **US1**: el usuario ya puede generar y revocar |
| 4 | `tools/list` + los tools de lectura (`list_transactions`, `list_categories`) + puente stdio | **US1** completa: un agente conecta y lee, con o sin soporte de encabezados |
| 5 | `create_transaction` + límite de ritmo (10 / 60 s por credencial) | **US2** |
| 6 | `get_analytics` | **US3** |
| 7 | `create_category` + `delete_category` de dos fases + ambigüedad por nombre | **US4** + FR-021, SC-008 |
| 8 | `find_transactions` + `update_transaction` + `delete_transaction` de dos fases | **US5** + FR-014, FR-022 |
| 9 | Validación end-to-end: cliente MCP real y `docker compose` con 5 workers ([quickstart.md](./quickstart.md)) | SC-001, SC-003, SC-004, SC-005 |

Los pasos 1 y 2 bloquean todo lo demás. Una vez hechos, los pasos 5, 6, 7 y 8 son independientes
entre sí; conviene igual cerrar US1 (pasos 3–4) primero, porque es lo que permite probar cualquier
tool con un cliente real. El paso 0 no depende de nada.

## Complexity Tracking

> Solo se llena si el Constitution Check tiene violaciones que haya que justificar.

| Violación | Por qué es necesaria | Alternativa más simple, y por qué se rechaza |
|---|---|---|
| ~~**Principio III**: Bearer en header en `/mcp`~~ — **ya no es una violación**: cubierto por la excepción del Principio III en la constitución v1.1.0 | La spec del protocolo MCP lo exige en cada request y prohíbe el token en query string. Un agente no es un navegador: no puede recibir ni enviar una cookie `httpOnly`. | *Autenticar `/mcp` por cookie*: ningún cliente MCP lo implementa, así que la feature no se podría usar. *Reusar el JWT de cookie como Bearer*: convierte un JWT de 1 día en una credencial de larga duración sin revocación confiable (depende del blocklist roto de 005) y obliga a renovarlo a diario. Mitigación adoptada: token opaco no-JWT, hasheado, revocable al instante, de alcance reducido, aceptado solo en `/mcp` — las cinco condiciones que la enmienda exige. |
| **Hash SHA-256** del token en vez de bcrypt | El token tiene 256 bits de entropía generados por el servidor: bcrypt no agrega seguridad y sí agrega ~100 ms de CPU por request del agente, además de imposibilitar el lookup por índice. | *bcrypt sobre el token*: obligaría a traer todas las filas de tokens y comparar una por una en cada request. Las contraseñas de usuario siguen con bcrypt, intactas. |

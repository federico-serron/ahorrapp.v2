# Specification Quality Checklist: Servidor MCP para agentes de IA

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-10-05
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

Tres ambigüedades se resolvieron con el usuario antes de escribir, en vez de dejarlas como
marcadores:

1. **Autenticación** → tokens de acceso personales (se descartó reusar el JWT de 1 día y OAuth 2.1).
2. **Alcance de operaciones** → lectura + creación de transacciones + CRUD de categorías + datos
   para gráficos + edición/borrado de transacciones.
3. **"Generar gráficos"** → devolver datos estructurados, no imágenes renderizadas.

Revisión posterior del usuario (2026-10-05):

4. **Confirmación obligatoria ante ambigüedad** (FR-017 a FR-021, SC-007, SC-008). Se escribió en
   dos capas a propósito: lo que el sistema **impone** (nada irreversible en una sola llamada,
   previsualización antes de confirmar, devolver coincidencias en vez de adivinar) y lo que
   **induce** en el agente (descripciones y señalización de operaciones destructivas). Un servidor
   MCP no puede obligar a un cliente a preguntar, así que un requisito redactado como "el agente
   debe preguntar" no sería verificable; la capa impuesta sí lo es.
5. **Modificar categorías salió del alcance**: no se necesita, así que no se construye.

Un hallazgo verificado contra el código que la spec incorpora:

- **La revocación de credenciales no puede usar el blocklist actual**: es un `set()` en memoria y
  producción corre 5 workers de gunicorn. Documentado en Assumptions y en los Edge Cases; se
  solapa con `specs/005-shared-jwt-blocklist/` (pausada). Es el riesgo técnico principal a resolver
  en `/speckit-plan`.
  → **Resuelto en el plan** (2026-10-05, [research.md](../research.md) Decisión 5): la credencial
  no es un JWT sino un token opaco cuyo estado es una fila en la DB, así que la revocación es
  cross-worker por construcción. Esta feature **ya no depende** de 005, que sigue abierta por el
  `logout` de la app web.

Resultado de `/speckit-plan` (2026-10-05):

- ✅ **Conflicto con el Principio III de la constitución** (cookie-only JWT) vs. el
  `Authorization: Bearer` que el protocolo MCP exige. Se escaló según la Regla de conflicto y el
  usuario **aprobó la enmienda el 2026-10-05**: constitución v1.1.0, con una excepción acotada para
  clientes no-navegador bajo cinco condiciones acumulativas. Documentado en `plan.md` →
  Constitution Check. T001 de `tasks.md` cerrada; la implementación está desbloqueada.

Resultado de `/speckit-analyze` (2026-10-05) — 12 hallazgos, 0 CRITICAL. Correcciones aplicadas:

- **A1** (HIGH): el límite de ritmo de `create_transaction` no tenía umbral, así que su criterio de
  aceptación no era testeable. Fijado en **10 creaciones por credencial cada 60 s**.
- **F1**: la tarea del catch-all estaba antes del registro del blueprint y habría fallado al
  correr. Movida al final de la fase 2 y ampliada con dos aserciones más (regresión del SPA y que
  un Bearer de agente no autentica en endpoints web).
- **C1** (HIGH): la fixture de tests ampliaba `JWT_TOKEN_LOCATION` a `['cookies','headers']`, lo
  que hacía inverificable la condición 4 de la excepción del Principio III. Se removió el override
  (verificado antes: ningún test usa `Authorization`/`Bearer`) y se agregó el test del invariante.
- **G1** (HIGH): la verificación multi-worker de SC-003 estaba marcada "opcional" en el quickstart.
  Ahora es obligatoria y está en una tarea de la fase 8.
- **G2**: FR-006 no tenía test. Agregado a T024 con lista literal de tools permitidos, de modo que
  agregar un tool nuevo falle hasta revisar su alcance a propósito.
- **U1**: FR-014 no estaba cubierto por ninguna user story. Se agregó **US5 — Corregir y borrar
  transacciones desde el agente** (P3) con 5 escenarios de aceptación y su Independent Test, más
  una fase propia en `tasks.md` y el escenario 8b en el quickstart.
- **U2**: `find_transactions` no tenía FR. Agregado **FR-022** (buscar transacciones), ubicado tras
  FR-014 sin renumerar FR-015..FR-021 para no invalidar referencias existentes.
- **U3**: el tope de credenciales activas por usuario no estaba en la spec. Incorporado a FR-001.
- **Error propio detectado al corregir**: los artefactos decían "8 tools" en 8 lugares. Son **9**
  (`find_transactions` se agregó después y nunca se actualizó el conteo). Corregido en `plan.md`,
  `quickstart.md`, `contracts/mcp-tools.md` y `tasks.md`.

- **R1** (resuelto 2026-10-05, decisión del usuario): SC-001 dependía de que el cliente MCP
  soportara encabezados personalizados. Se agregó **FR-023** y un **puente stdio**
  ([contracts/stdio-bridge.md](../contracts/stdio-bridge.md), Decisión 9), porque
  `command`/`args`/`env` es el mínimo común denominador de todo el ecosistema MCP. Con eso quedan
  cubiertos **todos los clientes locales** (CLI, IDE y escritorio). El usuario eligió **no**
  implementar OAuth 2.1 en esta feature, así que los **clientes alojados** (conectores de ChatGPT,
  Claude.ai web y móvil) quedan explícitamente **fuera de alcance** — está registrado en
  Assumptions de la spec, no es una omisión. Se descartó el token en el path de la URL: funcionaría
  en cualquier cliente sin puente, pero el secreto terminaría en los logs de acceso y de los
  proxies.

Sigue abierto, sin bloquear: **I1** (`supportedVersions` anuncia 4 revisiones del protocolo y los
tests cubren 2 handshakes).

Deliberadamente **no** se nombra MCP, JSON-RPC, Flask ni ninguna tecnología en los requisitos: el
endpoint `/mcp` que pidió el usuario es una decisión de implementación que corresponde al plan.

Ningún ítem quedó pendiente. Lista para `/speckit-plan`.

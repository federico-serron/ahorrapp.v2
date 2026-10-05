# Quickstart — Validación del servidor MCP

**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Contratos**: [contracts/](./contracts/)

Escenarios ejecutables para probar que la feature funciona de punta a punta. Cada uno indica qué
Success Criteria cubre.

---

## Prerequisitos

```bash
# Backend
cd backend && source venv/bin/activate && python -m app.run    # :5100

# Frontend (otra terminal)
cd frontend && npm run dev                                      # :5173
```

Hace falta además:

- La migración aplicada: `cd backend && flask db upgrade`
- `N8N_WEBHOOK_URL` configurada (solo para el Escenario 4)
- Un usuario con algunas transacciones y categorías ya cargadas

> ⚠️ **Antes de correr `pytest`**: leer la cabecera de `backend/tests/conftest.py`. La fixture `db`
> hace `drop_all()`, y apuntar sin querer a la base de desarrollo la vacía — ya pasó una vez. El
> `assert` de `sqlite:///:memory:` es la red de seguridad.

---

## Escenario 1 — Generar una credencial (US1, SC-001, FR-001, FR-002)

1. Entrar a la app → **Dashboard** → pestaña **Configuración**.
2. En "Credenciales para agentes de IA", crear una con el nombre `Prueba local`.
3. **Esperado**: aparece el token completo (`ahorr_pat_...`) con un botón de copiar y el aviso de
   que no se podrá ver de nuevo.
4. Copiarlo y cerrar el aviso.
5. **Esperado**: la lista muestra la credencial con su prefijo, sin el secreto. Recargar la página
   no vuelve a mostrar el token completo en ningún lado.

**Verificación extra (FR-002)** — el secreto no está en claro en la base:

```bash
cd backend && flask shell
>>> from app.models import AgentToken
>>> t = AgentToken.query.order_by(AgentToken.id.desc()).first()
>>> t.token_hash           # 64 hex, no se parece al token
>>> 'ahorr_pat_' in t.token_hash
False
>>> t.serialize()          # no incluye token_hash ni user_id
```

---

## Escenario 2 — Handshake y descubrimiento (US1, FR-008)

Exportar el token:

```bash
export TOK="ahorr_pat_...pegar-acá..."
```

**Handshake moderno** (`2026-07-28`):

```bash
curl -i -X POST http://localhost:5100/mcp \
  -H "Authorization: Bearer $TOK" \
  -H "Content-Type: application/json" \
  -H "MCP-Protocol-Version: 2026-07-28" \
  -d '{"jsonrpc":"2.0","id":"d1","method":"server/discover",
       "params":{"_meta":{"io.modelcontextprotocol/protocolVersion":"2026-07-28"}}}'
```

**Esperado**: `200`, `Content-Type: application/json`, `result.supportedVersions` con las 4
versiones, `result.capabilities.tools`, y `result.instructions` con la regla de confirmación.
**Ningún header `Mcp-Session-Id`** en la respuesta.

**Handshake legacy**:

```bash
curl -s -X POST http://localhost:5100/mcp \
  -H "Authorization: Bearer $TOK" -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize",
       "params":{"protocolVersion":"2025-06-18","capabilities":{},
                 "clientInfo":{"name":"curl","version":"1.0"}}}'
```

**Esperado**: `200` con `result.protocolVersion: "2025-06-18"` y `result.serverInfo`. Nótese que no
se mandó el header `MCP-Protocol-Version` y **no** es un error.

**Catálogo de tools**:

```bash
curl -s -X POST http://localhost:5100/mcp \
  -H "Authorization: Bearer $TOK" -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' | python -m json.tool
```

**Esperado**: 9 tools. Verificar que `delete_transaction` y `delete_category` traen
`annotations.destructiveHint: true`, que los 4 de lectura traen `readOnlyHint: true`, y que
**ningún** `inputSchema` tiene una propiedad `user_id`.

---

## Escenario 3 — Métodos HTTP y conformidad (FR-016, contrato de transporte)

```bash
# GET y DELETE → 405
curl -s -o /dev/null -w "GET  %{http_code}\n" -X GET    http://localhost:5100/mcp -H "Authorization: Bearer $TOK"
curl -s -o /dev/null -w "DEL  %{http_code}\n" -X DELETE http://localhost:5100/mcp -H "Authorization: Bearer $TOK"

# Método JSON-RPC inexistente → 404 + código -32601
curl -s -w "\nHTTP %{http_code}\n" -X POST http://localhost:5100/mcp \
  -H "Authorization: Bearer $TOK" -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":9,"method":"resources/list"}'

# Versión no soportada → 400 + código -32022 con data.supported
curl -s -w "\nHTTP %{http_code}\n" -X POST http://localhost:5100/mcp \
  -H "Authorization: Bearer $TOK" -H "Content-Type: application/json" \
  -H "MCP-Protocol-Version: 1900-01-01" \
  -d '{"jsonrpc":"2.0","id":10,"method":"tools/list",
       "params":{"_meta":{"io.modelcontextprotocol/protocolVersion":"1900-01-01"}}}'

# Header y _meta discrepantes → 400 + HeaderMismatch
curl -s -w "\nHTTP %{http_code}\n" -X POST http://localhost:5100/mcp \
  -H "Authorization: Bearer $TOK" -H "Content-Type: application/json" \
  -H "MCP-Protocol-Version: 2026-07-28" \
  -d '{"jsonrpc":"2.0","id":11,"method":"tools/list",
       "params":{"_meta":{"io.modelcontextprotocol/protocolVersion":"2025-06-18"}}}'

# Notificación (sin id) → 202 sin cuerpo
curl -s -o /dev/null -w "NOTIF %{http_code}\n" -X POST http://localhost:5100/mcp \
  -H "Authorization: Bearer $TOK" -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"notifications/initialized"}'
```

**Esperado**: `405`, `405`, `404` (`-32601`), `400` (`-32022` con `data.supported`), `400`
(`HeaderMismatch`), `202`.

**Regresión de la app web (FR-016, SC-006)**: los endpoints existentes siguen igual.

```bash
cd backend && pytest -q        # toda la suite en verde, incluidos los tests previos
```

---

## Escenario 4 — Registrar un gasto hablando (US2, SC-004)

```bash
curl -s -X POST http://localhost:5100/mcp \
  -H "Authorization: Bearer $TOK" -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call",
       "params":{"name":"create_transaction","arguments":{"text":"gasté 850 en el super"}}}' \
  | python -m json.tool
```

**Esperado**: `isError: false` y la transacción creada.

**Verificación de SC-004** — indistinguible de una creada desde la UI:

1. Abrir el dashboard: la transacción aparece en la lista.
2. `amount` es **negativo** (es un gasto).
3. `category` es una de las categorías del usuario.
4. `raw_input` guarda el texto original.
5. Crear una equivalente desde la UI y comparar los dos registros campo por campo.

**Fallo de n8n (US2, escenario 3)**: apagar n8n o romper `N8N_WEBHOOK_URL`, repetir la llamada.
**Esperado**: `isError: true` con un mensaje genérico sobre el servicio de interpretación —
**sin** detalle interno ni `str(e)` — y **ninguna transacción a medias** en la base.

---

## Escenario 5 — Consultar y analizar (US3, SC-005)

```bash
# Transacciones paginadas
curl -s -X POST http://localhost:5100/mcp \
  -H "Authorization: Bearer $TOK" -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":4,"method":"tools/call",
       "params":{"name":"list_transactions","arguments":{"page":1,"per_page":5}}}'

# Analíticas del mes
curl -s -X POST http://localhost:5100/mcp \
  -H "Authorization: Bearer $TOK" -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":5,"method":"tools/call",
       "params":{"name":"get_analytics",
                 "arguments":{"start_date":"2026-10-01","end_date":"2026-10-31"}}}'
```

**Esperado / SC-005**: abrir el panel de Analíticas del dashboard con **el mismo rango de fechas** y
comparar. `summary.total_income`, `summary.total_expenses` y `summary.balance` deben coincidir
exactamente, y `by_category` debe traer las mismas categorías con los mismos totales.

**Verificación de FR-012**: la respuesta trae solo datos — ninguna imagen, ningún base64, ninguna
URL de gráfico.

---

## Escenario 6 — Aislamiento entre usuarios (SC-002, FR-005) ⚠️ el más importante

1. Crear un segundo usuario (`otro@example.com`) con al menos una transacción y una categoría
   propias. Anotar los `id`.
2. Con el token del **primer** usuario, intentar alcanzar los datos del segundo:

```bash
# Leer la transacción ajena
curl -s -X POST http://localhost:5100/mcp \
  -H "Authorization: Bearer $TOK" -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":6,"method":"tools/call",
       "params":{"name":"update_transaction",
                 "arguments":{"transaction_id":<ID_AJENO>,"description":"hackeado"}}}'

# Borrar la categoría ajena (fase 1)
curl -s -X POST http://localhost:5100/mcp \
  -H "Authorization: Bearer $TOK" -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":7,"method":"tools/call",
       "params":{"name":"delete_category","arguments":{"category_id":<ID_AJENO>}}}'

# Intentar inyectar un user_id en los argumentos
curl -s -X POST http://localhost:5100/mcp \
  -H "Authorization: Bearer $TOK" -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":8,"method":"tools/call",
       "params":{"name":"list_transactions","arguments":{"page":1,"user_id":<OTRO_USER_ID>}}}'
```

**Esperado**: los dos primeros → `isError: true` con "no encontrada" (nunca "no te pertenece": eso
confirmaría que existe). El tercero → ignora `user_id` y devuelve **las transacciones del dueño del
token**. `delete_category` de otro usuario **no emite `confirm_token`**.

3. Confirmar en la base que nada del segundo usuario cambió.

---

## Escenario 7 — Confirmación de operaciones irreversibles (SC-007, FR-017, FR-018, FR-021)

**Fase 1 — previsualización, sin tocar datos**:

```bash
curl -s -X POST http://localhost:5100/mcp \
  -H "Authorization: Bearer $TOK" -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":20,"method":"tools/call",
       "params":{"name":"delete_transaction","arguments":{"transaction_id":<ID_PROPIO>}}}' \
  | python -m json.tool
```

**Esperado**: `requires_confirmation: true`, la descripción de lo que se va a borrar, y un
`confirm_token`. **La transacción sigue existiendo** — verificarlo en el dashboard antes de seguir.

**Fase 2 — ejecución**:

```bash
export CT="<confirm_token de la respuesta anterior>"
curl -s -X POST http://localhost:5100/mcp \
  -H "Authorization: Bearer $TOK" -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":21,\"method\":\"tools/call\",
       \"params\":{\"name\":\"delete_transaction\",
                   \"arguments\":{\"transaction_id\":<ID_PROPIO>,\"confirm_token\":\"$CT\"}}}"
```

**Esperado**: borrada.

**Rechazos que no deben tocar datos** (SC-007) — cada uno con `isError: true`:

| Intento | Cómo probarlo |
|---|---|
| Token inventado | `"confirm_token": "basura"` |
| Token de **otra** transacción | usar el `CT` de la transacción A para borrar la B |
| Token de **otro** usuario | generar la fase 1 con el token del segundo usuario |
| Token expirado | esperar >5 min antes de la fase 2 |
| Reutilizar un token ya usado | repetir la fase 2 ⇒ "no encontrada", ya se borró |

**FR-021 — borrar una categoría en uso**:

```bash
curl -s -X POST http://localhost:5100/mcp \
  -H "Authorization: Bearer $TOK" -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":22,"method":"tools/call",
       "params":{"name":"delete_category","arguments":{"name":"Ocio"}}}' | python -m json.tool
```

**Esperado**: la previsualización dice cuántas transacciones usan la categoría y aclara
explícitamente que **no se borran ni se modifican** (conservan el nombre como texto). Tras
confirmar, verificar en el dashboard que esas transacciones siguen ahí con su categoría intacta y
que solo desapareció la categoría de la lista de elegibles.

---

## Escenario 8 — Ambigüedad (SC-008, FR-020)

1. Crear dos categorías cuyos nombres se solapen: `Ocio` y `Ocio nocturno`.
2. Pedir el borrado por nombre parcial:

```bash
curl -s -X POST http://localhost:5100/mcp \
  -H "Authorization: Bearer $TOK" -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":23,"method":"tools/call",
       "params":{"name":"delete_category","arguments":{"name":"ocio"}}}' | python -m json.tool
```

**Esperado**: `isError: true`, la respuesta **lista las dos** con su `id`, **no** trae
`confirm_token`, y **no se borró nada**. Verificar en el dashboard que las dos categorías siguen.

3. Repetir con `name: "Ocio nocturno"` (coincidencia exacta y única) → ahí sí devuelve
   previsualización y `confirm_token`.

---

## Escenario 8b — Corregir una transacción y resolver una referencia ambigua (US5, FR-014, FR-022)

Cubre la user story 5. Se numera `8b` para no desplazar los escenarios 9, 10 y 11, ya referenciados
desde `tasks.md`.

**Corregir (sin confirmación: modificar es reversible)**:

1. Elegir una transacción propia y anotar su `id`.

```bash
curl -s -X POST http://localhost:5100/mcp   -H "Authorization: Bearer $TOK" -H "Content-Type: application/json"   -d '{"jsonrpc":"2.0","id":40,"method":"tools/call",
       "params":{"name":"update_transaction",
                 "arguments":{"transaction_id":<ID_PROPIO>,"amount":1234.5,"is_income":false}}}'   | python -m json.tool
```

**Esperado**: `isError: false`, **sin** pedir `confirm_token` — es el escenario 5 de US5. En el
dashboard el monto quedó en `-1234.5` (negativo, porque `is_income: false`). Verificar también que
cambiar solo la `description` no altera el monto ni el signo.

**Resolver una referencia ambigua** (FR-022 + FR-020):

2. Crear dos transacciones cuyas descripciones se solapen (p. ej. dos "Super" en días distintos).

```bash
curl -s -X POST http://localhost:5100/mcp   -H "Authorization: Bearer $TOK" -H "Content-Type: application/json"   -d '{"jsonrpc":"2.0","id":41,"method":"tools/call",
       "params":{"name":"find_transactions","arguments":{"query":"super","limit":20}}}'   | python -m json.tool
```

**Esperado**: devuelve **las dos** con su `id`, monto y fecha — lo suficiente para que el agente le
pregunte al usuario cuál, en vez de elegir una. Esta es la razón de existir de `find_transactions`:
sin ella, "borrá el gasto del super" obliga al agente a adivinar.

3. Confirmar que `find_transactions` **no** devuelve transacciones de otro usuario: repetir con el
   token del segundo usuario y verificar que los `id` no se solapan con los del primero.

---

## Escenario 9 — Revocación inmediata (SC-003, FR-003, FR-004)

1. Con el token funcionando, confirmar que `tools/list` responde `200`.
2. En el dashboard, revocar esa credencial.
3. Repetir **la misma** llamada:

```bash
curl -s -w "\nHTTP %{http_code}\n" -X POST http://localhost:5100/mcp \
  -H "Authorization: Bearer $TOK" -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":30,"method":"tools/list"}'
```

**Esperado**: `401` con `{"error": "Credencial inválida."}` — **sin reintentos, sin reinicio del
backend, sin esperar expiración**.

**Verificación de FR-007** — los cinco rechazos dan el mismo mensaje:

```bash
for T in "" "no-es-un-token" "ahorr_pat_inexistente" "$TOK"; do
  curl -s -X POST http://localhost:5100/mcp -H "Authorization: Bearer $T" \
    -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
  echo
done
```

**Esperado**: respuestas **idénticas**. Nada distingue "no existe" de "revocado" de "malformado".

**Verificación de SC-003 con varios workers — OBLIGATORIA (T053b)**:

SC-003 dice "incluso con varias instancias del backend corriendo en paralelo". Con un solo proceso
de desarrollo esa cláusula **no se verifica**, así que este paso no es opcional.

```bash
docker compose up --build        # gunicorn con 5 workers
# 1. generar una credencial nueva contra el contenedor
# 2. usarla ~10 veces seguidas (para repartirla entre workers)
# 3. revocarla desde la app
# 4. usarla ~10 veces más
```

**Esperado**: los 10 intentos del paso 4 devuelven `401`, sin importar qué worker atienda cada uno.
Ni un solo `200`.

Esto es exactamente lo que **no** se podría garantizar si la credencial fuera un JWT con el
`BLACKLIST` en memoria actual: cada worker tiene su propio `set()`, así que revocar en uno deja a
los otros cuatro aceptando el token. Es la razón de la Decisión 3 y la condición 2 de la excepción
del Principio III.

---

## Escenario 10 — Un cliente MCP real (SC-001, FR-023)

La prueba definitiva: que un agente de verdad se conecte. Hay **dos vías**, y conviene probar las
dos porque cubren tipos de cliente distintos.

### Vía A — HTTP directo (clientes que permiten configurar encabezados)

1. En la configuración de servidores MCP del cliente (Claude Code, Cursor, VS Code, Gemini CLI,
   OpenCode…), agregar un servidor HTTP apuntando a `http://localhost:5100/mcp` con el encabezado
   `Authorization: Bearer ahorr_pat_...`.
2. Reiniciar el cliente.
3. **Esperado**: aparecen los 9 tools en su lista de herramientas.

### Vía B — Puente stdio (clientes sin campo de encabezados)

Esta es la que hace cierto FR-023. Funciona en cualquier cliente MCP, porque `command`/`args`/`env`
es el mínimo común denominador del ecosistema.

```json
{
  "mcpServers": {
    "ahorrapp": {
      "command": "python",
      "args": ["/ruta/absoluta/a/backend/tools/ahorrapp_mcp_bridge.py"],
      "env": {
        "AHORRAPP_TOKEN": "ahorr_pat_...",
        "AHORRAPP_URL": "http://localhost:5100/mcp"
      }
    }
  }
}
```

1. Pegar esa configuración (algunos clientes usan la clave `servers` y piden `"type": "stdio"`).
2. Reiniciar el cliente.
3. **Esperado**: los mismos 9 tools, comportamiento idéntico a la vía A.
4. Revisar los logs del cliente: el puente no debe haber escrito nada en stdout que no sea
   JSON-RPC, y **el token no debe aparecer en ningún log**.

Prueba rápida del puente sin cliente, antes de configurar nada:

```bash
cd backend
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' |   AHORRAPP_TOKEN="$TOK" AHORRAPP_URL="http://localhost:5100/mcp"   python tools/ahorrapp_mcp_bridge.py
```

**Esperado**: una sola línea de JSON con los 9 tools. Si cuelga, el sospechoso es un `flush()`
faltante.

### Verificación funcional (en cualquiera de las dos vías)

4. Pedirle en lenguaje natural: *"¿cuánto gasté este mes?"* → responde con números que coinciden
   con el dashboard.
5. Pedirle: *"registrá que gasté 1200 en nafta"* → aparece en el dashboard.
6. Pedirle: *"borrá el gasto de nafta"* → **esperado**: el cliente muestra la previsualización y
   pide confirmación antes de ejecutar. Si el agente intentara borrar en un solo paso, el servidor
   lo rechaza igual.
7. **Medir SC-001**: el tiempo del paso 1 al 3, partiendo de la app y sin leer documentación
   técnica, debe ser menor a 5 minutos.

> Si el cliente falla al conectar por la vía A, el primer sospechoso es la era del protocolo que
> habla: revisar qué `protocolVersion` manda en el `initialize` o el `server/discover` y
> contrastarlo con la lista de `supportedVersions` del Escenario 2. Si falla porque no tiene dónde
> poner el encabezado, usar la vía B.
>
> **Clientes alojados** (conectores de ChatGPT, Claude.ai web y móvil) **no se pueden conectar** por
> ninguna de las dos vías: no lanzan procesos locales ni aceptan un token pegado, y requieren
> OAuth 2.1 con RFC 9728, fuera de alcance de 007. No es un fallo de este escenario.

---

## Escenario 11 — PWA en producción (Decisión 8, Principio VIII)

Este es el que **no se reproduce en desarrollo**, porque ahí frontend y backend están en puertos
distintos. En producción comparten origen.

```bash
docker compose up --build
```

1. Abrir la app, dejar que el service worker se instale (DevTools → Application → Service Workers).
2. Navegar directo a `http://localhost:5100/mcp`.
3. **Esperado**: responde el `405` de Flask (o el `401`), **no** el HTML del SPA. Si devuelve el
   shell de la app, falta `/^\/mcp/` en el `navigateFallbackDenylist` de `frontend/vite.config.js`.
4. En DevTools → Application → Cache Storage, confirmar que **ninguna** respuesta de `/mcp` quedó
   cacheada.

---

## Checklist por User Story

| User Story | Escenarios |
|---|---|
| US1 — conectar un agente | 1, 2, 3, 6, 9, 10 |
| US2 — registrar gastos hablando | 4 |
| US3 — consultar y analizar | 5 |
| US4 — administrar categorías | 7 (parte de `delete_category`), 8 |
| US5 — corregir y borrar transacciones | 7 (parte de `delete_transaction`), 8b |

---

## Checklist de Success Criteria

| SC | Escenario |
|---|---|
| SC-001 — conectar un agente en <5 min | 1, 2, 10 (vías A y B) |
| SC-002 — 100% de accesos cruzados rechazados | 6 |
| SC-003 — revocación inmediata con varias instancias | 9 (la parte multi-worker es **obligatoria**) |
| SC-004 — transacción del agente indistinguible de la web | 4 |
| SC-005 — analíticas coinciden con el dashboard | 5 |
| SC-006 — cero regresiones | 3 (`pytest -q`) |
| SC-007 — 100% de borrados sin confirmar rechazados | 7 |
| SC-008 — ambigüedad devuelve opciones y no ejecuta | 8 (categorías), 8b (transacciones) |

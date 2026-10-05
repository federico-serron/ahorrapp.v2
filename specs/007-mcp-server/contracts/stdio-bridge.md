# Contract — Puente stdio: `ahorrapp_mcp_bridge.py`

**Spec**: [../spec.md](../spec.md) (FR-023) | **Decisión**: [../research.md](../research.md) (9)

Un comando local que el cliente de IA lanza como subproceso. Existe para los clientes que no
permiten configurar encabezados HTTP a mano. No implementa el protocolo: es un **reenviador ciego**
de JSON-RPC.

**Archivo**: `backend/tools/ahorrapp_mcp_bridge.py` — biblioteca estándar únicamente
(`sys`, `json`, `os`, `urllib.request`). No importa nada de `app/`, así que se puede copiar sola a
otra máquina.

---

## Configuración en el cliente

```json
{
  "mcpServers": {
    "ahorrapp": {
      "command": "python",
      "args": ["/ruta/absoluta/a/backend/tools/ahorrapp_mcp_bridge.py"],
      "env": {
        "AHORRAPP_TOKEN": "ahorr_pat_...",
        "AHORRAPP_URL": "https://mi-ahorrapp.com/mcp"
      }
    }
  }
}
```

Esta forma (`command` / `args` / `env`) es la misma en Claude Desktop, Cursor, VS Code, Zed,
Continue y los CLI. Algunos clientes usan la clave `servers` en vez de `mcpServers` y piden
`"type": "stdio"`; el contrato del puente no cambia.

### Variables de entorno

| Variable | Requerida | Default | Notas |
|---|---|---|---|
| `AHORRAPP_TOKEN` | **Sí** | — | El token personal. Si falta, el puente escribe el error en stderr y sale con código 1. |
| `AHORRAPP_URL` | No | `http://localhost:5100/mcp` | Endpoint completo, incluido `/mcp`. |
| `AHORRAPP_TIMEOUT` | No | `35` | Segundos. Por encima del timeout de 30 s de `n8n_service`, para que un `create_transaction` lento falle del lado del servidor y no acá. |

El token va en `env` y **no** en la línea de comandos: los argumentos de un proceso son visibles
para cualquier otro proceso del sistema (`ps`), las variables de entorno no.

---

## Comportamiento

Bucle sobre stdin, **una línea = un mensaje JSON-RPC**:

1. Lee una línea. EOF ⇒ sale con código 0 (el cliente cerró; es la terminación normal).
2. La reenvía tal cual como cuerpo de un `POST` a `AHORRAPP_URL`, con los encabezados:
   `Authorization: Bearer $AHORRAPP_TOKEN`, `Content-Type: application/json`,
   `Accept: application/json, text/event-stream`, `MCP-Protocol-Version` copiado del
   `params._meta` del mensaje si está presente.
3. Escribe el cuerpo de la respuesta en stdout **como una sola línea**, y hace `flush()`.
4. Si la respuesta es `202` sin cuerpo (una notificación), **no escribe nada** y sigue.

El puente **no interpreta** el contenido: no conoce los tools, no valida el esquema, no mantiene
estado. Eso es posible porque el transporte es stateless y responde siempre JSON (Decisión 2): no
hay sesiones, ni SSE, ni reconexión que manejar.

### Reglas de corrección que la implementación debe respetar

- **`flush()` después de cada escritura.** Sin eso el cliente se queda esperando una respuesta que
  está en el buffer, y el síntoma es un servidor que "no responde" sin ningún error.
- **Nada que no sea JSON-RPC puede salir por stdout.** stdout es el canal del protocolo: un `print`
  de depuración ahí corrompe la sesión. Todo diagnóstico va a **stderr**, que los clientes muestran
  en sus logs.
- **El token nunca se escribe en stderr**, ni en un mensaje de error ni en un volcado del request.
- **Una línea de entrada produce como máximo una línea de salida**, sin saltos de línea internos
  (`json.dumps` sin `indent`).

### Errores

| Situación | Qué hace |
|---|---|
| Falta `AHORRAPP_TOKEN` | Mensaje a stderr, `exit(1)`. Falla rápido y visible, en vez de dar `401` en cada llamada. |
| El backend no responde / timeout | Devuelve por stdout un error JSON-RPC `-32603` (`Internal error`) con el `id` del request, para que el cliente reciba *algo* y no cuelgue. |
| HTTP `401` | Reenvía el cuerpo del backend tal cual (`{"error": "Credencial inválida."}`). El puente no reinterpreta ni reintenta. |
| Línea de stdin que no es JSON válido | Error JSON-RPC `-32700` (`Parse error`) con `id: null`. No se reenvía al backend. |

---

## Lo que este contrato NO cubre

- **Clientes alojados** (conectores de ChatGPT, Claude.ai web y móvil). No pueden lanzar un proceso
  local, así que el puente no les sirve. Necesitan OAuth 2.1 con descubrimiento RFC 9728, que está
  fuera de alcance de 007 (ver Assumptions de la spec y Decisión 9).
- **Renovación de credenciales.** El token es de larga duración y se revoca desde la app; el puente
  no refresca nada.

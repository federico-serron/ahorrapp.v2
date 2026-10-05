# Phase 1 — Data Model: Rechazar texto que no describe una transacción

**Fecha**: 2026-10-05 | **Spec**: [spec.md](./spec.md) | **Contrato**: [contracts/ai-interpretation.md](./contracts/ai-interpretation.md)

## Alcance del cambio de esquema

**Ninguno.** No hay tablas nuevas, columnas nuevas ni migraciones de Alembic.

Lo que cambia es **cuándo** se crea una `Transaction`, no su forma. Esto mantiene el arreglo dentro
del Principio IX de la constitución sin necesidad de aprobación de cambio estructural.

| Modelo | Cambio |
|---|---|
| `Transaction` | Ninguno. Mismos campos, mismo `serialize()`, misma semántica de signo (negativo = gasto). |
| `User` | Ninguno. |
| `Category` | Ninguno. Se sigue leyendo la lista del usuario para pasarla al servicio de interpretación. |

**No hace falta correr `flask db migrate`.** Si una tarea lo sugiere, es un error: revisar este
documento.

---

## Estados de un envío del usuario

Lo que el arreglo introduce es un estado terminal nuevo — **rechazado** — que antes no existía.

```text
  el usuario envía texto
            │
            ▼
   ┌──────────────────┐
   │  interpretación  │
   └──────────────────┘
       │          │
       │          └──────────────▶ RECHAZADO (nuevo)
       │                           · error visible al usuario
       │                           · texto conservado en el campo
       ▼                           · cero filas escritas
   REGISTRADO                      · cero cambios en totales
   · una fila en Transaction
   · toast de confirmación
   · campo limpiado
```

**Invariante que el arreglo tiene que preservar (FR-016, SC-004)**: la rama RECHAZADO no escribe
nada. Se cumple por construcción, no por un rollback: toda la validación ocurre dentro de
`parse_transaction_via_n8n`, que `create_transaction_service` invoca **antes** de construir el
objeto `Transaction` y antes de cualquier `db.session.add()`. No hay escritura que deshacer.

**Invariante de FR-009 / SC-005**: como máximo una `Transaction` por envío. También se cumple por
construcción: `create_transaction_service` crea exactamente un objeto y hace un solo `commit`. El
riesgo real no es que el backend cree dos, sino que el texto del usuario induzca a la IA a proponer
una transacción distinta de la que describió — y eso lo cubre FR-008 en el prompt del workflow más
el rechazo del backend.

---

## Objeto de transferencia (no persistido)

La respuesta del servicio de interpretación. No es una entidad: vive durante un request.

**Forma de aceptación**:

```text
{ is_transaction: true, description: str, amount: number > 0, category: str, is_income: bool }
```

**Forma de rechazo**:

```text
{ is_transaction: false, rejection_reason: "not_a_transaction" | "missing_amount" }
```

Reglas de interpretación, validación y el orden en que se evalúan: ver
[contracts/ai-interpretation.md](./contracts/ai-interpretation.md). El punto a no perder de vista es
que `is_transaction` **no** se lee con `bool()`: en Python `bool("false") is True`, y ese descuido
registraría exactamente las entradas que el arreglo tiene que rechazar.

---

## Registro de rechazos (FR-018)

Los rechazos se registran con `current_app.logger` — nivel `warning` para un rechazo de
clasificación, `exception` para una respuesta inválida o un fallo del servicio.

**No se crea ninguna tabla para esto.** FR-018 pide poder medir falsos rechazos y detectar intentos
de manipulación; los logs del servidor alcanzan para ambas cosas y no tocan el esquema. Una tabla de
auditoría sería un cambio de modelo que el Principio IX exige aprobar, y no hace falta para cumplir
el requisito.

Lo que se loguea: el motivo del rechazo y el texto recortado. Lo que **no**: la respuesta cruda del
servicio externo en el mensaje devuelto al usuario (Principio IV) — eso va solo al log.

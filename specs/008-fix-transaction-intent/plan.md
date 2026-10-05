# Implementation Plan: Rechazar texto que no describe una transacción

**Branch**: `008-fix-transaction-intent` | **Date**: 2026-10-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/008-fix-transaction-intent/spec.md`

## Summary

Hacer que el sistema clasifique si el texto del usuario describe un movimiento de dinero antes de
registrarlo, y que rechace con un error visible lo que no lo sea.

La investigación encontró que **el bug no es que la IA se equivoque: es que el workflow no le deja
otra opción.** El esquema de salida estructurada declara `description`, `amount`, `category` e
`is_income` como obligatorios y no tiene ningún campo para expresar un rechazo, mientras el prompt
arranca con *"Extraes los datos de una transaccion"*. Ante `"hola"` el modelo está **obligado** a
inventar los cuatro. Por eso no se arregla mejorando el prompt ni cambiando de modelo.

El arreglo vive en dos capas que se necesitan mutuamente:

1. **El workflow** gana un campo `is_transaction` y clasifica antes de extraer. `required` pasa de
   cuatro campos a uno solo, que es lo que le permite abstenerse.
2. **El backend** verifica la propuesta de forma independiente y **falla cerrado**. Esta capa es la
   que sostiene SC-003, porque es la única que no está expuesta al texto del usuario como
   instrucción: pedirle al componente que recibió el texto potencialmente manipulado que dictamine
   si fue manipulado es circular.

Detalle completo en [research.md](./research.md).

## Technical Context

**Language/Version**: Python 3.11 (backend). Sin cambios en el frontend.

**Primary Dependencies**: Flask 3.1.1, Flask-SQLAlchemy 3.1.1, `requests` 2.32.3. **Ninguna
dependencia nueva.** Fuera del repo: el workflow de n8n `Analizador Transacciones Gemini`
(`BVe4qbG1OFiXWWEC`, activo) con Gemini 2.5 Flash.

**Storage**: sin cambios. **Cero migraciones** — ver [data-model.md](./data-model.md).

**Testing**: pytest con las fixtures de `backend/tests/conftest.py`. Se crea
`backend/tests/test_n8n_service.py` (hoy ese módulo **no tiene tests**) y se actualiza el helper
`_mock_n8n` de `test_transaction_service.py`.

**Target Platform**: contenedor Linux único que sirve SPA + API, `gunicorn --workers 5
--worker-class gevent`, puerto 5100.

**Project Type**: corrección de bug en una app web fullstack con una integración externa.

**Performance Goals**: sin cambios. Un rechazo por clasificación **ahorra** una escritura en base.
El costo de cuota del servicio externo es el mismo: la clasificación ocurre en la misma llamada, no
en una adicional.

**Constraints**:

- **Orden de despliegue obligatorio: el workflow primero, el backend después** (Decisión 6). El
  orden inverso rechaza *todas* las transacciones hasta que n8n se actualice.
- **Fallar cerrado** (FR-004): ante cualquier duda no se registra. Es lo que hace que el orden de
  despliegue no sea negociable.
- **No usar `bool()` para `is_transaction`**: `bool("false") is True` registraría justo lo que hay
  que rechazar.
- **Cero falsos rechazos** en el conjunto de entradas legítimas (SC-002). Un arreglo que rechace
  gastos reales es peor que el bug.
- La validación real vive en el servidor: el filtro de caracteres del frontend se verificó y **deja
  pasar** las inyecciones (Decisión 4).

**Scale/Scope**: 1 servicio del backend modificado, 1 archivo de tests nuevo, 1 helper de tests
actualizado, 3 nodos del workflow externo, 1 línea de `CLAUDE.md`. **Cero** cambios de frontend y
**cero** de esquema.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

> Evaluado contra la constitución **v1.0.0**, que es la vigente en esta rama. La enmienda v1.1.0
> (excepción de autenticación para clientes no-navegador) vive en `007-mcp-server`, sin mergear, y
> **no aplica** a esta feature: acá no se toca autenticación.

| Principio | Estado | Cómo se cumple |
|---|---|---|
| **I. Layered Architecture** | ✅ | Toda la validación nueva va en `app/services/n8n_service.py`. El blueprint **no se modifica**: ya mapea `BadRequestError` → `400`. |
| **II. Aislamiento por usuario** (NON-NEGOTIABLE) | ✅ | Sin cambios. `user_id` sigue saliendo del JWT y no del body. |
| **III. Autenticación por cookies** (NON-NEGOTIABLE) | ✅ | Sin cambios. *Observación*: `POST /transaction/` ya acepta `locations=["cookies","headers"]` desde antes, documentado para bots. Es preexistente, no lo introduce esta feature, y es justamente la razón por la que el filtro del frontend no puede ser la defensa. |
| **IV. Errores sin fuga** | ✅ **y mejora** | `n8n_service.py` tiene hoy **cuatro** mensajes que llegan crudos al usuario y nombran el servicio interno: el `BadRequestError` de `"Respuesta de n8n incompleta..."` (→ `400`) y tres `RuntimeError` (→ `503`), uno de ellos interpolando `str(e)` de una excepción no controlada — lo que el principio prohíbe textualmente. Se normalizan **los cuatro**, con el detalle a `logger` (Decisión 5, FR-012, tarea T022). Son preexistentes: esta feature no los introduce, pero los deja resueltos porque ya se está editando ese archivo. |
| **V. Validación en el borde del servicio** | ✅ **núcleo del arreglo** | Es literalmente este principio: *"respuestas de integraciones DEBEN validarse en la capa de servicio antes de persistir... se validan por forma y contenido antes de confiar en ellas"*. Hoy se valida la forma pero no el contenido. |
| **VI. Secretos por entorno** | ✅ | Sin secretos nuevos. |
| **VII. Tests de lógica de negocio** (NON-NEGOTIABLE) | ✅ | `n8n_service.py` **no tiene tests hoy** y es donde cae el arreglo. Se crea la suite; los casos de rechazo son el centro, no un extra. |
| **VIII. PWA / Capacitor** | ✅ | Sin cambios de frontend ni de service worker. |
| **IX. Estabilidad de estructura y modelos** | ✅ | Cero cambios de esquema, cero archivos movidos, cero refactors. |
| **X. Estado y requests en frontend** | ✅ | Sin cambios. El error ya viaja por `store.error` y se muestra con un toast; el campo ya conserva el texto al fallar. |

**Sin violaciones.** No hace falta llenar Complexity Tracking.

### Re-evaluación post-diseño (Phase 1)

Sin violaciones nuevas. Tres notas que aparecieron al diseñar:

- **`is_income` queda sin endurecer a propósito.** Comparte la trampa de `bool()` con
  `is_transaction`, pero arreglarlo acá mezclaría dos alcances y ampliaría la superficie de un fix
  de bug. Queda anotado como deuda conocida en el contrato.
- **El fallback de categoría a `available_categories[0]` se mantiene.** Para una transacción que ya
  pasó todas las verificaciones es un comportamiento razonable; cambiarlo es otro alcance.
- **FR-018 se cumple con logs, no con una tabla.** Una tabla de auditoría sería un cambio de modelo
  que el Principio IX exige aprobar, y no hace falta para medir falsos rechazos.

## Project Structure

### Documentation (this feature)

```text
specs/008-fix-transaction-intent/
├── spec.md
├── plan.md                        # Este archivo
├── research.md                    # Phase 0 — 7 decisiones
├── data-model.md                  # Phase 1 — sin cambios de esquema
├── quickstart.md                  # Phase 1 — validación end-to-end
├── contracts/
│   └── ai-interpretation.md       #   el contrato que cambia
├── checklists/
│   └── requirements.md
└── tasks.md                       # Phase 2 — lo crea /speckit-tasks
```

### Source Code (repository root)

```text
backend/
├── app/
│   └── services/
│       └── n8n_service.py              # MODIFICADO: clasificación + verificación independiente
└── tests/
    ├── test_n8n_service.py             # NUEVO: no existía suite para este módulo
    └── test_transaction_service.py     # MODIFICADO: actualizar el helper _mock_n8n

CLAUDE.md                               # MODIFICADO: la sección "Contrato n8n"
```

**Fuera del repositorio** (workflow `BVe4qbG1OFiXWWEC` en n8n):

| Nodo | Cambio |
|---|---|
| `Structured Output Parser` | `required` pasa de 4 campos a solo `is_transaction`; se agregan `is_transaction` y `rejection_reason` |
| `Basic LLM Chain` (prompt) | Clasificar primero, extraer después; nunca inventar importe; el texto es dato, no instrucción |
| `Normalizar y validar` (Code) | Bifurca según `is_transaction`; devuelve rechazo en vez de lanzar error |

**Structure Decision**: se mantiene la estructura existente sin tocar nada
(`routes/` → `services/` → `models.py`). El arreglo entra en **un solo archivo** del backend,
porque `parse_transaction_via_n8n` ya es el único punto por donde pasa toda respuesta del servicio
externo — es el borde correcto según el Principio V. No se agrega ni un archivo de producción.

Lo que **no** se modifica, y vale decirlo porque sería lo intuitivo:

- **`transaction_bp.py`**: ya mapea `BadRequestError` → `400` devolviendo `str(e)`. Con los mensajes
  nuevos eso ya es apto para mostrar al usuario.
- **`transaction_service.py`**: llama a `parse_transaction_via_n8n` **antes** de construir la
  `Transaction`, así que un rechazo no llega nunca a `db.session.add()`. FR-016 se cumple por
  construcción.
- **El frontend**: ya muestra `store.error` con un toast y ya conserva el texto del campo al fallar.

## Orden de implementación

**El orden de los pasos 4 y 5 no es negociable** (Decisión 6).

| Paso | Qué | Por qué en este punto |
|---|---|---|
| 1 | Suite nueva `test_n8n_service.py` con los casos del contrato (fallando) | Define el comportamiento esperado antes de tocar el código |
| 2 | Validación nueva en `n8n_service.py`: parseo estricto, fallar cerrado, `amount > 0`, mensajes de usuario | El arreglo del backend |
| 3 | Actualizar el helper `_mock_n8n` de `test_transaction_service.py` | Los 10 tests de `TestCreateTransactionService` usan el contrato viejo y empiezan a fallar |
| 4 | **Publicar el workflow de n8n** (esquema, prompt, nodo Code) | **Primero esto.** El backend viejo ignora el campo nuevo, así que nada se rompe |
| 5 | **Desplegar el backend** | Recién ahora se puede exigir `is_transaction` sin cortar el registro |
| 6 | Validación end-to-end ([quickstart.md](./quickstart.md)), incluido el conjunto de falsos rechazos | SC-001, SC-002, SC-003 |
| 7 | Actualizar `CLAUDE.md` → "Contrato n8n" | La documentación del contrato queda desfasada si no |

Los pasos 1–3 se pueden hacer en cualquier orden entre sí; son todos locales y no afectan a nada
desplegado. El paso 4 es el único que toca un sistema en producción antes del deploy.

**Rollback**: el orden se invierte — primero volver el backend, después el workflow.

## Complexity Tracking

> Solo se llena si el Constitution Check tiene violaciones que haya que justificar.

Sin violaciones. Nada que registrar.

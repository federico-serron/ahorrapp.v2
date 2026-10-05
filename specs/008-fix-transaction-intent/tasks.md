---
description: "Task list for feature implementation"
---

# Tasks: Rechazar texto que no describe una transacción

**Input**: Design documents from `/specs/008-fix-transaction-intent/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: **Incluidos y obligatorios.** El Principio VII de la constitución es NON-NEGOTIABLE y
exige tests para todo método de `services/` con validación o regla de negocio. Acá además
`n8n_service.py` **no tiene ninguna suite hoy** (Decisión 7) y es el archivo donde cae todo el
arreglo. Y los casos de rechazo no son un extra: **son la feature**.

**Organization**: agrupadas por user story, para que cada una se implemente y se pruebe por
separado.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: puede correr en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: a qué user story pertenece (US1, US2, US3)
- Cada tarea lleva la ruta exacta del archivo

## Path Conventions

Estructura existente sin alteraciones (Principio IX). **Cero migraciones, cero archivos de
producción nuevos, cero cambios de frontend.**

- Backend: `backend/app/services/n8n_service.py`, `backend/tests/`
- Externo: workflow de n8n `Analizador Transacciones Gemini` (`BVe4qbG1OFiXWWEC`)

---

## Phase 1: Setup

**Purpose**: los corpus fijos de entradas que miden SC-001 y SC-002, y el mock de la respuesta del
webhook. Todo lo demás se apoya en esto.

- [X] T001 Crear `backend/tests/test_n8n_service.py` con: el helper que mockea la respuesta HTTP del webhook (parcheando `requests.post` en `app.services.n8n_service`, sin llamadas de red reales), y **dos corpus fijos como constantes de módulo** — `CORPUS_RECHAZO` (saludos, preguntas e instrucciones dirigidas a la IA, tomados del escenario 1 de [quickstart.md](./quickstart.md)) y `CORPUS_LEGITIMO` (las 10 redacciones del escenario 2). Son los conjuntos con los que se miden SC-001 y SC-002, así que viven en un solo lugar
- [X] T002 [P] ~~Actualizar el helper `_mock_n8n(...)` para que devuelva `is_transaction: True`~~ — **resultó un no-op**: esos tests mockean `parse_transaction_via_n8n` (su *salida*), no el payload crudo del webhook, y esa función nunca devuelve `is_transaction`. Agregar la clave habría sido código muerto. Se documentó el límite del mock en su docstring. **Es seguro hacerlo ahora**: el backend todavía no lee ese campo y lo ignora, así que los 10 tests de `TestCreateTransactionService` siguen pasando

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: el parseo estricto del booleano y el cambio del workflow. Las tres user stories
dependen de ambos.

**⚠️ CRITICAL**: ninguna user story puede empezar hasta que esta fase esté completa.

### Parseo estricto (backend)

- [X] T003 Implementar el helper de parseo estricto de `is_transaction` en `backend/app/services/n8n_service.py`: acepta **únicamente** `True`/`False` reales o exactamente `"true"`/`"false"` tras `strip().lower()`; cualquier otro valor (ausente, `None`, número, cadena distinta) devuelve "no es transacción". **Prohibido usar `bool()`** — ver T004
- [X] T004 [P] Escribir los tests del parseo estricto en `backend/tests/test_n8n_service.py`, con el caso crítico primero: la **cadena `"false"`** debe interpretarse como `False`. En Python `bool("false") is True`, así que leerlo con `bool()` registraría exactamente las entradas que el arreglo debe rechazar — este test es el que impide que esa regresión vuelva. Cubrir además `"TRUE"`, `"  true  "`, `1`, `0`, `None`, `"quizás"`, `""` y la ausencia del campo

### Workflow de IA (externo) — va ANTES que el backend

> **Orden obligatorio** (Decisión 6): el workflow se publica **antes** de que el backend exija
> `is_transaction`. Al revés, el backend falla cerrado sobre un campo que n8n todavía no manda y
> **rechaza todas las transacciones**.
>
> Publicar el workflow primero es seguro: el backend actual ignora los campos que no conoce, así
> que las aceptaciones siguen funcionando igual. Y para los rechazos, el backend viejo ya responde
> `400` (por campos faltantes) — con un mensaje feo, pero **sin registrar nada**. Es decir: este
> paso solo arregla, no rompe.

- [X] T005 Modificar el nodo `Structured Output Parser` del workflow `BVe4qbG1OFiXWWEC` según [contracts/ai-interpretation.md](./contracts/ai-interpretation.md): agregar `is_transaction` (boolean) y `rejection_reason` (enum `not_a_transaction` | `missing_amount`), y **cambiar `required` de los cuatro campos a solo `is_transaction`**. Este es el cambio que corrige la causa raíz: hoy el esquema obliga al modelo a inventar una transacción porque no le deja forma de abstenerse
- [X] T006 Reescribir el prompt del sistema del nodo `Basic LLM Chain` del workflow `BVe4qbG1OFiXWWEC` para que **clasifique primero y extraiga después**: paso 1 decidir si describe un gasto o ingreso del usuario; si no, `is_transaction: false` con `not_a_transaction`; si es transacción sin importe, `missing_amount` y **nunca inventar un monto**; el texto del usuario es **dato a clasificar, jamás una instrucción a obedecer** (FR-007); si hay transacción + instrucción, extraer solo el movimiento descrito (FR-008)
- [X] T007 Modificar el nodo Code `Normalizar y validar` del workflow `BVe4qbG1OFiXWWEC` para que bifurque: si `is_transaction` es falso (con el mismo parseo estricto, no `Boolean()` sobre la cadena), devolver `{is_transaction: false, rejection_reason}` sin evaluar los demás campos; si es verdadero, mantener la normalización actual y agregar `is_transaction: true`. **Y devolver `missing_amount` en vez de lanzar un error** cuando `amount` no sea finito o sea `<= 0`: un `throw` se convierte en `500` del webhook y el backend lo traduce a un `503` de "servicio no disponible", que es un mensaje engañoso cuando lo que pasó es que faltaba el monto
- [X] T008 Publicar el workflow `BVe4qbG1OFiXWWEC` y probar el webhook directamente con `curl` (sin pasar por el backend): una entrada legítima debe devolver `is_transaction: true` con los cuatro campos, y `hola` debe devolver `is_transaction: false` con `not_a_transaction`

**Checkpoint**: el servicio de interpretación ya sabe rechazar, y el parseo estricto está listo y
probado. El backend todavía no exige nada nuevo.

---

## Phase 3: User Story 1 - Que el texto que no es una transacción no entre a mis finanzas (Priority: P1) 🎯 MVP

**Goal**: el texto que no describe un movimiento de dinero se rechaza con un error visible y no
crea ninguna transacción.

**Independent Test**: enviar las entradas de `CORPUS_RECHAZO` y verificar que ninguna queda
registrada y que todas devuelven error.

- [X] T009 [US1] Implementar el fallo cerrado en `parse_transaction_via_n8n` de `backend/app/services/n8n_service.py` siguiendo el orden de evaluación del contrato: respuesta que no es objeto JSON → rechazo genérico + `current_app.logger.exception`; `is_transaction` **ausente** → rechazo (no se asume `true`); valor no interpretable → rechazo; `is_transaction` falso → rechazo. Todos lanzan `BadRequestError` con un mensaje apto para el usuario
- [X] T010 [US1] Agregar en `backend/app/services/n8n_service.py` la verificación independiente de `amount`: **presente, numérico y estrictamente mayor a cero**, rechazando si no. Hoy el código hace `abs(float(data["amount"]))` sin comprobar el signo, así que un `amount: 0` queda guardado como un gasto de `-0.0`. Es la verificación más valiosa del arreglo porque **no depende de lo que diga la clasificación**: atrapa el caso aunque la IA afirme que es una transacción
- [X] T011 [US1] Agregar en `backend/app/services/n8n_service.py` la verificación de `description` no vacía tras `strip()`, y la de campos requeridos presentes, rechazando en ambos casos
- [X] T012 [US1] Implementar el registro de rechazos en `backend/app/services/n8n_service.py` (**FR-018**): cada rechazo emite un `current_app.logger.warning` con el motivo (`not_a_transaction`, `missing_amount`, campo ausente, booleano no interpretable, importe no positivo, descripción vacía) y el `raw_input` recortado; una respuesta inválida o un fallo del servicio usan `logger.exception`. **No se crea ninguna tabla**: FR-018 pide poder medir falsos rechazos y detectar manipulación, y los logs del servidor alcanzan para las dos cosas sin tocar el esquema (ver [data-model.md](./data-model.md)). Sin esto, SC-002 solo se puede verificar el día del deploy y nunca después
- [X] T013 [P] [US1] Escribir en `backend/tests/test_n8n_service.py` los tests de **todas** las filas de rechazo de la tabla del contrato: sin `is_transaction`; `"false"` con los 4 campos válidos; `"quizás"`; `1`; `None`; `is_transaction: true` con `amount` en `0`, `-50` y `"abc"`; `description` en blanco; campos faltantes; respuesta no-JSON. Cada uno debe lanzar `BadRequestError`, y cada uno debe emitir el log de T012 con su motivo (FR-018). **Esto es el escenario 5 de [quickstart.md](./quickstart.md)**: correrlo acá, no después del deploy — está mockeado y no lo necesita
- [X] T014 [P] [US1] Escribir en `backend/tests/test_transaction_service.py` el test de que un rechazo **no escribe en la base**: contar `Transaction` antes y después de un `create_transaction_service` que termina en rechazo, y verificar que el conteo no cambió (FR-016, SC-004). Agregar en el mismo test el invariante de **FR-009 / SC-005**: con una respuesta simulada de texto mixto, el delta de filas es **0 o 1, nunca 2**. Es el invariante que una instrucción dentro del texto intenta romper, así que no alcanza con que hoy se cumpla por construcción
- [X] T015 [P] [US1] Escribir en `backend/tests/test_n8n_service.py` el test parametrizado sobre `CORPUS_RECHAZO`: para cada entrada, con el webhook mockeado devolviendo la clasificación negativa, `parse_transaction_via_n8n` lanza `BadRequestError` (SC-001)
- [ ] T016 [US1] Desplegar el backend y ejecutar los escenarios 1, 4 y 8 de [quickstart.md](./quickstart.md), anotando los resultados. El escenario 8 es el que confirma que la decisión vive en el servidor y no en el filtro del navegador, y el `999999` del escenario 1 es el que sostiene SC-003. (El escenario 5 ya corrió en T013: está mockeado y no depende del deploy)

**Checkpoint**: el bug está arreglado. Es el MVP desplegable.

---

## Phase 4: User Story 2 - Que lo que sí es una transacción siga funcionando igual (Priority: P1)

**Goal**: las entradas legítimas se siguen registrando exactamente como antes, sin fricción nueva.

**Independent Test**: enviar las 10 redacciones de `CORPUS_LEGITIMO` y verificar que las 10 se
registran con el signo y la categoría correctos — **cero rechazos**.

> Tiene la misma prioridad que US1 a propósito: un arreglo que rechace gastos reales es **peor** que
> el bug, porque rompe la función central del producto y entrena al usuario a desconfiar del campo.

- [X] T017 [US2] Verificar en `backend/app/services/n8n_service.py` que el camino de aceptación quedó intacto: se mantiene el fallback de categoría a `available_categories[0]` con su `logger.warning`, se mantiene el parseo actual de `is_income`, y se siguen devolviendo `description` recortada a 50, `amount` positivo y `category` resuelta. **No endurecer `is_income` acá**: comparte la trampa de `bool()` pero es otro alcance y está anotado como deuda conocida en el contrato
- [X] T018 [P] [US2] Escribir en `backend/tests/test_n8n_service.py` los tests de las filas de **aceptación** del contrato: `is_transaction: true` con los 4 campos válidos devuelve el gasto; la cadena exacta `"true"` **también se acepta**; `is_income: true` devuelve el ingreso; una categoría que no está en la lista cae al fallback sin rechazar
- [X] T019 [US2] Correr `pytest tests/test_transaction_service.py -v` desde `backend/` y confirmar que los 10 tests de `TestCreateTransactionService` pasan con el helper actualizado en T002
- [ ] T020 [US2] Ejecutar el escenario 2 de [quickstart.md](./quickstart.md) con las 10 entradas legítimas y verificar **cero rechazos** (SC-002). Cualquier rechazo acá es un bug del arreglo: anotarlo y corregir antes de seguir

**Checkpoint**: el arreglo no rompió el uso normal.

---

## Phase 5: User Story 3 - Entender por qué fue rechazado y qué escribir (Priority: P2)

**Goal**: el mensaje de rechazo le dice al usuario qué se espera y le da un ejemplo, distinguiendo
el caso "no es una transacción" del caso "falta el importe".

**Independent Test**: mostrarle un rechazo a alguien que no conoce la app y confirmar que su
siguiente intento es una transacción bien formada.

- [X] T021 [US3] Definir en `backend/app/services/n8n_service.py` los mensajes de usuario como constantes y mapearlos desde `rejection_reason`: `not_a_transaction` → "Eso no parece un gasto ni un ingreso. Probá algo como: «gasté 850 en el super»."; `missing_amount` → "No pude identificar el importe. Probá incluirlo, por ejemplo: «gasté 850 en el super»."; un código desconocido cae en `not_a_transaction`. El motivo **nunca** se concatena crudo: se usa para **elegir** un mensaje nuestro
- [X] T022 [US3] Normalizar **los cuatro** mensajes de `backend/app/services/n8n_service.py` que hoy llegan crudos al usuario, dejando el detalle en `current_app.logger`: el `BadRequestError` de `"Respuesta de n8n incompleta. Faltan campos: {...}"` (→ `400`), y los tres `RuntimeError` de las líneas 49-53 (→ `503` vía el blueprint): `"Timeout al conectar con n8n..."`, `f"n8n respondió con error {status}"` y `f"No se pudo conectar con n8n: {str(e)}"`. **El último es el más grave**: interpola `str(e)` de una excepción no controlada, que es exactamente lo que el Principio IV prohíbe, y puede incluir la URL completa del webhook. Los cuatro nombran el servicio interno. Dejar tres intactos a tres líneas del que sí se arregla sería un medio arreglo (hallazgo C1 del análisis)
- [X] T023 [P] [US3] Escribir en `backend/tests/test_n8n_service.py` los tests de los mensajes: un rechazo por clasificación devuelve el mensaje de "no parece un gasto"; uno por importe devuelve el de importe; y **ningún** mensaje de excepción contiene las cadenas `n8n`, `is_transaction`, `rejection_reason`, `Gemini`, la URL del webhook ni rastros de traceback. Cubrir **las dos vías**: los `BadRequestError` (→ `400`) y los tres `RuntimeError` (→ `503`), simulando timeout, error HTTP del webhook y fallo de conexión
- [ ] T024 [US3] Ejecutar los escenarios 3 y 6 de [quickstart.md](./quickstart.md): los tres casos sin importe dan el mensaje correcto, `compré café 1200` **sí** se registra después (SC-006), y ningún mensaje filtra detalles internos

**Checkpoint**: las 3 user stories funcionan de forma independiente.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T025 Correr `pytest -q` completo desde `backend/` y confirmar cero regresiones (SC-007), releyendo antes la cabecera de `backend/tests/conftest.py` sobre el `drop_all()`
- [ ] T026 Ejecutar el escenario 7 de [quickstart.md](./quickstart.md): verificar a mano que listar con paginación, editar, eliminar, las analíticas por rango y el CRUD de categorías siguen funcionando. Este arreglo toca el camino de creación, así que la regresión plausible está ahí al lado
- [ ] T027 [P] Actualizar la sección "Contrato n8n" de `CLAUDE.md` con el contrato nuevo de [contracts/ai-interpretation.md](./contracts/ai-interpretation.md): la forma de aceptación con `is_transaction`, la de rechazo con `rejection_reason`, y la advertencia de no leer el booleano con `bool()`
- [ ] T028 [P] Actualizar `.claude/memory/project-state.md`: la feature 008, la causa raíz (el esquema de salida obligaba a inventar una transacción), el orden de despliegue workflow→backend, y la deuda conocida de `is_income` sin endurecer
- [ ] T029 Marcar el checklist de Success Criteria de [quickstart.md](./quickstart.md) con los resultados de los 7 SC

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: sin dependencias. T001 y T002 pueden hacerse en paralelo.
- **Phase 2 (Foundational)**: depende de T001 para T004. **Bloquea todas las user stories.**
  Contiene el cambio del workflow, que **debe publicarse antes** del deploy del backend.
- **Phase 3 (US1)**: depende de Phase 2 completa. **T016 (deploy del backend) no puede ejecutarse
  antes de T008 (publicación del workflow)** — es el orden de la Decisión 6.
- **Phase 4 (US2)**: depende de Phase 2. Independiente de US1 en el código, pero en la práctica se
  valida junto con US1 porque comparten el mismo deploy.
- **Phase 5 (US3)**: depende de Phase 2. Independiente de US1 y US2: US1 ya deja un mensaje visible,
  US3 lo vuelve útil y distinguible.
- **Phase 6 (Polish)**: depende de las user stories que se quieran entregar.

### User Story Dependencies

- **US1 (P1)**: arranca tras Phase 2. Sin dependencias de otras stories. Es el MVP.
- **US2 (P1)**: arranca tras Phase 2. No agrega código de producción nuevo — es verificación de que
  el camino de aceptación sobrevivió.
- **US3 (P2)**: arranca tras Phase 2. Refina los mensajes que US1 ya hizo aparecer.

### Within Each User Story

- Tests del contrato → validación en el service → deploy → validación manual
- Los tests se escriben junto con el código, no después de mergear (Principio VII)

### Parallel Opportunities

- **Phase 1**: T001 y T002 en paralelo (archivos distintos).
- **Phase 2**: T003 y T004 en paralelo con T005–T007 (backend vs. workflow externo, sin
  solapamiento). T008 va después de T005, T006 y T007.
- **Phase 3**: T013, T014 y T015 en paralelo entre sí. T009, T010 y T011 tocan **el mismo archivo**:
  secuenciales.
- **Phase 4**: T018 en paralelo con T019.
- **Phase 6**: T027 y T028 en paralelo.
- **Phases 4 y 5** se pueden hacer en paralelo entre sí, coordinando el merge de
  `n8n_service.py` y `test_n8n_service.py`.

---

## Parallel Example: Phase 2

```bash
# Dos frentes que no se tocan: backend local y workflow externo.
Task: "T003 Parseo estricto en backend/app/services/n8n_service.py"
Task: "T004 Tests del parseo estricto en backend/tests/test_n8n_service.py"
Task: "T005 Esquema del Structured Output Parser en el workflow BVe4qbG1OFiXWWEC"
Task: "T006 Prompt del Basic LLM Chain en el workflow BVe4qbG1OFiXWWEC"
```

---

## Implementation Strategy

### MVP First (US1)

1. Phase 1: corpus y mocks.
2. Phase 2 completa — **incluido publicar el workflow (T008) antes de tocar el backend**.
3. Phase 3 (US1).
4. **PARAR Y VALIDAR**: el escenario 5 ya corrió como tests en T013 — es el más valioso de todos
   porque no depende de que el modelo clasifique bien: verifica la capa que sostiene SC-003 aunque
   la IA mienta o haya sido manipulada. Después del deploy, los escenarios 1, 4 y 8.
5. Desplegable: el bug arreglado.

### Incremental Delivery

1. Setup + Foundational → el workflow ya sabe rechazar, el backend sin cambios
2. + US1 → el texto que no es transacción deja de entrar (**MVP**)
3. + US2 → confirmado que las entradas legítimas siguen funcionando
4. + US3 → mensajes útiles y sin fuga de información
5. Polish → regresiones y documentación

---

## Notes

- Las tareas `[P]` tocan archivos distintos y no dependen entre sí.
- **El orden workflow → backend no es negociable** (Decisión 6). T008 antes de T016.
- **Cero migraciones.** Si alguna tarea parece pedir `flask db migrate`, es un error: ver
  [data-model.md](./data-model.md). Tampoco hay cambios de frontend ni dependencias nuevas.
- Los dos invariantes a no postergar: **SC-003** (ningún intento de manipulación crea un registro,
  T013 y T015) y **SC-002** (cero falsos rechazos, T020) — el segundo es el que evita que el
  arreglo deje la app peor que el bug.
- El test de la cadena `"false"` (T004) es el que impide que vuelva la regresión más silenciosa del
  arreglo: `bool("false") is True` registraría justo lo que hay que rechazar.
- Antes de cualquier corrida de `pytest`, releer la cabecera de `backend/tests/conftest.py`: la
  fixture `db` hace `drop_all()` y ya vació la base de desarrollo una vez.
- Rollback: se invierte el orden — primero volver el backend, después el workflow.

# Specification Quality Checklist: Rechazar texto que no describe una transacción

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

Ningún [NEEDS CLARIFICATION] quedó pendiente. Las tres decisiones que podrían haberse marcado se
resolvieron con defaults razonables y están documentadas en Assumptions:

1. **El campo sigue siendo de lenguaje natural libre**, no se reemplaza por un formulario. Escribir
   hablando es la propuesta de valor del producto.
2. **Sin importe determinable se rechaza** (FR-006). Es el caso más cercano al bug original, porque
   es donde la IA tiende a inventar un número; un importe inventado corrompe el balance en
   silencio, que es peor que un rechazo.
3. **Las transacciones mal registradas que ya existen no se limpian** automáticamente. Una limpieza
   retroactiva podría borrar transacciones legítimas.

Hallazgos verificados contra el código que la spec incorpora:

- **La UI ya sabe mostrar estos errores.** El dashboard muestra un aviso cuando el registro falla y
  **ya conserva el texto del campo** cuando no tiene éxito (solo lo limpia al registrar bien). Por
  eso FR-003 y FR-013 son principalmente "que llegue un mensaje útil", no construir un mecanismo
  nuevo. Reduce el alcance real del arreglo.
- **La validación del cliente no puede ser la defensa.** El campo filtra algunos caracteres en el
  navegador, pero el endpoint de creación acepta autenticación por encabezado (previsto para bots),
  así que ese filtro se saltea por completo. De ahí que FR-004 y FR-005 exijan la decisión del lado
  del servidor, en línea con el Principio V de la constitución.
- **El punto más delicado del arreglo es FR-005**: hoy la respuesta del servicio de IA se valida por
  *forma* (que los campos existan, que la categoría esté en la lista) pero nunca se pregunta si el
  texto era una transacción. Pedirle al mismo componente que recibió el texto potencialmente
  manipulado que dictamine si fue manipulado es circular, así que la verificación independiente del
  sistema es la que sostiene SC-003. Es el riesgo técnico principal a resolver en `/speckit-plan`.

Consecuencia a tener presente en el plan: **cambia el contrato con el servicio externo de
interpretación**, que está documentado en `CLAUDE.md`. Habrá que actualizar esa documentación y
coordinar el cambio en el workflow externo con el cambio en el backend.

Deliberadamente **no** se nombra ninguna tecnología, servicio ni endpoint en los requisitos.

Ningún ítem quedó pendiente. Lista para `/speckit-plan`.

---

## Resultado de `/speckit-analyze` (2026-10-05)

7 hallazgos, **0 CRITICAL**. Cuatro corregidos antes de implementar:

- **G1** (HIGH): **FR-018 no tenía ninguna tarea** — era el único requisito sin cobertura. Se agregó
  T012 (logging de rechazos con motivo + `raw_input` recortado) y la aserción correspondiente en
  T013. Sin esto, SC-002 solo se podía verificar el día del deploy y nunca después.
- **C1** (HIGH): el plan declaraba el Principio IV como resuelto, pero T022 arreglaba **1 de 4**
  mensajes que filtran en `n8n_service.py`. Los otros tres son `RuntimeError` que el blueprint
  devuelve como `503`, y uno interpola `str(e)` de una excepción no controlada —textualmente lo que
  el principio prohíbe— pudiendo arrastrar la URL del webhook. T022 ahora cubre los cuatro, T023
  testea las dos vías (`400` y `503`), y se agregó el chequeo al escenario 6 del quickstart.
- **G2** (MEDIUM): FR-009 / SC-005 ("a lo sumo una transacción por envío") solo tenía verificación
  manual. Se agregó el invariante a T014, que ya cuenta filas: con texto mixto, el delta es 0 o 1,
  nunca 2. Es justo el invariante que una instrucción dentro del texto intenta romper, así que no
  alcanzaba con que hoy se cumpla por construcción.
- **I2** (LOW): T016 agrupaba el escenario 5 del quickstart con validaciones manuales posteriores al
  deploy, pero ese escenario es pytest con el webhook mockeado y no lo necesita. Se movió a T013,
  donde se escriben esos tests.

Quedan anotados sin bloquear:

- **I1**: FR-008 admite dos resultados ante texto mixto ("registrar solo lo descrito **o** rechazar
  todo") y T006 elige el primero. Ambos pasan los tests; la ambigüedad está en la spec a propósito,
  pero conviene saber que el task ya la resolvió.
- **U1**: FR-013 (el texto permanece en el campo) se apoya en comportamiento preexistente del
  frontend y se verifica a mano. Un test de frontend sería desproporcionado para un fix de bug.
- **A1**: SC-006 ("sin consultar documentación") no es medible por una suite; T023 lo aproxima.

Cobertura final: **18/18 FR** con al menos una tarea.

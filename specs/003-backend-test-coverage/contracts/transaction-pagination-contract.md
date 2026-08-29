# Contract: `get_transactions_service(user_id, page=1, per_page=5)` (contrato ACTUAL)

Este es el contrato real contra el que hay que reescribir `TestGetTransactionsService` —
reemplaza al contrato viejo (`limit`/`offset` → `(txs, total)`) que los tests actuales todavía
asumen.

**Firma**: `get_transactions_service(user_id: int, page: int = 1, per_page: int = 5)`

**Retorno**: tupla de 3 elementos `(transacciones, meta, summary)`

- `transacciones`: `list[dict]`, cada uno con `{id, description, amount, category, raw_input, date}`, ordenadas por `date` descendente.
- `meta`: `{page, per_page, total, pages, has_next, has_prev}` (metadatos de `Flask-SQLAlchemy.paginate()`).
- `summary`: `{total_income, total_expenses, balance, top_category}` — calculado sobre **todas** las transacciones del usuario, no solo la página actual.

| Caso a cubrir (reemplaza al test viejo equivalente) | Comportamiento esperado |
|---|---|
| Usuario sin transacciones | `transacciones == []`, `meta.total == 0` |
| Transacciones del usuario | Se devuelven todas las del usuario, ninguna de otro usuario |
| Orden | Descendente por `date` |
| `per_page` restringe el tamaño de página | `len(transacciones) == per_page` cuando hay más filas que `per_page` |
| `page` pagina resultados | Páginas 1 y 2 no se solapan (`meta.has_next`/`has_prev` coherentes) |
| `per_page` por encima de `PER_PAGE_MAX` | Se cachea a `PER_PAGE_MAX` (constante real, ya no `LIMIT_MAX`), sin error |
| `per_page` menor a 1 | Se cachea a 1, sin error |
| Shape serializado | Cada item tiene exactamente `{id, description, amount, category, raw_input, date}` |
| `meta.total` | Refleja el total real de filas del usuario, independiente de `per_page`/`page` |
| `summary` | `total_income`/`total_expenses`/`balance` correctos sobre el dataset completo del usuario |

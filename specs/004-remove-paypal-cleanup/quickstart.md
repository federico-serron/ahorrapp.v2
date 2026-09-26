# Quickstart: Validar revocación de sesión, baja de PayPal y limpieza de vistas

## Prerrequisitos

- Backend y frontend corriendo localmente (o al menos el backend, para la parte de sesión).

## US1 — Revocación de sesión

```bash
cd backend
venv/Scripts/python.exe -m pytest -q tests/test_user_bp.py -k logout
```

Manual (opcional): login → guardar la cookie → `POST /user/logout` → repetir `GET /user/me` con
la cookie guardada → debe dar `401` (antes daba `200`).

## US2 — PayPal eliminado

```bash
cd backend
venv/Scripts/python.exe -m pytest -q
```

Debe pasar sin ningún archivo `test_paypal_bp.py` (fue eliminado, no ignorado). Verificar además:
- `curl -X POST http://localhost:5100/paypal/create-order` → `404` (la ruta ya no existe).
- `grep -ri paypal backend/app frontend/src` → sin resultados, salvo comentarios que decidas
  dejar como registro histórico (no debería haber ninguno funcional).

```bash
cd frontend
npm run test
npm run build
```

## US3 — Sin vistas huérfanas

```bash
cd frontend
npm run build
```

Debe compilar sin warnings de imports rotos. Navegar `/dashboard` (única ruta real además de
`/paypal/success|cancel`, que también desaparecen) y confirmar que la app funciona igual que
antes.

## Verificación final (contra `contracts/removed-surface.md`)

Recorrer la lista de "Backend — PayPal", "Frontend — PayPal" y "Frontend — Vistas huérfanas" y
confirmar que cada ítem fue efectivamente borrado, y que la sección "Explícitamente NO se toca"
sigue intacta.

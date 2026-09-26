# Contract: superficie eliminada (inventario exacto)

Este documento es la lista de verdad de qué debe dejar de existir. Cualquier tarea de
`/speckit-tasks` que borre algo fuera de esta lista, o que deje algo de esta lista sin borrar,
está desviándose del alcance acordado.

## Backend — PayPal (US2)

- `backend/app/routes/paypal_bp.py` (archivo completo)
- `backend/app/services/paypal_service.py` (archivo completo)
- `backend/tests/test_paypal_bp.py` (archivo completo)
- En `backend/app/__init__.py`: el `import` de `paypal_bp` y su `app.register_blueprint(paypal_bp, ...)`
- En `backend/app/config.py`: `PAYPAL_CLIENT_ID`, `PAYPAL_SECRET`, `PAYPAL_API_BASE`,
  `PAYPAL_RETURN_URL`, `PAYPAL_CANCEL_URL` (las 5 líneas en la clase `Config` base)
- En `backend/.env.example`: el bloque `#PAYPAL` y sus 5 variables
- En `docker-compose.yml`: las 5 líneas `PAYPAL_*` bajo `environment` del servicio `app`

## Frontend — PayPal (US2)

- `frontend/src/views/payment/paypal/` (carpeta completa: `Success.jsx`, `Cancel.jsx`)
- `frontend/src/components/payments/PaymentMethods/PayPal/` (carpeta completa)
- `frontend/src/js/store/flux.paypal.test.js` (archivo completo)
- En `frontend/src/js/store/flux.js`: las funciones `createOrderPayPal` y `captureOrderPayPal`
  (el bloque completo `/////////////////// PAYPAL /////////////////////`)
- En `frontend/src/Layout.jsx`: los imports `PayPalSuccess`/`PayPalCancel` y las rutas
  `/paypal/success`, `/paypal/cancel`
- En `frontend/src/config/paymentMethods.js`: la entrada `PAYPAL` dentro de `PAYMENT_METHODS`
  (quedan `MERCADOPAGO` y `STRIPE`)
- En `frontend/.env.example`: la línea `VITE_PAYPAL_CLIENT_ID`

## Frontend — Vistas huérfanas (US3)

- `frontend/src/views/Home.jsx`
- `frontend/src/views/HomeView.jsx`
- `frontend/src/views/ContactView.jsx`
- `frontend/src/views/PaymentMethodsView.jsx`

## Explícitamente NO se toca

- `User.is_premium` (modelo, migraciones) — se mantiene igual.
- `frontend/src/components/payments/PaymentMethods/MercadoPago/` y
  `.../Stripe/` — quedan intactos.
- `frontend/src/config/paymentMethods.js` — solo se quita la entrada `PAYPAL`, el archivo sigue
  existiendo.
- `frontend/src/views/NotFound.jsx`, `frontend/src/views/dashboard/Dashboard.jsx` — siguen
  siendo las únicas vistas de nivel página, ya estaban enrutadas.

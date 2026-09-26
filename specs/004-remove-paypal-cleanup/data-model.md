# Data Model: Revocación de sesión, baja de PayPal y limpieza de vistas huérfanas

No se agrega, modifica ni elimina ninguna entidad de datos ni columna. `User.is_premium` se
mantiene sin cambios (ver Assumptions de `spec.md`). No hay migraciones nuevas en esta feature.

El único "estado" nuevo es efímero y no persistente: el `set()` `BLACKLIST` en
`app/blacklist.py`, que ya existe como estructura en memoria — pasa de estar declarado-pero-sin-uso
a estar conectado al ciclo de vida real del logout (ver `contracts/session-revocation-contract.md`).

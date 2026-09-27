# Data Model: PWA instalable en Android e iOS

No se agrega, modifica ni elimina ninguna entidad de datos del backend. `User`, `Transaction` y
`Category` quedan exactamente como están — consistente con FR-008 de la spec (esta feature es una
capa de frontend, no un cambio al dominio de negocio).

Los únicos "datos" nuevos de esta feature son de configuración estática de build (el manifest de
la PWA) y assets binarios (íconos) — no viven en la base de datos ni tienen ciclo de vida en
runtime más allá de lo que el navegador gestiona en su Cache Storage. Ver
`contracts/pwa-manifest-contract.md` para el detalle exacto del manifest.

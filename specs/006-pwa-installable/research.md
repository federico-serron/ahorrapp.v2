# Research: PWA instalable en Android e iOS

## Decisión 1: `vite-plugin-pwa` en vez de un manifest/service worker escritos a mano

- **Decision**: Usar `vite-plugin-pwa` (verificado contra su documentación actual vía Context7),
  configurado con `strategy: 'generateSW'` (el modo por defecto, recomendado salvo que se
  necesite lógica custom en el service worker — no es el caso acá).
- **Rationale**: Es el plugin idiomático del ecosistema Vite — mismo stack que el proyecto ya
  usa (`@vitejs/plugin-react`, `vite.config.js`), no introduce un framework nuevo. Genera el
  `manifest.webmanifest` automáticamente desde config declarativa (JSON en `vite.config.js`) e
  inyecta el link correcto en el HTML final — evita mantener a mano un `manifest.json` estático
  desincronizado del build. El service worker usa Workbox internamente, sin que el proyecto
  tenga que aprender su API de bajo nivel.
- **Alternatives considered**:
  - Manifest y service worker escritos a mano — descartado: más superficie para errores humanos
    (versionado de cache, invalidación en cada deploy) para un problema ya resuelto por una
    librería madura y ampliamente usada en el ecosistema Vite.
  - Workbox CLI standalone (fuera de Vite) — descartado: añade un paso de build separado del
    pipeline de Vite ya existente, sin beneficio real para este caso.

## Decisión 2: `generateSW`, no `injectManifest`

- **Decision**: Usar la estrategia por defecto `generateSW` del plugin (el propio plugin arma el
  service worker completo a partir de config), no `injectManifest` (que requiere escribir un
  service worker propio en el que el plugin solo inyecta el manifest de precache).
- **Rationale**: El requerimiento (FR-004, cachear el shell estático; FR-005, nunca cachear datos
  de API) no necesita lógica custom de service worker — se resuelve enteramente con config
  declarativa (`workbox.globPatterns` para qué precachear, y la ausencia deliberada de
  `runtimeCaching` para el origen del backend). `injectManifest` solo se justifica si hiciera
  falta lógica a medida (ej. push notifications nativas), que está fuera de alcance de esta
  feature (ver Assumptions de `spec.md`).
- **Alternatives considered**: `injectManifest` — descartado por complejidad innecesaria para el
  alcance actual.

## Decisión 3: Cómo se garantiza FR-005 (nunca cachear datos de sesión/financieros)

- **Decision**: **No agregar ninguna regla de `runtimeCaching`** para el origen del backend
  (`VITE_BACKEND_URL`, ej. `http://localhost:5100` en dev o el dominio de prod). El
  `generateSW` de Workbox solo intercepta y cachea las requests para las que existe una regla
  explícita (precache de build, vía `globPatterns`) o una entrada de `runtimeCaching` — todo lo
  demás (incluidas las llamadas `fetch` a la API con `credentials: "include"`) pasa directo a la
  red, sin pasar por el Cache Storage del service worker.
- **Rationale**: Es más seguro por omisión que por exclusión explícita — un `runtimeCaching` mal
  configurado (ej. un regex que matchea de más) sería el tipo de bug que expondría datos
  financieros entre sesiones. No escribir ninguna regla para ese origen elimina esa clase de
  error de raíz, en vez de mitigarla con una lista de exclusión que alguien podría editar mal en
  el futuro.
- **Alternatives considered**: Agregar una regla `runtimeCaching` con `handler: 'NetworkOnly'`
  explícita para el origen del backend — evaluada pero descartada como *innecesaria*: no cambia
  el comportamiento (ya es network-only por default), y agrega una superficie de configuración
  que podría editarse por error hacia un handler de cache real. Se documenta como opción, no se
  implementa.

## Decisión 4: Metadatos mínimos para instalabilidad real en iOS y Android

- **Decision**: Además del `manifest.webmanifest` (suficiente para Android/Chrome), agregar en
  `index.html` los meta tags que iOS Safari todavía requiere de forma independiente del manifest:
  `<link rel="apple-touch-icon">`, `<meta name="theme-color">`, y confirmar que el
  `<meta name="viewport">` ya presente cumple el mínimo (`width=device-width, initial-scale=1`,
  ya está en el `index.html` actual).
- **Rationale**: Verificado contra la documentación del plugin (sección "PWA minimal
  requirements") — Safari en iOS no lee `display: standalone` del manifest de la misma forma que
  Chrome; necesita el link `apple-touch-icon` explícito para que el ícono de "Agregar a inicio"
  no sea una captura de pantalla genérica.
- **Alternatives considered**: N/A — es un requisito documentado, no una decisión de diseño con
  alternativas reales.

## Decisión 5: Aviso de "listo offline" / actualización disponible

- **Decision**: Usar el hook `useRegisterSW` de `vite-plugin-pwa/react` (virtual module
  `virtual:pwa-register/react`) en un componente chico (`PwaUpdatePrompt.jsx`) montado una vez en
  `Layout.jsx`, que muestra un toast cuando el service worker queda listo para uso offline, o
  cuando hay una versión nueva del build disponible.
- **Rationale**: Resuelve el Edge Case de "el usuario sabe que puede confiar en el modo offline"
  y evita que quede corriendo una versión vieja del bundle indefinidamente sin que el usuario se
  entere — patrón ya provisto por el plugin, coherente con "misma tecnología del proyecto"
  (reutiliza `react-hot-toast`, ya presente en el proyecto, para la UI del aviso).
- **Alternatives considered**: No mostrar ningún aviso — descartado porque el Edge Case de la
  spec (US3) pide explícitamente que el usuario reciba un aviso claro cuando no hay conexión, y
  este mecanismo también cubre el caso simétrico de actualización disponible sin costo adicional.

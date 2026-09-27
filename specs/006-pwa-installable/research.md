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

> **Corregido tras `/speckit-analyze` (hallazgo I1).** La versión anterior de esta decisión
> justificaba la garantía diciendo que el backend vive en "otro origen". **Eso es falso en
> producción** — ver "Realidad de despliegue" abajo. El resultado (no cachear datos de API) se
> sostiene igual, pero por un motivo distinto; dejar el motivo equivocado escrito era peligroso
> porque invitaba a agregar reglas de cache creyéndose protegido por separación de origen.

### Realidad de despliegue (verificada contra el código, no asumida)

- **En dev**: frontend en `:5173` (Vite) y backend en `:5100` (Flask) → **orígenes distintos**.
- **En producción**: `Dockerfile` construye el frontend y lo copia a
  `backend/app/front/build`; `backend/app/run.py` define un catch-all `/<path:path>` que sirve
  esos archivos estáticos, y los blueprints (`/user`, `/transaction`, `/category`, `/public`)
  viven en **la misma app Flask y el mismo puerto** → **mismo origen**.

Consecuencia: cualquier razonamiento de seguridad basado en "son orígenes distintos" solo vale
en dev y se cae justo donde importa. La garantía real tiene que ser independiente del origen.

- **Decision**: La garantía de FR-005 se apoya en **dos hechos de configuración**, no en el
  origen:
  1. **El precache solo cubre archivos del build**: `workbox.globPatterns` hace glob sobre el
     directorio de salida (`dist/`), no sobre URLs en runtime. Ninguna response de la API está
     en `dist/`, así que ninguna puede entrar al precache.
  2. **No existe ninguna regla de `runtimeCaching`**: `generateSW` solo intercepta y cachea
     requests que matcheen una ruta registrada (precache o `runtimeCaching`). Sin reglas de
     runtime, las llamadas `fetch` a la API (con `credentials: "include"`) pasan directo a la
     red y nunca tocan el Cache Storage.
- **Rationale**: Ambos hechos se cumplen sin importar si el backend comparte origen o no, que es
  exactamente la propiedad que necesitamos. Además, es más seguro por **omisión** que por
  exclusión explícita: no escribir ninguna regla para la API elimina de raíz la clase de bug del
  regex que matchea de más, en vez de mitigarla con una lista de exclusión que alguien podría
  editar mal más adelante.
- **Regla operativa para el futuro**: si algún día se necesita cachear algo de red (ej. Google
  Fonts), la regla de `runtimeCaching` debe ser **acotada a ese origen/patrón específico**,
  nunca un catch-all — porque en producción un catch-all incluiría la API de la propia app.
- **Alternatives considered**: Agregar una regla `runtimeCaching` con `handler: 'NetworkOnly'`
  explícita para las rutas de la API — evaluada y descartada como *innecesaria*: no cambia el
  comportamiento (ya es network-only por ausencia de reglas) y agrega una superficie de
  configuración que podría editarse por error hacia un handler de cache real.

## Decisión 3b: `navigateFallbackDenylist` para las rutas del backend (mismo origen)

- **Decision**: Configurar `workbox.navigateFallbackDenylist` con los prefijos de los blueprints
  reales del backend: `/user`, `/transaction`, `/category`, `/public`.
- **Rationale**: Con `generateSW` en una SPA, el plugin configura `navigateFallback` hacia
  `index.html` para que cualquier ruta del router se resuelva offline. Como en producción el
  backend comparte origen (ver arriba), **sin denylist una navegación directa a una ruta de la
  API sería respondida por el service worker con el shell del SPA en lugar de llegar a Flask**.
  Las llamadas `fetch` de `flux.js` no se ven afectadas (no son navigation requests), pero sí
  cualquier acceso directo por barra de direcciones, redirect o link externo a una ruta del
  backend.
- **Por qué es fácil que se escape**: este fallo **no se reproduce en dev**, donde frontend y
  backend están en puertos distintos y el service worker del frontend jamás ve esas URLs. Solo
  aparece en el build de producción — el peor momento para descubrirlo.
- **Alternatives considered**: Mover la API a un subdominio propio en producción para recuperar
  la separación de origen — descartado: es un cambio de infraestructura y despliegue que excede
  esta feature, y el Principio IX pide no agrandar la superficie sin necesidad.

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

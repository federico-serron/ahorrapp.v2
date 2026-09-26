# Contract: Web App Manifest (`manifest.webmanifest`)

Generado por `vite-plugin-pwa` a partir de la config declarativa en `vite.config.js`. Este
documento fija los valores exactos y por qué, para que `/speckit-tasks` tenga un contrato
concreto a implementar.

| Campo | Valor | Por qué |
|---|---|---|
| `name` | `"AhorrApp"` | Nombre completo mostrado durante la instalación (FR-003) |
| `short_name` | `"AhorrApp"` | Nombre bajo el ícono en el homescreen (límite práctico ~12 caracteres, "AhorrApp" entra) |
| `description` | `"Finance tracker con NLP vía n8n"` | Coincide con la descripción del proyecto en `CLAUDE.md` |
| `start_url` | `"/dashboard"` | Coincide con el redirect ya existente en `Layout.jsx` (`/` → `/dashboard`) — evita un salto extra al abrir la app instalada |
| `display` | `"standalone"` | Requisito de FR-002 (sin controles del navegador) |
| `theme_color` | `#030712` (equivalente a la clase Tailwind `gray-950`, ya usada como fondo dark en `Layout.jsx`) | Color de la barra de estado del sistema al abrir la app instalada |
| `background_color` | `#ffffff` (fondo `bg-white` del modo claro, también en `Layout.jsx`) | Color de la pantalla de splash mientras carga, antes de que el CSS decida el tema |
| `icons` | Ver tabla de íconos abajo | Requisito de FR-003 |

## Íconos requeridos

| Archivo | Tamaño | `purpose` | Uso |
|---|---|---|---|
| `pwa-192x192.png` | 192×192 | `any` | Ícono estándar Android (homescreen, listados) |
| `pwa-512x512.png` | 512×512 | `any` | Ícono estándar Android de mayor resolución (splash) |
| `maskable-icon-512x512.png` | 512×512 | `maskable` | Versión con padding de seguridad para que Android recorte la forma (círculo, squircle, etc.) sin cortar el logo |
| `apple-touch-icon.png` | 180×180 | (no aplica `purpose`, es un `<link>` en `index.html`, no una entrada del manifest) | Ícono usado por iOS al agregar a pantalla de inicio |

### Fuente y generación (actualizado durante la implementación)

La suposición original —generarlos desde `frontend/public/ahorrapp.png`— **no era viable**: ese
archivo es de 32×27 px (un favicon) y además no es cuadrado; escalarlo habría dado un ícono
borroso y deformado.

Fuente real: **`frontend/design/logotipo_sin_texto.png`** (1024×1024, RGBA, fondo transparente,
trazo `#2B9B83`). Vive en `design/` y **no** en `public/` a propósito: todo lo que está en
`public/` se copia a `dist/` y lo precachea el service worker — tener ahí el fuente de 1.4 MB
hacía que cada usuario lo descargara sin que nada lo referenciara (el precache pasaba de 958 KiB
a 2.3 MB).

Parámetros usados por destino (el logo se recorta primero con `trim()` para eliminar el margen
transparente del canvas original y así controlar el padding de cada salida):

| Destino | Canvas | Logo | Fondo | Motivo |
|---|---|---|---|---|
| `pwa-192x192.png` | 192 | 92% | transparente | `purpose: any` — el launcher decide cómo componerlo |
| `pwa-512x512.png` | 512 | 92% | transparente | idem, mayor resolución |
| `maskable-icon-512x512.png` | 512 | **62%** | blanco opaco | Android recorta a formas arbitrarias: el logo debe entrar en la safe zone (círculo del 80%) y el fondo debe llenar todo el canvas |
| `apple-touch-icon.png` | 180 | 80% | blanco opaco | iOS **ignora el canal alfa**: sin aplanar, el logo saldría compuesto sobre negro |

Para regenerarlos si cambia el logo: instalar `sharp` de forma temporal (`npm i -D sharp
--no-save`, no debe quedar como dependencia del proyecto) y repetir esos parámetros.

## Meta tags adicionales en `index.html` (fuera del manifest, requeridos por iOS)

```html
<link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180">
<meta name="theme-color" content="#030712">
```

## Acoplamiento con `VITE_BASENAME` (a tener en cuenta si cambia el despliegue)

`start_url: "/dashboard"` y el `scope` implícito (`/`) asumen que la app se sirve desde la raíz
del dominio. El router usa `basename = import.meta.env.VITE_BASENAME || ""`
(`frontend/src/Layout.jsx`), y hoy `frontend/.env.example` trae `VITE_BASENAME=/`, así que
coinciden.

Si en algún despliegue futuro la app pasa a servirse bajo un subpath (ej. `/app`), hay que
actualizar **los tres a la vez**: `VITE_BASENAME`, el `start_url` y el `scope` del manifest —
si quedan desalineados, la app instalada abriría una URL fuera de su propio scope y el navegador
la trataría como navegación externa (saliendo del modo standalone).

## Lo que el manifest explícitamente NO incluye

- `share_target`, `shortcuts`, `protocol_handlers` — no pedidos, fuera de alcance.
- Cualquier referencia a datos de usuario o sesión — el manifest es un archivo estático servido
  sin autenticación, igual para todos los visitantes.

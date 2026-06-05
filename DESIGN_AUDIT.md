# Design Audit — Thiup Frontend

> Documento generado como punto de partida del rebranding visual.
> **Stack real detectado**: React 18 + **Create React App (react-scripts 5.0.1)** + **CSS Modules + inline styles**.
> **NO es Vite** y **NO usa Styled Components/Emotion como sistema de estilos primario** (aunque `@emotion/*` está instalado vía MUI).
> Fecha: 2026-05-23

---

## 1. Resumen ejecutivo

**Estado del design system actual**: **inexistente**.

El proyecto no tiene theme central, ni tokens, ni `GlobalStyle`, ni `ThemeProvider`. Los estilos viven en tres lugares mezclados: (1) ~20 archivos `*.module.css`, (2) inline `style={{...}}` con valores hardcoded en casi todos los componentes, y (3) `src/styles/index.css` con resets mínimos. La paleta y la tipografía están duplicadas literal copia-pega en cada CSS module y cada componente. El acento principal `rgb(107, 74, 252)` (morado) está hardcoded ~14 veces. Un mismo radio mágico `max(0px, min(8px, -999900% + 1.05589e+07px)) / 8px` aparece **14 veces** copiado/pegado. El diseño actual es **light mode only** (fondo `#f1f2f5`, cards blancas), con tipografía system-ui en todas partes. No hay dark mode preparation, no hay variables CSS, no hay capa de abstracción. **El rebranding va a requerir construir un theme system desde cero** además de migrar los estilos.

**Hallazgos críticos**:
- **No existe design system.** El rebranding implica también introducir uno (recomendado: Emotion `ThemeProvider` ya que `@emotion/*` está en `package.json`, o CSS variables nativas).
- **Inline styles masivos**: cada `ThreadCard` recibe `style={{ padding, color, background, boxShadow, borderRadius }}` desde 4 screens distintos — toda card de post deberá refactorizarse para tomar esos valores del theme.
- **Paleta light-only y dependiente de blancos**: blanco puro `#FFFFFF`, `white`, gris claro `#EAEAEA`, sombras `rgba(0,0,0,.1)`. Para el target dark/veil hay que reemplazar **todas** las apariciones, no solo cambiar un token.
- **MUI Material está integrado** (`Modal`, `Skeleton`, `Tooltip`, `Grid`, `Container`, `Masonry`, `Snackbar`) — el rebranding tendrá que decidir si se queda con MUI (entonces hay que configurar `ThemeProvider` de MUI también) o si se reemplazan estos componentes.
- Lo que **funciona bien**: la estructura de carpetas es clara (`components/`, `screens/`, `styles/components/`, `styles/screens/`, `assets/svg/`). La separación de CSS Modules por componente/screen es legible. Hay solo 6 screens, alcance acotado.

---

## 2. Stack y arquitectura

### Dependencias clave

| Categoría | Librería | Versión | Notas para el rebranding |
|---|---|---|---|
| Build | `react-scripts` (CRA) | 5.0.1 | **NO Vite.** Migrar a Vite es opcional pero recomendable post-rebranding. |
| Framework | `react` / `react-dom` | 18.2.0 | OK |
| Styling — instalado pero infrautilizado | `@emotion/react`, `@emotion/styled` | 11.x | Disponibles pero NO se usan directamente en componentes propios; solo los consume MUI a través de `@mui/styled-engine-sc`. |
| UI kit | `@mui/material`, `@mui/lab` | 5.x | Usado en: `Tooltip`, `Skeleton`, `Modal`, `Grid`, `Container`, `Masonry`, `Snackbar`. Estos NO heredan tema custom — usan los defaults de MUI. |
| Icons (1) | `@fortawesome/react-fontawesome` + `free-solid-svg-icons` | 6.4 / 0.2 | Solo usado en `FloatingToolbar.js` (toolbar del editor). |
| Icons (2) | SVGs custom en `src/assets/svg/*.js` | — | 10 componentes (SvgBack, SvgClose, SvgCloseText, SvgCreateThread, SvgDelete, SvgFiles, SvgImage, SvgReact, SvgReply, SvgSearch). |
| Fonts | `@fontsource/open-sans` | 5.0.27 | **Instalado pero nunca importado** en el código — dependencia muerta. |
| Editor | `draft-js` + `draft-js-export-html` | 0.11.7 | Editor rico, custom `STYLE_MAP` con Inconsolata/Menlo monospace. |
| Routing | `react-router-dom` | 6.14 | OK |
| Data | `react-query` 3.39, `axios` | — | OK |
| Misc UI | `react-loader-spinner`, `react-world-flags`, `react-in-viewport`, `react-bottom-scroll-listener` | — | OK |
| Lenguaje | **JavaScript** (sin TypeScript) | — | Todos los archivos son `.js`. |

### Estructura de carpetas

```
thiup_frontend/
├── public/
│   ├── index.html       (theme-color #000, no font links, sin viewport scaling, no-context-menu JS hack)
│   ├── favicon.ico
│   └── manifest.json
├── src/
│   ├── App.js           (BrowserRouter + QueryClientProvider + SplashScreen 1.5s + ReactQueryDevtools)
│   ├── index.js         (StrictMode + ReactDOM root)
│   ├── App.test.js
│   ├── setupTests.js
│   ├── reportWebVitals.js
│   │
│   ├── components/      (30 componentes .js)
│   ├── screens/         (6: Index redirect, Home, Thread, Search, Tags, NotFound)
│   ├── context/
│   │   └── AplicationContext.js   (sic; export queryClient de react-query)
│   ├── services/        (cripto, thread, pagination, reaction — axios)
│   ├── utils/           (arrays, files — getPixelColorOfImage, hexToRGBA, resolution helpers)
│   ├── assets/
│   │   ├── images/app.png         (logo splash)
│   │   └── svg/*.js               (10 SVG icon components)
│   └── styles/
│       ├── index.css              (globals)
│       ├── draftEditor.css        (draft.js overrides)
│       ├── components/*.module.css (16 archivos)
│       └── screens/*.module.css    (4 archivos)
└── package.json
```

**Estadísticas**:
- Componentes: **30** archivos `.js` en `src/components/`
- Screens: **6**
- CSS Modules: **20** (16 components + 4 screens)
- SVG icon components: **10**
- Theme central: **NO existe** (0 archivos)
- TypeScript: **NO** (JS puro)

---

## 3. Theme y design tokens

### Veredicto: **NO existe theme central.**

Búsqueda realizada para los archivos esperados:

| Buscado | Existe |
|---|---|
| `src/theme.js` / `theme.ts` | ❌ |
| `src/theme/` | ❌ |
| `src/styles/theme.*` | ❌ |
| `GlobalStyle` (createGlobalStyle de styled-components) | ❌ |
| `ThemeProvider` (de styled-components, emotion o MUI) | ❌ |
| Variables CSS (`--token`) | ❌ |
| Constantes JS de colores/espaciado | ❌ |

`App.js` y `index.js` no envuelven en ningún `ThemeProvider`. MUI corre con sus defaults. **Toda decisión visual está hardcoded** en los CSS modules o en `style={{ ... }}` inline.

**Consecuencias para el rebranding**:
- El rebranding requiere **crear** el sistema, no solo cambiar valores.
- Cada color debe migrarse uno por uno; un find-replace global es viable porque la paleta única es pequeña (ver §5).
- Será necesario definir tokens semánticos (`bg.primary`, `text.muted`, `accent.gold`, etc.) y refactorizar componentes para consumirlos.
- Si se mantiene MUI, hay que crear también un MUI `ThemeProvider` (`createTheme`) para que `Skeleton`, `Tooltip`, `Modal`, etc. respeten la paleta dark.

---

## 4. Estilos globales

### `src/styles/index.css` (importado en `App.js`)

```css
body {
  margin: 0;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  -webkit-user-select: none;
  -ms-user-select: none;
  user-select: none;   /* ⚠️ Bloquea selección de texto en TODA la app */
}

html, body {
  overscroll-behavior: none;
  font-family: system-ui, -apple-system, "system-ui", Roboto, Helvetica, Arial, sans-serif;
  background: #f1f2f5;
}

.App { ... }              /* unused (legacy CRA leftover) */
.stepper, .odometer, .stepper-value { ... }   /* usados por el Odometer en ReactionIcon.js */

/* Scrollbar */
::-webkit-scrollbar         { width: 8px; }
::-webkit-scrollbar-track   { background: #f1f2f5; }
::-webkit-scrollbar-thumb   { background: #f1f2f5; border-radius: 100px; }
                            /* ⚠️ track y thumb del mismo color → scrollbar invisible */
```

### `src/styles/draftEditor.css`

```css
.toolbar-item { cursor: pointer; border-radius: 5px; background: white; }
.toolbar-item:hover { background: #f5f5f5; }
.public-DraftEditorPlaceholder-inner { font-size: 14px; }
.notranslate { font-size: 14px; }
```

### `public/index.html` (head relevante)

- `<meta name="theme-color" content="#000000">` (inconsistente con el fondo `#f1f2f5` actual)
- `<meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">` (deshabilita zoom)
- `<meta name="google" content="notranslate">` + `<html translate="no">`
- `<meta name="google-adsense-account" content="ca-pub-8440975526433939">` (AdSense)
- **No hay `<link>` a Google Fonts ni a `@fontsource/*`**.
- `<script>` inline que hace `document.addEventListener('contextmenu', e => e.preventDefault())` — bloquea click derecho.

### Observaciones
- No hay `::selection` styles.
- No hay `@font-face` definidos.
- No hay variables CSS.
- `body { background: #f1f2f5 }` es el único color de fondo global; el rebranding debe cambiarlo a `#0b0b0c`.
- El `user-select: none` global probablemente no se desea en posts/comments (UX issue heredada).

---

## 5. Paleta de colores

### Conteo total (hex + rgb/rgba en `src/`)

**Hex únicos**: 12 valores | **rgb/rgba únicos**: 30+ valores | **Theme central**: ❌

### Colores principales (ordenados por frecuencia)

#### Backgrounds / superficies

| Color | Ocurrencias | Notas semánticas |
|---|---|---|
| `#EAEAEA` | 13 | Skeleton placeholder / borders sutiles / video bg fallback |
| `#FFFFFF` / `white` / `#fff` | ~22 combinadas | Background de cards, modal, search bar — **inconsistencia de formato** (3 escrituras del mismo color) |
| `#f1f2f5` | 3 | Body bg + scrollbar track + scrollbar thumb |
| `#FCFCFD` | 1 | Background de reaction icon (no seleccionado) |
| `rgb(252, 252, 253)` | 2 | Background timeline footer / reply box |
| `rgb(242, 242, 243)` | 2 | Hover state (FloatingMenu) |
| `rgb(229, 229, 229)` | 2 | Loading placeholder ProfileIcon / AdsCard |
| `rgb(239, 239, 241)` | 1 | Button text color |
| `#f5f5f5` | 1 | toolbar-item hover (draft editor) |
| `#161c1e` | 1 | Video target color fallback |
| `rgba(22, 28, 30, 7)` | 1 | Modal backdrop fallback (`MediaModalPreview` — sintaxis rota `7` debería ser `0.7`) |

#### Texto

| Color | Ocurrencias | Uso |
|---|---|---|
| `#2e2f33` | 8 | **Color de texto primario** (pasado por inline `color` en ThreadCard styles) |
| `#999999` / `rgb(153, 153, 153)` | 8 combinadas | **Texto muted/secundario** (timestamps, replies count, placeholders, subtitle) |
| `rgba(0, 0, 0, 0.8)` | 1 | Footer ThreadCard CSS |
| `rgba(0, 0, 0, 1)` / `black` | 2 | Editor toolbar active state |
| `rgba(0, 0, 0, 0.3)` | 1 | Editor toolbar inactive state |
| `#0f1419` | 1 | Search highlight match color |
| `#1e2f33` | 1 | ThreadSkeleton color |
| `rgb(53, 55, 59)` | 1 | Code block text |
| `rgb(114, 117, 126)` | 1 | Media file meta (size/MB label) |

#### Accent (purpura — único color de marca)

| Color | Ocurrencias | Uso |
|---|---|---|
| `rgb(107, 74, 252)` | 8 | **Color primario de marca**: Button bg, OP indicator bg, reaction border seleccionada, hashtag/link text, URL text |
| `rgba(107, 74, 252, .05)` | 3 | Reaction icon seleccionado (bg suave) |
| `rgba(107, 74, 252, 0.12)` | 2 | Box-shadow ring del Button |
| `rgba(107, 74, 252, 0.4)` | 1 | Box-shadow drop del Button |
| `rgb(86, 59, 202)` | 1 | OP indicator (text color, variante oscura) |
| `rgb(240, 237, 255)` | 1 | OP indicator (background tint claro) |

#### Borders

| Color | Ocurrencias | Uso |
|---|---|---|
| `rgba(235, 235, 235, 1)` / `rgba(235, 235, 235, 1.00)` | 8 combinadas | **Border sutil** estándar (cards, reaction icon, separator) |
| `rgba(163, 163, 163, 0.12)` | 1 | GoBack button hover |
| `rgb(228, 229, 231)` | 1 | ThreadFloatingMenu hover ring |

#### Otros / atípicos

| Color | Ocurrencias | Uso |
|---|---|---|
| `#F7A5F7` | 1 | Draft Editor HIGHLIGHT bg (rosa fluor) |
| `"red"` | 2 | Counter rojo cuando se excede el límite + un `background: "red"` accidental en `SearchBar.js` (probable bug visual) |
| `rgba(255, 255, 255, 0.095)` | 1 | Close button hover en MediaModalPreview |
| `rgba(255, 255, 255, 0.08)` | 3 | Inset highlight de cards/toolbars |
| `rgba(0, 0, 0, 0.04..0.24)` | ~12 combinadas | Sombras y borders semi-transparentes (sistema ad-hoc de elevación) |

### Análisis

- **Número total de colores hex únicos en src**: 12
- **Número total de rgb/rgba únicos**: 30+
- **Colores del theme**: 0% — no hay theme
- **Colores hardcoded**: 100%
- **Veredicto**: paleta **fragmentada pero acotada**. El catálogo de colores reales que un usuario percibe es ~7-8 (blanco, gris claro EA, gris muted 999, gris texto 2e2f33, morado 6B4AFC, fondo body f1f2f5, plus warning rojo). El "ruido" es alto: el blanco se escribe en 3 formatos, `rgba(235,235,235,1)` y `rgba(235,235,235,1.00)` conviven en dos archivos.
- **Search-and-replace global es viable** porque la cardinalidad real es baja.

---

## 6. Tipografía

### Fuentes en uso

| Font-family | Origen | Carga | Ocurrencias | Uso |
|---|---|---|---|---|
| `system-ui, -apple-system, "system-ui", Roboto, Helvetica, Arial, sans-serif` | OS nativo | Heredada de `body` en `index.css` + duplicada en 6 CSS modules | 7 declaraciones idénticas (string completo copy-paste) | TODO el body, headings, threads, comments, OP/NEW badges |
| `"Inconsolata", "Menlo", "Consolas", monospace` | NO importada — sólo declarada en `Editor.js` `STYLE_MAP.CODE` | ❌ Falla en sistemas sin Inconsolata instalado, cae a Menlo/Consolas | 1 | Inline code en draft editor |
| `ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, Liberation, Mono, monospace` | OS nativo | Inline en `Editor.js` `STYLE_MAP.CODEBLOCK` | 1 | Code block en draft editor |
| `@fontsource/open-sans` (instalado vía npm) | Local | **Nunca importado** | 0 | Dependencia muerta |

**Veredicto fuentes**: solo se usa la stack system-ui repetida 7 veces como string literal. **No hay fuente sans serif "de marca"**. El target requiere agregar Inter y un mono UI (JetBrains Mono o ui-monospace).

### Escala de tamaños — `font-size` en CSS

| Tamaño | Ocurrencias | Contextos |
|---|---|---|
| `15px` | 6 | Titles (thread, search, tags), comment limit text, errorMessage title |
| `14px` | 4 | search input + draftEditor placeholder + searchInput::placeholder + notranslate |
| `12px` | 4 | threadDateInfo, repliesCount, subtitle (search/tag), errorMessage suptitle (13) |
| `13px` | 2 | threadMask, errorMessage suptitle |
| `9px` | 2 | OP indicator, NEW indicator (uppercase badges) |
| `13.5px` | 1 | EndFeed.text (magic, debería ser 13 o 14) |

### Escala de tamaños — `fontSize` inline en JS

| Valor | Ocurrencias | Contextos |
|---|---|---|
| `15` | 6 | ErrorMessage fontSize spans, default `textFontSize` ThreadCard |
| `14` | 1 | Search highlight match, ThreadCard `textFontSize` desde Home |
| `13` | 2 | Button placeholder text, MediaSelectedPreview file name |
| `16` | 1 | Draft Editor CODE inline |
| `"12px"` | 1 | Draft Editor CODEBLOCK |
| `"80%"` | 2 | Superscript / subscript |
| `props.textFontSize` (default 15) | — | ThreadCard prop |

### Pesos

| Peso | Uso |
|---|---|
| `400` (normal) | Body text por default + comment limit text |
| `500` | hashtag, MediaSelectedPreview file name |
| `600` | Button text, errorMessage title, Thread `responsesCount` |
| `700` (bold) | `threadMask` (post ID), `OP`/`NEW` badges, screen titles, search highlight |

### Letter-spacing

- **No se usa en ningún archivo del proyecto** (0 ocurrencias en CSS y JS).

### Veredicto tipografía

**Caótico-en-pequeña-escala**. La fuente es coherente (system-ui), pero:
- El string completo `system-ui, -apple-system, "system-ui", Roboto, Helvetica, Arial, sans-serif` está copy-paste en 7 lugares — cualquier cambio requiere 7 ediciones.
- Hay 6 tamaños distintos en el rango 9-16px (`9, 12, 13, 13.5, 14, 15, 16`) — `13.5px` y la coexistencia 14/15 es señal de falta de escala.
- No hay uso de letter-spacing, lo que choca con el target (que pide `0.18em - 0.32em` en mono uppercase).
- No hay tipografía mono para UI (solo se usa mono en el editor). El target hace de la mono el eje del estilo "veil".

---

## 7. Espaciado y layout

### Sistema de espaciado

**No existe sistema formal.** No hay scale tipo `space[0..7]`. Los valores son ad-hoc.

**Valores comunes detectados** (gap/padding/margin):

| Categoría | Valores observados | Uso |
|---|---|---|
| Gap | `4px, 5px, 7px, 10px, 11, 12px, 15px, 17, 40px` | Headers, footers, comment options, splash |
| Padding cards | `"20px 20px 20px 20px"` (6 veces), `"23px 24px 24px"`, `"16px 16px 15px"` | ThreadCard inline desde 4 screens |
| Padding modal | `padding-top/bottom: 16px; padding-left/right: 5px` | ReactionModal |
| Padding comment | `padding: 10px 16px 10px` | Comment box |
| Margin top sticky | `margin-top: 20px; margin-bottom: 20px` | HeadBar |
| Margin EndFeed | `margin-top: 50px` | Final del feed |

**Patrones**:
- No hay grid de 4px ni de 8px estricto; sí predominan múltiplos de 4-5.
- Se usa indistintamente `gap: 5` (sin unidad — interpretado como px en inline) y `gap: 5px`.
- Padding asimétrico habitual (`"23px 24px 24px"`, `"16px 16px 15px"`) — magic numbers.

### Border-radius

| Valor | Ocurrencias | Uso |
|---|---|---|
| `max(0px, min(8px, -999900% + 1.05589e+07px)) / 8px` | **14 veces** (CSS + inline JS) | Card border-radius "responsive" — fórmula bizarra; siempre evalúa a 8px en pantallas comunes. **Smell extremo**: copy-paste de un generador externo. |
| `100%` | 3 | Botones circulares (GoBack, FAB, ProfileIcon section) |
| `16` / `16px` | 4 | Media items |
| `5px` / `5.77148px` / `5` | 4 combinadas | Toolbar item, Button, MediaSelectedPreview |
| `3px` / `3` / `3.1192` / `2.33456px` | 9 combinadas | Flag border / NEW/OP badge / ReactionIcon img — magic numbers extremos |
| `8px` | 1 | ThreadFloatingMenu |
| `6px` | 1 | ThreadFloatingMenu modalItem |
| `9` / `7.11` / `6.5` | 3 | ThreadSkeleton / CommentBox style |
| `0` / `"0px 0px 10px 10px"` / etc. | varias | Esquinas asimétricas para componentes apilados |

### Box-shadow / elevación

**No hay escala de elevación.** Hay 3-4 patrones repetidos:

```css
/* Card flat */
box-shadow: rgba(0, 0, 0, 0.1) 0px 1px 2px 0px;     /* aparece ~16 veces inline */

/* Floating toolbar / floating menu */
box-shadow: rgba(0, 0, 0, 0.06) 0px 4px 12px,
            rgba(0, 0, 0, 0.24) 0px 0px 2px,
            rgba(255, 255, 255, 0.08) 0px 0px 0px 1px inset;

/* FAB (home create button) */
box-shadow: 0 8px 24px 0 rgba(0, 0, 0, 0.08);

/* Button primary (purple glow) */
box-shadow: rgba(107, 74, 252, 0.12) 0px 0px 0px 1px,
            rgba(107, 74, 252, 0.4) 0px 2px 8px,
            rgba(107, 74, 252, 0.12) 0px 2px 4px;

/* Media selected preview (cuatro rings) */
box-shadow: rgba(0, 0, 0, 0.04) 0px 0px 0px 1px,
            rgba(0, 0, 0, 0.08) 0px 2px 8px,
            rgba(255, 255, 255, 0.08) 0px 0px 0px 1px inset,
            rgba(0, 0, 0, 0.04) 0px 0px 0px 4px;
```

El target dark/veil pide **eliminar las sombras grandes** y usar solo bordes 1px casi imperceptibles — esto implica borrar la mayoría de estos `box-shadow` y reemplazar por `border: 1px solid #1d1d20`.

### Layout / containers

- `App.js` no envuelve en un AppShell — cada screen renderiza su propio `<Layout>` (componente local).
- `Layout.js` usa `@mui/material` `Grid` con breakpoints `lg={8} md={10} sm={10} xs={11}` y un `Container maxWidth="sm"` interno. **Único patrón de layout responsive en la app.**
- El scroll vertical está manejado dentro del Grid (`overflowY: scroll`) — NO en window. Esto significa que la URL bar mobile no se oculta y el sticky header funciona dentro de ese contenedor.
- No hay header global ni sidebar — la app es **single column** centrada.

---

## 8. Componentes

### Inventario completo (30 componentes + 6 screens)

#### Atoms

##### `Button`
- **Path**: `src/components/Button.js`
- **Estilos**: 100% inline (`style={{...}}`)
- **Props de estilo**: `style` (merge), `isFocus` (opacity 1 / 0.5), `isLoad` (spinner)
- **Estados**: focus, loading, disabled (vía `isFocus`)
- **Colores hardcoded**: `rgb(107, 74, 252)` (bg + 3-layer purple box-shadow), `rgb(239, 239, 241)` (text)
- **Magic numbers**: `borderRadius: 5.77148`, `fontSize: 13`
- **Notas**: Es el ÚNICO botón "primary" de la app, y está hardcoded morado.

##### `Separator`
- **Path**: `src/components/Separator.js` + `Separator.module.css`
- **Estilos**: CSS Module simple — `height: 1px; background: rgba(235, 235, 235, 1)`
- **Notas**: Línea hairline horizontal. Para dark/veil debe cambiar a `#1d1d20`.

##### `ProfileIcon`
- **Path**: `src/components/ProfileIcon.js`
- **Estilos**: 100% inline
- **Props**: `iconSize` (default 23), `url`, `flag`
- **Notas**: Mezcla imagen + flag superpuesto. `borderRadius` mágico. Loading placeholder `rgb(229, 229, 229)`.

##### `GoBack`
- **Path**: `src/components/GoBack.js` + `GoBack.module.css`
- **Estilos**: CSS Module; botón redondo 35x35 con hover `rgba(163, 163, 163, 0.12)`
- **Iconografía**: `<SvgBack />`
- **Notas**: Limpio, único componente con state hover gestionado solo por CSS.

##### `ReactionIcon` (+ Stepper + Odometer interno)
- **Path**: `src/components/ReactionIcon.js`
- **Estilos**: 100% inline; consume clases globales `.stepper`, `.odometer`, `.stepper-value` de `index.css`
- **Colores**: `rgb(107, 74, 252)` (text)
- **Notas**: Tiene un Odometer custom para los contadores (animación numérica). Único punto de "interacción con polish" del diseño actual.

##### `EndFeed`
- **Path**: `src/components/EndFeed.js` + `EndFeed.module.css`
- **Estilos**: CSS Module; `font-size: 13.5px` (magic), `color: #999999`
- **Notas**: Muestra "🏁 End of results." — incluye emoji.

##### `FilePicker`
- **Path**: `src/components/FilePicker.js`
- **Iconografía**: `<SvgFiles />`
- **Notas**: Wrapper de `<input type="file">` oculto. No tiene estilos visuales propios más allá del SVG.

#### Molecules

##### `SearchBar`
- **Path**: `src/components/SearchBar.js` + `SearchBar.module.css`
- **Estilos**: Mezclados (CSS module para input + inline en wrapper)
- **Bug detectado**: `background: "red"` en el wrapper del input (línea 52) — visible si no llega override.
- **Colores**: `#999999` placeholder, `white` bg, sombra estándar
- **Notas**: Búsqueda con redirect a `/search/:query/`. Borra `#` automáticamente del input.

##### `ThreadCard` ⭐ **núcleo del diseño**
- **Path**: `src/components/ThreadCard.js` + `ThreadCard.module.css`
- **Tipo**: Molecule central
- **Estilos**: Mixto — CSS Module para header/footer/badges, inline para card outer
- **Props de estilo**: `style`, `iconSize`, `textFontSize`, `titleHashStyles`, `flag`
- **Estados**: hover (mouse enter/leave → muestra ThreadFloatingMenu)
- **Colores hardcoded**: `#2e2f33` text, `#FFFFFF` bg, `rgb(107, 74, 252)` badges, `#999999` muted
- **Magic**: el `borderRadius: max(...)` y el `boxShadow` se pasan por inline desde **4 screens** distintos (Home, Thread, Search, Tags) duplicando el mismo bloque.
- **Notas**: **Componente #1 a refactorizar.** Debe absorber su styling en lugar de recibirlo desde cada screen.

##### `Comment` (CommentBox)
- **Path**: `src/components/Comment.js` + `Comment.module.css`
- **Estilos**: Mixto
- **Estados**: `focus`, `isLoad`, `showError` (Snackbar de MUI)
- **Notas**: Wrapper del `DraftEditor` + `FilePicker` + `Button`. Tiene contador de caracteres (`MAX_CHARACTER = 500`) que se vuelve `"red"` al excederse.

##### `Editor` (DraftEditor)
- **Path**: `src/components/Editor.js`
- **Estilos**: STYLE_MAP custom para 10 estilos (CODE, HIGHLIGHT, UPPERCASE, LOWERCASE, CODEBLOCK, SUPERSCRIPT, SUBSCRIPT)
- **Notas**: Único componente que ya usa **mono fonts**. Buen punto de referencia para el target.

##### `HeadBar`
- **Path**: `src/components/HeadBar.js` + `HeadBar.module.css`
- **Estilos**: CSS Module + inline; **`position: sticky`** (cumple "sticky elements" del target)
- **Notas**: `background: white` hardcoded; sombra `rgba(0,0,0,0.1) 0px 1px 2px 0px`.

##### `ErrorMessage`
- **Path**: `src/components/ErrorMessage.js` + `ErrorMessage.module.css`
- **Estilos**: CSS Module + inline `fontSize: 15` override
- **Notas**: Vacíos en Search, Tags, NotFound, Thread (404). Title bold + suptitle muted.

##### `ImagePreview` / `VideoPreview`
- **Paths**: `components/ImagePreview.js`, `components/VideoPreview.js`
- **Estilos**: Inline; `borderRadius: 16` para imagen single, EAEAEA placeholder
- **Notas**: Ambos usan `LazyLoadingBlock` (react-in-viewport).

##### `MediaItem`
- **Path**: `src/components/MediaItem.js`
- **Notas**: Switch entre Image y Video según `is_video`.

##### `ThreadFloatingMenu`
- **Path**: `src/components/ThreadFloatingMenu.js` + `ThreadFloatingMenu.module.css`
- **Estilos**: CSS Module + inline para focus/hover (`rgb(228, 229, 231)` ring, `rgb(242, 242, 243)` bg)
- **Notas**: Aparece al hover sobre ThreadCard (Reply / React).

##### `FloatingToolbar`
- **Path**: `src/components/FloatingToolbar.js` + `FloatingToolbar.module.css`
- **Estilos**: CSS Module + inline para color/border activo del editor (`rgba(0,0,0,1)` vs `rgba(0,0,0,0.3)`)
- **Iconografía**: 13 FontAwesome icons
- **Notas**: Toolbar flotante del editor — único lugar que usa FontAwesome.

##### `ReactionBox`
- **Path**: `src/components/ReactionBox.js` + `ReactionBox.module.css`
- **Estilos**: CSS Module + inline para border/background según selección
- **Estados**: selected reaction → border morado + bg morado `.05`
- **Notas**: Hereda toda la lógica de reacciones (purple highlight).

##### `AdsCard`
- **Path**: `src/components/AdsCard.js`
- **Notas**: Placeholder de ads (un `x` enorme con `background: red` debug). Probablemente WIP. Comentado en uso en `Home.js`.

##### `TextPreview`
- **Path**: `src/components/TextPreview.js`
- **Estilos**: 100% inline en CompositeDecorator (hashtag/url/search-match coloring)
- **Colores**: `rgb(107, 74, 252)` (hashtags, urls), `#0f1419` (search match), font-weight 500/700
- **Notas**: Decora draft-js output con regex (URLs + #hashtags + search highlight).

#### Organisms

##### `TimeLine` (ThreadResponses + ThreadResponseContent)
- **Path**: `src/components/TimeLine.js`
- **Estilos**: 100% inline (`margin: "10px 16px 20px"`, `background: white`, magic borderRadius)
- **Notas**: Maneja respuestas anidadas + CommentBox para responder. Tiene **lógica visual compleja inline** (cierre de esquinas según index).

##### `MediaLayout`
- **Path**: `src/components/MediaLayout.js` + `MediaLayout.module.css`
- **Notas**: Tiene **función `calculateMediaItemSize` con 5 breakpoints en píxeles** (530, 640, 700, 760, 1085, 2035, 4050) — **único lugar con responsive design pixel-aware** (no @media queries; basado en `width` prop).

##### `MediaSelectedPreview`
- **Path**: `src/components/MediaSelectedPreview.js`
- **Estilos**: 100% inline
- **Notas**: Card de preview de archivos antes de enviar. Sombra de 4 rings (la más compleja del proyecto).

##### `MediaModalPreview`
- **Path**: `src/components/MediaModalPreview.js` + `MediaModalPreview.module.css`
- **Notas**: Modal fullscreen con `backdrop-filter: blur(10px)`. Background dinámico calculado con `hexToRGBA(target_color, 0.7)` — color sacado del primer pixel de la imagen.

##### `ReactionModal`
- **Path**: `src/components/ReactionModal.js` + `ReactionModal.module.css`
- **Estilos**: CSS Module (`backdrop-filter: blur(6px)`)
- **Notas**: Grid Masonry con todas las reacciones disponibles.

##### `ThreadSkeleton`
- **Path**: `src/components/ThreadSkeleton.js`
- **Notas**: Loader de 1 o 3 cards usando `@mui/material/Skeleton`. Fondo `#EAEAEA`.

#### Templates / Layouts

##### `Layout`
- **Path**: `src/components/Layout.js`
- **Notas**: Único layout. Grid de MUI centrado. Scroll listener para pagination.

##### `SplashScreen`
- **Path**: `src/components/SplashSreen.js` (sic — typo en el filename) + `SplashScreen.module.css`
- **Notas**: Full-screen blanco con el logo `src/assets/images/app.png` por 1.5s.

#### Utility / Non-visual

- `LazyLoadingBlock` — wrapper de `react-in-viewport`. Sin estilos.

#### Screens

| Screen | Path | Patrón |
|---|---|---|
| `Index` | `src/screens/Index.js` | Redirect a `/home/` |
| `Home` | `src/screens/Home.js` | Feed principal: SearchBar + CommentBox + lista de ThreadCards + ThreadSkeleton + EndFeed |
| `Thread` | `src/screens/Thread.js` | Detalle: HeadBar + ThreadCard (head) + TimeLine + CommentBox reply |
| `Search` | `src/screens/Search.js` | Resultados: HeadBar + lista filtrada |
| `Tags` | `src/screens/Tags.js` | Igual que Search pero por tag — **código duplicado ~95%** |
| `NotFound` | `src/screens/NotFound.js` | Solo `<ErrorMessage />` |

**Code smell**: `Search.js` y `Tags.js` son prácticamente el mismo archivo (cambia un parámetro y un literal de título). Oportunidad de refactor durante el rebranding.

---

## 9. Iconografía

### Sistema actual: **mixto**

#### Set 1: SVGs custom (10 componentes)
- **Path**: `src/assets/svg/*.js`
- **Componentes**: `SvgBack`, `SvgClose`, `SvgCloseText`, `SvgCreateThread`, `SvgDelete`, `SvgFiles`, `SvgImage`, `SvgReact`, `SvgReply`, `SvgSearch`
- **Notas**: Cada uno es un componente React con un `<svg>` hardcoded. No hay `Icon` central que tome `size` o `color` por props.

#### Set 2: FontAwesome (solo en FloatingToolbar)
- **Librerías**: `@fortawesome/react-fontawesome` + `@fortawesome/free-solid-svg-icons`
- **Iconos usados**: `faBold`, `faItalic`, `faUnderline`, `faHighlighter`, `faStrikethrough`, `faSuperscript`, `faSubscript`, `faTextWidth` (code), `faCode`, `faChevronUp`/`Down` (case), `faListUl`/`Ol`
- **Notas**: Solo en el editor toolbar. Coexiste sin razón con el set custom.

#### Tamaños usados
- SVGs custom: tamaños internos al SVG (no estándar)
- FontAwesome: default + `transform="grow-3"` y `transform="grow-6"`
- En general: width/height 24, 35, 40, 17 — inconsistente.

### Veredicto

No hay sistema. Para el rebranding **se recomienda fuertemente migrar todo a una librería única tipo `lucide-react`** (estilo terminal/cyberpunk encaja con stroke-width 1.5px de lucide) y eliminar FontAwesome + los 10 SVG custom.

---

## 10. Animaciones

### Transitions y keyframes encontrados

- `@keyframes` definidos: **0**
- `transition` declarations: **1** (`transition: top 200ms linear` para el Odometer)
- Animaciones de librerías:
  - `react-loader-spinner` (RotatingLines en Button — `animationDuration="0.75"`)
  - `@mui/material` Skeleton (animación shimmer default)
  - `react-in-viewport` (sin animación, solo IntersectionObserver)

**Veredicto**: animaciones casi inexistentes. El Odometer del ReactionIcon es el único "polish" custom. Para el target dark/veil no se requiere agregar más — el estilo "veil" es estático y minimal.

---

## 11. Responsive design

### Media queries

`@media` queries en CSS: **0** en todo el proyecto.

### Patrón único de responsive

- **`Layout.js`** usa MUI Grid breakpoints: `lg={8} md={10} sm={10} xs={11}`
- **`MediaLayout.js`** hace responsive **vía JS pixel-aware**: una función `calculateMediaItemSize(width)` con 5 thresholds (530/640/700/760/1085/2035/4050) que devuelve `{ maxWidth, height }`.
- **`MediaModalPreview.js`**, **`ReactionModal.js`**, **`Search.js`** usan props `lg/md/sm/xs` de MUI Grid puntualmente.

### Mobile / desktop

- `<meta viewport>` deshabilita el zoom usuario.
- `body { user-select: none }` rompe selección de texto (más típico de mobile pero aplicado a todo).
- **No hay variantes mobile específicas** ni `hidden` patterns en CSS.

### Veredicto

El responsive es **superficial**: solo confía en MUI Grid + un cálculo manual en MediaLayout. El target dark/veil no requiere cambios estructurales aquí, pero sí oportunidad para introducir breakpoints semánticos en el theme (`sm/md/lg/xl`).

---

## 12. Inconsistencias y code smells

### Críticos (prioridad alta en el rebranding)

1. **El radio mágico `max(0px, min(8px, -999900% + 1.05589e+07px)) / 8px`** aparece **14 veces** copy-paste (CSS + inline JS). Es un generador externo (¿Figma plugin?) que termina siempre en 8px. → reemplazar por `borderRadius: '8px'` (o token).
2. **Mismo color escrito 3 maneras**: `white` / `"white"` / `#fff` / `#FFFFFF` — unificar.
3. **`background: "red"` colgado en `SearchBar.js` línea 52** — bug visual (probablemente debug olvidado).
4. **`background: "red"` colgado en `AdsCard.js` línea 13** + el placeholder con un `x` enorme.
5. **`background: rgba(22, 28, 30, 7)` en `MediaModalPreview.js`** — sintaxis rota (alpha `7` debería ser `0.7`).
6. **`Tags.js` y `Search.js` son ~95% código duplicado** — refactor candidato.
7. **`SplashSreen.js`** — typo en filename (`Sreen` en lugar de `Screen`).
8. **`AplicationContext.js`** — typo en filename (`Aplication` en lugar de `Application`).
9. **El font stack `system-ui, -apple-system, "system-ui", Roboto, Helvetica, Arial, sans-serif` está copy-paste en 7 archivos** — cambiar fuente requiere editar 7 lugares.
10. **`@fontsource/open-sans` instalado pero nunca importado** — dead dependency, remover.

### Estructurales (paradigma)

11. **Inline styles masivos en cada screen**: padding/color/background/boxShadow de las cards está repetido en `Home.js`, `Thread.js`, `Search.js`, `Tags.js`. ThreadCard debería absorber esos estilos.
12. **No hay theme/tokens**: imposible cambiar la marca sin tocar ~30 archivos.
13. **CSS Modules + inline styles convivén**: ningún criterio claro para cuándo usar uno u otro.
14. **`color: rgb(86, 59, 202)` para el OP indicator** — ¿es un derivado del accent o magic? No documentado.
15. **Magic numbers de border-radius**: `2.33456px`, `3.1192`, `5.77148`, `6.5`, `7.11`, `9` — vienen de fuente desconocida.

### Comments e indicadores

16. **`console.log(current_reaction)`** queda en `ReactionBox.js` línea 45 (debug en producción).
17. **`alert("COPIADO")` y `alert("File drop")`** en `Editor.js` líneas 99-101 (placeholders del paste de archivos).
18. **Bloque comentado completo de `<AdsCard>`** en `Home.js` líneas 202-213.
19. **`borderRadius: " 4px"`** en `Editor.js` STYLE_MAP.CODEBLOCK — espacio leading dentro del string.

### A nivel UX

20. `body { user-select: none }` aplicado globalmente → el usuario no puede seleccionar/copiar texto de posts (probablemente no intencional para una red social de contenido).
21. Scrollbar invisible (`track` y `thumb` mismo color `#f1f2f5`).
22. `document.addEventListener('contextmenu', e => e.preventDefault())` en `index.html` → bloquea click derecho global.

---

## 13. Mapping al rebranding target (estilo dark/veil)

### Colores: actual → target

| Concepto | Actual | Target | Acción |
|---|---|---|---|
| Body background | `#f1f2f5` | **`#0b0b0c`** (primary deep) | Editar `src/styles/index.css` |
| Card / elevated bg | `white` / `#FFFFFF` / `"white"` | **`#111113`** (elevated) | Find-replace global + token |
| Modal / overlay bg | `white` | **`#08080a`** (deep) o tinted | — |
| Text primary | `#2e2f33` (8x), `rgba(0,0,0,0.8)` | **`#d8d6cf`** (cream warm) | Find-replace + token |
| Text dimmed/muted | `#999999`, `rgb(153,153,153)` (8x) | **`#8a8880`** | Token |
| Text muted-deep | — (no existe) | **`#5a5852`** | Nuevo token |
| Border subtle | `rgba(235, 235, 235, 1)` (8x), `#EAEAEA` (skeleton) | **`#1d1d20`** | Find-replace |
| Border visible | (no existe) | **`#2a2a2e`** | Nuevo token |
| Accent primary | `rgb(107, 74, 252)` (8x — morado) | **`#c9a26a`** (gold/amber) | Find-replace + redefinir Button |
| Accent secondary | (no existe formal) | **`#6f9474`** (sage) | Nuevo |
| Warning/error | `"red"` (2x) | **`#b56a6a`** | Reemplazar |
| Highlight (Draft editor) | `#F7A5F7` (rosa) | `rgba(201, 162, 106, 0.18)` (gold tint) | STYLE_MAP.HIGHLIGHT |
| Skeleton fill | `#EAEAEA` | `#1d1d20` o `#2a2a2e` | Override Skeleton sx |
| Selection / hover | `rgb(242, 242, 243)`, `rgb(228, 229, 231)` | `rgba(216, 214, 207, 0.06)` | — |
| Shadow primary | `rgba(0,0,0,0.1) 0px 1px 2px 0px` (16x) | **Eliminar** → reemplazar por `border: 1px solid #1d1d20` | Smell #1 a remover |
| Box-shadow del Button | 3-layer purple glow | **Eliminar** → `border: 1px solid #c9a26a` solo en hover/focus | — |
| Body texture | (ninguna) | **agregar**: `linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px) 0 0/100% 2px` | Nuevo en GlobalStyle |

### Tipografía: actual → target

| Aspecto | Actual | Target |
|---|---|---|
| Body sans | `system-ui, -apple-system, ...` (string copy-paste 7x) | **Inter** + system-ui fallback. Centralizar en theme.fonts.sans |
| UI labels / IDs / timestamps / tags | system-ui (igual que body) | **`ui-monospace, JetBrains Mono`**, uppercase, letter-spacing 0.18-0.32em |
| Mono inline code | `"Inconsolata", "Menlo", "Consolas"` | Mantener Inconsolata o cambiar a JetBrains Mono — unificar |
| Letter-spacing | NO se usa | Mono uppercase: **`0.18em` (badges/labels)** / **`0.28em` (NEW, OP)** / **`0.32em` (top nav)** |
| Body size | 15px default | 14-15px (mantener) |
| Headings | 13-16px | 13-16px (sin grandes headlines — coincide) |
| UI micro (badges) | 9px | 9-11px (mantener) |
| Carga de fuente | Ninguna (system) | Añadir Inter vía `@fontsource/inter` o `<link>` Google Fonts |

### Componentes que requieren refactor priorizado

#### Refactor mayor

- **`ThreadCard`**: absorber `padding/color/background/boxShadow/borderRadius` que hoy recibe inline desde 4 screens. Añadir variants (`head` / `comment` / `feed`).
  - Reemplazar `style={{ background: "#FFFFFF", boxShadow: "rgba(0,0,0,.1)..." }}` por theme tokens.
  - Mostrar `0x{mask.id}` con **mono uppercase, letter-spacing**, color accent gold.
  - Timestamp en mono uppercase color muted.
  - Badges `NEW` / `OP`: mono uppercase, sin background colorido, solo `border 1px` accent + text accent.

- **`Button`**: pasar de morado glow → **bordered minimal**.
  - Variants: `primary` (border gold + text gold), `ghost` (border subtle + text dim), `danger` (red sage).
  - Eliminar las 3 capas de box-shadow purple.

- **`SearchBar`**: 
  - Quitar `background: "red"` bug.
  - Bg `transparent` o `#111113`, border `1px solid #1d1d20`, focus ring sutil gold.
  - Mono uppercase placeholder ("SEARCH" / "/").

- **`HeadBar`**: 
  - Sticky → ya está. Mantener.
  - Bg `#0b0b0c` con `backdrop-filter: blur(8px)` opcional.
  - Añadir un "mark" (glyph rotado 45deg) según el target.
  - Title en mono uppercase letter-spacing.

#### Refactor menor (theme propagado)

- **`Separator`**: cambiar `background: rgba(235, 235, 235, 1)` → `#1d1d20`.
- **`EndFeed`**: cambiar `color: #999999` → muted token. Tipografía mono.
- **`ProfileIcon`**: placeholder gris → `#1d1d20`. ¿considerar identicon mono?
- **`ErrorMessage`**: sin cambios estructurales, solo colores.
- **`ThreadSkeleton`**: Skeleton bg `#EAEAEA` → `#1d1d20`.
- **`ReactionBox`, `ReactionIcon`, `ReactionModal`**: replace purple `rgb(107,74,252)` → gold `#c9a26a`.
- **`TextPreview`**: hashtag/url color purple → gold. Search-match `#0f1419` → text primary cream.
- **`ThreadFloatingMenu`, `FloatingToolbar`**: bg blanco → `#111113`. Eliminar las sombras complejas.
- **`MediaModalPreview`**: arreglar la sintaxis `rgba(22, 28, 30, 7)` → `rgba(8, 8, 10, 0.95)`.
- **`MediaSelectedPreview`**: eliminar las 4 sombras anidadas → border simple.
- **`SplashScreen`**: bg blanco → `#0b0b0c`. Logo: probablemente cambie con el rebranding.

#### Componentes que requieren atención especial

- **`Editor` (DraftEditor)**: STYLE_MAP debe reescribirse — `CODE` background gold tint, `CODEBLOCK` bg `#08080a` border `#1d1d20`, `HIGHLIGHT` gold tint suave.
- **`AdsCard`**: actualmente roto/WIP. Decidir si entra al rebranding o se elimina.
- **`SVG icons`**: los 10 SVGs custom + FontAwesome. Recomendación: migrar todo a `lucide-react` (estilo minimal sangra bien con el target).

#### Globals

- `src/styles/index.css`:
  - `body background: #f1f2f5` → `#0b0b0c`
  - Eliminar `user-select: none` global (mantenerlo solo en chrome-UI).
  - Importar `Inter` + `JetBrains Mono` (vía `@fontsource/inter` y `@fontsource/jetbrains-mono`).
  - Arreglar scrollbar (thumb diferente del track).
  - Añadir `::selection { background: rgba(201, 162, 106, 0.25) }`.
  - Añadir textura sutil de líneas horizontales (background-image gradient).
- `public/index.html`:
  - `theme-color #000000` → `#0b0b0c`.
  - Cargar `<link rel="preconnect">` a fontsource si se usa.

---

## 14. Plan de acción sugerido

> 30 componentes + 6 screens + ~20 CSS modules. Estimación: **20-30h de trabajo concentrado** para hacer el rebranding completo con tests visuales (no incluye reescribir AdsCard ni migrar a lucide-react).

### Fase 0: Decisiones previas (1-2h)

- [ ] Confirmar stack de styling final: **recomendado** Emotion `ThemeProvider` (ya está instalado vía MUI) + retener CSS Modules para casos puntuales.
- [ ] Decidir si se mantiene MUI o se reemplaza. Si se mantiene: configurar `createTheme` de MUI con la paleta dark.
- [ ] Decidir librería de iconos: mantener mixto SVG+FontAwesome vs migrar a lucide-react.
- [ ] Decidir si el rebranding incluye migración CRA → Vite (recomendado pero independiente).

### Fase 1: Theme foundation (2-3h)

- [ ] Crear `src/theme/index.js` con:
  - `colors`: backgrounds, text, borders, accents según target
  - `fonts`: `sans: 'Inter, system-ui, ...'`, `mono: 'JetBrains Mono, ui-monospace, ...'`
  - `fontSizes`: escala 9, 11, 12, 13, 14, 15, 16
  - `space`: 4, 8, 12, 16, 20, 24, 32, 40, 48
  - `radii`: 0, 4, 8, 12 (eliminar el radio mágico)
  - `letterSpacings`: 0, 0.08em, 0.18em, 0.28em, 0.32em
- [ ] Crear `src/theme/GlobalStyle.js` (Emotion `Global` o CSS plano):
  - body bg `#0b0b0c`, text `#d8d6cf`, font Inter
  - antialiasing, ::selection, scrollbar custom
  - opcional: textura de líneas horizontales
- [ ] Importar fuentes: `@fontsource/inter` + `@fontsource/jetbrains-mono` (`npm install`).
- [ ] Envolver `App.js` con `ThemeProvider` (Emotion) + GlobalStyle.
- [ ] Si se queda con MUI: añadir `MuiThemeProvider` con `createTheme({ palette: { mode: 'dark', ... } })`.
- [ ] Eliminar `@fontsource/open-sans` del `package.json` (dead dep).

### Fase 2: Atoms (3-4h)

- [ ] Refactor `Button` — variants primary/ghost/danger; sin glow purple.
- [ ] Refactor `Separator` — border `#1d1d20`.
- [ ] Refactor `ProfileIcon` — placeholder oscuro.
- [ ] Refactor `GoBack` — hover sutil.
- [ ] Refactor `ReactionIcon` (incluye Odometer) — accent gold.
- [ ] Refactor `EndFeed` — mono uppercase.
- [ ] Crear opcional `Icon` central + decidir librería.
- [ ] Crear opcional `Badge` / `Tag` componente nuevo si se centraliza (hoy es inline CSS dentro de ThreadCard.module.css).

### Fase 3: Molecules (4-6h)

- [ ] `ThreadCard` — **absorber estilos inline** y aplicar el look dark/veil.
- [ ] `SearchBar` — quitar bug `background: red`, aplicar look mono.
- [ ] `Comment` (CommentBox) — colores + contador de chars red → red token.
- [ ] `Editor` — reescribir STYLE_MAP completo con los nuevos colores.
- [ ] `HeadBar` — bg dark, opcional añadir mark + status.
- [ ] `ErrorMessage` — colores.
- [ ] `ImagePreview` / `VideoPreview` / `MediaItem` — placeholder oscuro.
- [ ] `ThreadFloatingMenu`, `FloatingToolbar`, `ReactionBox` — paleta dark.
- [ ] `AdsCard` — decisión: refactor o eliminar.
- [ ] `TextPreview` — accent gold para hashtags/URLs.

### Fase 4: Organisms (3-4h)

- [ ] `TimeLine` — extraer estilos inline a CSS Module o styled; aplicar dark.
- [ ] `MediaLayout` — colores de borders.
- [ ] `MediaSelectedPreview` — eliminar 4-rings shadow.
- [ ] `MediaModalPreview` — arreglar sintaxis rgba rota, bg dark.
- [ ] `ReactionModal` — bg dark.
- [ ] `ThreadSkeleton` — Skeleton dark bg.

### Fase 5: Screens (2-3h)

- [ ] `Home` — eliminar inline `style` duplicado de ThreadCard (moverlo al componente).
- [ ] `Thread` — idem.
- [ ] `Search` / `Tags` — idem + considerar deduplicar en un componente.
- [ ] `NotFound` — colores.
- [ ] `SplashScreen` — bg dark, fix typo filename si se quiere.

### Fase 6: Cleanup y QA (2-3h)

- [ ] Grep global por colores hex/rgb que sobrevivieron — debe haber ≤ 5 (todos tokens).
- [ ] Verificar que el radio mágico desapareció (0 ocurrencias).
- [ ] Test visual en 5 viewports.
- [ ] Eliminar `console.log` y `alert` placeholder.
- [ ] Verificar selección de texto (`user-select`).
- [ ] Verificar scrollbar visible.
- [ ] Confirmar que MUI Skeleton/Tooltip/Modal usan el tema.

### Estimación total

**~17-25h** para Fases 1-6 (sin migración Vite ni reescritura completa de iconos).

---

## Apéndice: archivos a editar (cheat sheet)

| Categoría | Archivos | Total |
|---|---|---|
| Theme nuevo | `src/theme/index.js`, `src/theme/GlobalStyle.js` | 2 (new) |
| Globals | `src/styles/index.css`, `public/index.html` | 2 |
| Componentes JS | `src/components/*.js` | 30 |
| CSS Modules | `src/styles/components/*.module.css` | 16 |
| Screen CSS | `src/styles/screens/*.module.css` | 4 |
| Screens JS | `src/screens/*.js` | 6 |
| Editor CSS | `src/styles/draftEditor.css` | 1 |
| Config | `src/App.js` (envolver con ThemeProvider) | 1 |
| Package | `package.json` (add `@fontsource/inter`, `jetbrains-mono`; remove `open-sans`) | 1 |
| **Total** | | **~63 archivos** |

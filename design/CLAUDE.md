# design/ — Maqueta de solo-diseño de Thiup

Copia visual estática de la app real, para jugar y proponer cambios de diseño
**sin tocar `src/`**. HTML + CSS + JS puros, sin build, sin framework, sin
ninguna llamada de red (salvo la fuente Inter vía Google Fonts — ver abajo).
Se abre con doble clic o cualquier servidor estático.

```
design/
├── CLAUDE.md               ← este archivo
├── index.html              ← portada: lleva al sistema de diseño y a las 9 pantallas
├── sistema-de-diseno.html  ← tokens, tipografía, componentes, iconos, marca
├── assets/
│   ├── tokens.css          ← paleta/tipografía/radios/sombra como custom properties
│   ├── base.css            ← reset + utilidades (spring-press, foco)
│   ├── components.css      ← nav, feed, hilo, menús, reacciones, tabs, modal, toast...
│   ├── icons.js             ← SVGs calcados de los componentes reales (sin librería)
│   ├── avatar.js            ← puerto 1:1 del generador procedural de MaskAvatar.js
│   ├── reaction-emoji.js    ← puerto 1:1 de ReactionEmoji.js (caras doradas propias, NUNCA emoji del SO)
│   ├── illustrations.js     ← "fotos" de ejemplo dibujadas (escenas vectoriales, cero fotografía real)
│   ├── mock-data.js         ← posts/hilos/notificaciones/tendencias inventados
│   └── app.js               ← render helpers (tarjetas, respuestas, nav) + interacciones
└── screens/                 ← una pantalla por archivo, versión de escritorio
    ├── home.html
    ├── thread.html
    ├── search.html
    ├── profile.html
    ├── public-profile.html
    ├── notifications.html
    ├── not-found.html
    ├── server-error.html
    └── network-error.html
```

## De dónde sale cada valor

Todo valor de `tokens.css` y `components.css` viene de leer el `CLAUDE.md` del
repo (la documentación del sistema de diseño real, verificada contra el
código) y los `.module.css` reales de `src/styles/**`. No se inventó ningún
color, medida, radio ni sombra — si algo te parece raro, compáralo contra el
componente real antes de "corregirlo" aquí.

**Diferencia deliberada:** la app real NO usa CSS custom properties (cada
módulo trae el valor hardcodeado — es parte del sistema real, ver el
`CLAUDE.md` raíz). Aquí SÍ se usan variables (`var(--brand-terracotta)` etc.)
porque este directorio es un espacio de juego: cambiar un token en
`tokens.css` debe propagarse a las 9 pantallas para poder proponer variantes
rápido. Si una propuesta de aquí se lleva al código real, hay que traducirla
de vuelta a valores hardcodeados por módulo (o proponer la migración a
variables como un cambio aparte y explícito).

## Alcance — qué SÍ y qué NO está calcado

**Calcado con fidelidad alta** (mismos valores, misma estructura): paleta
completa, tipografía (tamaño fijo 14px de cuerpo/identidad), espaciado/radios/
sombra, el patrón de "surface elevada" con corner-mask, tabs con indicador
deslizante, NavRail de escritorio, tarjeta de hilo (feed), vista de hilo con
threading estilo Reddit/Threads (líneas de hilo, profundidad, avatar gutter),
composer con el pill y el botón de enviar circular, menú flotante (MenuSurface),
picker de reacciones, reaction stack estilo Facebook, cabecera de perfil,
fila de notificación, y las 3 pantallas de error.

**Simplificado a propósito** (no es parte del "diseño" en sí, son mecánicas de
producto que no aportan nada a una maqueta estática): scroll-anchoring del
hilo, el pill flotante "volver al hilo original" en todos sus detalles de
medición, el arbitraje de reproducción de video, Close You (geolocalización),
el editor expandido de respuesta como modal aparte (se deja el inline), la
canalización de medios reales (CDN/compresión — aquí son placeholders de
color), y los toasts/skeletons de carga reales (hay un `showToast()` de
juguete). Si necesitas ver alguno de estos en detalle, es más rápido leer el
componente real que replicarlo aquí.

**Solo escritorio.** No hay bottom bar móvil, app bar frosted de 60px ni hojas
(`BottomSheet`) — el pedido fue explícitamente "de momento en versión
escritorio". `components.css` deja las clases `.nav-appbar-mobile` como
referencia para cuando se quiera extender.

## Experimentos de interacción (SOLO `screens/home.html` — no existen en la app real)

Nacieron de una sesión de lluvia de ideas ("se ve bonita pero aburrida",
comparada contra capturas de Facebook/Twitter antiguos). Nada de esto está en
`src/` todavía — es la maqueta para decidir qué vale la pena construir de
verdad. Si alguno se aprueba, el traspaso a la app real es trabajo aparte
(ver regla 6). Viven en `components.css` bajo el bloque
`HOME — EXPERIMENTOS DE "VIDA"` y en `app.js` marcados con el mismo comentario.

**Historial:** la primera pasada probó una card "Para ti ahora" (sugerencias
por afinidad con avatar + follow), un pulso ambiental de texto ("148
reacciones en la última hora…"), una pregunta del día sobre el compose row,
una card de recursos de apoyo y un pill de "N hilos nuevos" con timer. Tras
ver feedback ("se nota mucho que es IA", demasiado texto explicativo,
tamaños/colores dispares) se **simplificó**: fuera el pulso de texto, la
pregunta del día, el pill con timer y la card de recursos. Una segunda
vuelta probó reemplazar esa card por una columna lateral de "Tendencias"
estilo X (`.home-layout`/`.home-side-col`) — también se descartó (feedback
directo: "no me gustó esa propuesta") y Home volvió a su única columna
centrada de 640px (`CLAUDE.md` raíz), sin segunda columna. Quedó lo que
sigue. Si alguna idea de columna lateral se retoma, que sea con el mismo
criterio "se lee en un vistazo, sin copy de relleno" que ganó esta pasada.

1. **Picker de reacciones con hover** (`.reaction-popover` ya no depende de
   `[hidden]`; se revela con `:hover` bajo `@media (hover: hover)` y el
   clic la fija con `.is-open`). Además se agregó una variante **compacta**
   (`renderReactionPicker(id, reaction, true)`) a la fila de stats del feed
   — en la app real HOY solo se puede reaccionar dentro del hilo
   (`HomeFeedCard` solo muestra `ReactionStack`, de solo lectura); aquí se
   puede reaccionar sin salir del feed. **Fila de acciones separada**
   (`.row-meta-actions`, debajo de `.row-stats`): el picker compacto y el
   stat de respuestas viven en su propia línea bajo el reaction-stack (antes
   compartían una sola fila con tres piezas de peso visual distinto); ambos
   comparten color (`--text-secondary`, antes el picker usaba
   `--text-tertiary` — un gris distinto al de su vecino, el "icono de un
   color y otro de otro" reportado) y la misma anatomía de 28px de alto.
2. **Encuestas** (`.poll-*`, `renderPollBody`, tipo `post.type === "poll"`)
   — "ciegas" hasta votar (como X), un voto por sesión. Primer tipo de
   contenido que no es texto/foto. El meta de la encuesta ("N votos · Cierra
   en…") usa el MISMO tamaño/color que `.stat-with-icon`/`.reaction-total`
   justo debajo — son la misma familia de "meta información" y deben leerse
   como una sola voz (antes eran 12px/`text-quaternary` vs 13px/
   `text-secondary`: el "disparejo" reportado).
3. **Seguir anónimo** (`.follow-btn`, `renderFollowButton`,
   `followedMasks`) — sigue una MÁSCARA (`mask.id`), no una persona; vive en
   el header de cada tarjeta del feed. Mismo botón sincronizado en todas sus
   apariciones de la página. Es la pieza que más cambia el modelo de datos
   si se construye de verdad (relación seguir↔máscara).
4. **Scroll infinito** (`#feed-sentinel`, `IntersectionObserver`,
   `MockData.morePosts`) — al acercarse al final del feed, "carga" el
   siguiente lote de 3 desde un pool de 14 hilos (temas variados a
   propósito: duelo, dinero, crianza, cuerpo, mudanza, adicción, amistad,
   identidad, salud crónica, bloqueo creativo…) tras una demora simulada.
   Al agotar el pool vuelve a empezar (sufija el `uid` con el número de
   vuelta — `mp3·2` — para que los ids de menú/reacción nunca choquen).
   **Ojo con `rootMargin` grande:** si cada lote deja al sentinel TODAVÍA
   dentro del margen de disparo, el observer no vuelve a cruzar la frontera
   y el scroll se detiene tras un solo lote — por eso `loadMore()` se
   revisa a sí mismo (`sentinelNearViewport()`) y se encadena de nuevo si
   hace falta, en vez de depender solo del observer.

**Arquitectura reusable que dejó esto:** el header de `renderFeedCard` ya no
envuelve el contenido en un `<a>` real — es un `div.nav-zone` con
`data-nav-href` + `role="link"`, navegado por el handler delegado de
`app.js` (que ignora el clic si viene de un `button`/`a` real dentro). Es el
mismo patrón que la app real usa en `HomeFeedCard.handleCardClick`, y es lo
que permitió meter el botón de Seguir en el header sin anidar `<button>`
dentro de un enlace (la regla 10 de arriba, aplicada también a `<a>`).

## Propuestas v2 — archivos compartidos

`screens/thread-v2.html` y `screens/home-v2.html` comparten su lenguaje en
`assets/v2.css` y `assets/v2.js` (prefijo `.v2-`; las pantallas originales NO
los cargan). `v2.js` va después de `app.js` y expone: `renderRailV2(activo)`
(el rail de las v2; sustituye a `renderNavRail` en estas pantallas), `V2Items` + `actionsHTML(id, cola)` / `react()`
(reacciones como chips; cada pantalla registra ahí lo reaccionable y pasa su
propio botón Responder como cola), `dotsBtn(id)` (⋯ + menú), `V2Profile`
(tarjeta de perfil al hover sobre `[data-profile]`; la pantalla afina
`online`, `role`, `bottomInset`), `esc`, `plural`, `me`, `profileHref`.
`v2.css` trae además los esqueletos (`.v2-skel-row`), el editor (`.v2-ex-*`)
y los keyframes. Lo que solo usa una pantalla se queda en su `<style>`.

**Video en las v2** (`.v2-vid`, en `v2.css`/`v2.js`): `v2.js` envuelve
`renderMediaFrame` y cambia el disco oscuro + pastilla de silencio por un
disco claro de reproducir al centro y, abajo, barra de progreso con tirador y
tiempos (transcurrido · total), como el reproductor de X. Avance simulado; se
puede reproducir, pausar y arrastrar. Sin control de silencio (pendiente).

**Repost (sandbox — la feature no existe en la app real).** Botón
"Repostear N" en la fila de acciones (misma anatomía que "Responder"), solo
en hilos — tarjetas del feed y el post que abre el hilo —, no en respuestas.
Abre un menú corto (`.v2-rp-menu`): *Repostear* / *Citar*; hecho, queda en
terracota como "Reposteado" y el menú ofrece *Deshacer repost*. Estado en
`V2Items[id].reposts` / `.reposted`; `v2.js` expone `repostBtn(id)`,
`repostRefresh(id)` y los ganchos `V2Repost.onToggle` / `onQuote` (sin
`onQuote` no se ofrece "Citar": así está en el hilo). En `home-v2.html`:
- **Repost simple:** línea de contexto sobre la tarjeta ("X reposteó" /
  "Reposteaste", `.v2-card-context`) y el hilo entero debajo. El tuyo entra
  arriba del feed.
- **Cita:** tu comentario + el hilo original como tarjeta pequeña incrustada
  (`.v2-quote`: avatar mini, nombre, 3 líneas, primera foto). "Citar" abre el
  editor con el hilo citado a la vista; publicar suma un repost al original.
- El hilo citado muestra sus adjuntos como mosaico compacto (`.v2-qm`,
  1–3 piezas de 168px; "+N" si hay más; un video lleva disco y duración).
  Es vista previa: no se reproduce ni se desliza ahí.
- Ejemplos en `MockData.reposts`: 5 reposts simples y 5 citas, uno por tipo
  de adjunto (solo texto, una imagen, varias, video, mezclado), intercalados
  con los hilos normales del feed.

**Hilo temporal en las v2** (`ttlBadge(post)` / `.v2-ttl`): sin aro en el
avatar (se confundía con "tiene un estado/historia"). Junto a la hora va una
pastilla cálida "Se borra en 6 h" con un aro que muestra la vida que le queda
(`snapLeftMin` / `snapTotalMin`); con menos de una hora pasa a terracota.

**Retirado de TODA la maqueta** (en `app.js`, `renderFeedCard`): el botón
"Seguir" (la feature no existe) y la etiqueta "▲ trending". `renderFollowButton`
y sus estilos quedaron sin uso; el punto 3 de "Experimentos de interacción"
más arriba ya no aplica.

**Pasada "viva" — ajustes de sistema (v2).** Iteración, no rediseño: nada
cambia de sitio. Tokens nuevos en `tokens.css` (solo los usan las v2):
`--accent-moss` / `--accent-moss-wash` (segundo acento, EXCLUSIVO del repost:
"X reposteó" y "Reposteado"; la terracota sigue significando "tu reacción" y
marca), `--fill-chip` / `--fill-chip-hover`, `--fill-recessed`, `--hairline`,
`--radius-media` (12px).
- **Chips de reacción rellenos** (antes contorno gris): objeto cálido en
  reposo; el tuyo, tinte terracota + aro fino. La cifra "cae" al cambiar.
- **Hilo citado = bloque hundido** (`--fill-recessed`, radio 12, una línea
  fina pintada encima de texto y foto). Sustituye la caja con borde beige de
  1px y radio 16, que era caja-dentro-de-caja.
- **Radio interior único:** fotos, video y bloque citado a 12px; la placa de
  la tarjeta sigue en 16.
- **Acciones principales en tinta y en píldora:** "Publicar" de la fila de
  compose, el botón del editor y "Crear" en el rail.
- **Rail rehecho** (`.v2-rail`, `renderRailV2`): mismo sitio y ancho (76px),
  pero todos los destinos comparten UNA anatomía — cápsula de 52×32 con el
  icono + palabra de 11px debajo. Reposo en gris medio (antes `#b8b8b8`),
  activo = cápsula `--brand-tint` + icono terracota + palabra en tinta; Crear
  = la misma cápsula rellena de tinta; Perfil muestra tu máscara; el aviso de
  Actividad es terracota (antes rojo). Sustituye al parche anterior de
  "palabras bajo los iconos" sobre el rail viejo, que quedó desparejo.
- **Golpes de color:** barrita terracota bajo la pestaña activa, "Autor"/"Tú"
  en terracota (`.v2-role`), iconos del composer en `--brand-warm`.
- El icono de repost da media vuelta al confirmar.

## Propuesta `screens/home-v2.html` (sandbox — no existe en la app real)

El mismo Inicio (masthead, tarjeta elevada, fila de compose, tabs, 640px) con
el lenguaje afinado en el hilo. `home.html` queda intacto para comparar.

1. Rail con palabras.
2. **Tarjeta de hilo** (`.v2-card`): UNA fila de acciones — chips de reacción
   + cara para añadir + enlace "Responder N" — en vez de resumen de
   reacciones arriba y fila de iconos abajo. La respuesta destacada conserva
   su línea de continuidad y lleva sus propios chips.
3. Mismo ⋯ y menú del hilo; **sin Seguir** y sin Compartir.
4. Tarjeta de perfil al hover.
5. **Crear hilo funciona:** el editor (`.v2-ex`) nace de la fila de compose o
   del "+" del rail; cerrar conserva el borrador; al publicar, el hilo entra
   arriba con el resaltado contenido en su placa (borde transparente de 4px +
   `background-clip`, igual que las filas del hilo).
6. Cargar más muestra esqueletos de tarjeta (antes una ruedita).
7. Sin animaciones de entrada al cargar. Se conservan encuestas y scroll
   infinito del experimento original.

## Propuesta `screens/profile-v2.html` (sandbox — no existe en la app real)

Perfil propio con la anatomía de X y el lenguaje de las v2. `profile.html`
queda intacto. Datos en `MockData.profileV2`. La tarjeta de hilo del feed
(`cardHTML`, `register`, cita, placa…) pasó a `v2.js`/`v2.css` para que
Inicio y Perfil usen la misma; ahora admite `post.pinned` ("Fijado") y
`post.replyTo` ("En respuesta a X") con la misma línea de contexto del repost.

- **Cabecera:** portada a sangre (176px, recortada por las esquinas de la
  tarjeta) + foto de 96px montada sobre su borde + "Editar perfil" y copiar
  enlace. Debajo: nombre para mostrar (22/700), `@máscara` (clic = copiar),
  descripción con hashtags, enlaces como chips (hasta 3) y una línea de
  fecha de ingreso + cifras. Sin descripción, aparece "Añade una descripción".
- **Pestañas:** Hilos · Respuestas · Media. El título del masthead pasa a tu
  nombre + nº de hilos cuando el nombre sale de pantalla.
- **Editar perfil** (`.v2-ed-*`, sobre el diálogo `.v2-ex`): el diálogo ES la
  vista previa. Un disco con cámara sobre la portada y sobre la foto abre una
  bandeja de opciones justo debajo (una a la vez): portadas de la casa (tres
  degradados con el trazo de la marca + ilustraciones) o subir imagen;
  máscaras o subir foto, con el aviso "Una foto real puede identificarte. Tu
  máscara, no." Campos con etiqueta arriba y contador al enfocar (Nombre 30,
  Descripción 160) y enlaces Título + Enlace (máx. 3) con validación en línea
  al salir del campo. "Guardar" solo se activa con cambios válidos. Cerrar
  con cambios hace que la CABECERA pregunte ("¿Descartar los cambios?" ·
  Seguir editando · Descartar) en vez de abrir otro diálogo. Tocar la portada
  o la foto del perfil abre el editor ya en esa bandeja.
- La imagen subida es local (`URL.createObjectURL`): no sale del navegador y
  se pierde al recargar. La foto elegida se propaga a rail y tarjetas de
  ESTA pantalla (envoltorio de `maskAvatarSVG`), no a las demás.

Pendiente: perfil público (`public-profile.html`) con la misma cabecera,
recorte/encuadre de la imagen subida, y que nombre y foto se vean en Inicio e
Hilo.

## Propuesta `screens/thread-v2.html` (sandbox — no existe en la app real)

Rediseño de la vista de hilo tras el feedback "la navegación es aburrida y no
se entiende". `thread.html` queda intacto para comparar. Todo el CSS/JS nuevo
vive DENTRO del archivo (prefijo `.v2-`), solo con tokens existentes; los
datos son `MockData.threadV2` (el mismo hilo en forma de árbol, `kids`).

1. **Orientación:** el Atrás nombra el lugar del que vienes ("← Inicio", por
   `document.referrer`) y el rail lo marca; al bajar, el título "Hilo" se
   vuelve el hilo que lees (avatar + inicio del texto, clic = arriba).
2. **Mapa del hilo** (`.v2-map`): una cara por conversación en el margen
   derecho; marca la que estás leyendo, clic = saltar. Sin texto.
3. **Ramas plegables:** la línea de continuidad es el control (hover la
   tiñe); plegada deja un pill "N respuestas" con caras. Divisor entre
   conversaciones de primer nivel.
4. **Una sola fila de acciones:** reacciones como chips de un toque
   (una por persona) + cara para añadir + Responder.
5. **Composer acoplado** (`.v2-dock`, sticky abajo, translúcido): dice a
   quién respondes, señala esa respuesta y publica en su sitio.
6. **"Sigue leyendo"** al final: 3 hilos, nunca un callejón sin salida.
7. El OP sube a 17px (protagonista). Sin botón Seguir (la feature no existe).
8. **Menú ⋯ propio** (`.v2-menu` / `.v2-dots`): capa translúcida que nace del
   botón, filas 14/500 con icono a la derecha y un solo trazo; sin
   "Compartir". El botón ⋯ es un círculo de 36px con el glifo centrado (en
   `thread.html` el lavado del hover queda corrido).

9. **Carga al cambiar de orden:** etiqueta y check cambian al instante; la
   lista se reemplaza por 3 esqueletos (avatar, nombre, dos líneas — sin chip de reacción) y el chevron
   del selector pasa a aro girando (`SORT_DELAY` simula la red).

10. **Tarjeta de perfil al hover** (`.v2-pcard`, rediseño de
    `PostProfileHoverCard`): el nombre de la máscara es el título (no
    "Anónimo", sin monoespaciada), avatar a la izquierda alineado con el que
    señalaste (la tarjeta nace de él), "En línea" con palabras, dos cifras
    grandes alineadas a la izquierda (sin bandeja ni columnas centradas — se
    probó y se descartó: "se ve horrible") y un pie "Desde <mes> de <año> ·
    Ver perfil". Mismo material que el menú ⋯. Cifras
    derivadas del id (maqueta).

11. **Editor ampliado** (`.v2-ex`, rediseño de `PostReplyExpandModal`; botón
    "Ampliar editor" en el composer acoplado): es el MISMO borrador más
    grande (texto compartido en vivo). Nace del pill y vuelve a él; sin
    "Cancelar" ni diálogo de descarte — Escape, clic fuera y el botón de
    arriba solo contraen, nunca se pierde nada. Título "Responder a <id>",
    original en gris con miniaturas de sus fotos, contador en aro (número
    solo en los últimos 20, límite 500).

12. **Lo que se tomó de X (y lo que no).** Se probó reescribir la pantalla
    con el sistema de X (columna plana de 600px, nav de 256px con etiquetas
    grandes y botón "Publicar", acciones icono + cifra, composer en barra) y
    se RECHAZÓ: "copiar y pegar el diseño de X" no es iterar. La identidad de
    esta propuesta (tarjeta elevada, rail de 76px, chips de reacción, composer
    en cápsula, mapa del hilo) se respeta. De X solo quedaron tres ideas,
    resueltas con el lenguaje propio: una palabra bajo cada icono del rail
    (`.v2-nav-word`), la cifra de respuestas directas junto a "Responder"
    (`.v2-reply-n`) y cero animaciones de entrada al cargar.

Pendiente si se aprueba: versión móvil (el mapa se oculta bajo 1040px) y
mapas de más de ~12 conversaciones.

## Reglas para no romper la maqueta

1. **Cero `fetch`, cero `XMLHttpRequest`, cero `import` de red.** Todo dato
   sale de `mock-data.js`. Si agregas una pantalla o un estado nuevo, invéntale
   los datos ahí mismo.
2. **`#FFFFFF` sigue prohibido.** Usa `var(--bg-surface)` (`#fdfcf8`).
3. **Reusa clases de `components.css`** antes de escribir CSS nuevo en una
   pantalla. Si un patrón se repite en 2+ pantallas, va al archivo compartido.
4. **Nombres de clase en kebab-case plano** (no hay CSS Modules aquí — todas
   las hojas comparten el mismo namespace global).
5. **Nada de contenido real de usuarios.** El texto de los posts es inventado
   a propósito con un tono sobrio (la app es anónima y trata temas sensibles)
   — no copies conversaciones reales ni datos identificables.
6. **No se edita `src/`** desde este directorio ni al revés. Si una propuesta
   de aquí se aprueba, el traspaso a la app real es un cambio aparte,
   revisado como cualquier PR normal.
7. **Reacciones = `reactionEmojiSVG(name, size, animated)` de `reaction-emoji.js`,
   NUNCA un emoji nativo del SO.** La app real dibuja sus propias caras (ver
   `ReactionEmoji.js`) precisamente porque el emoji nativo varía por
   plataforma y rompe el diseño — usar `"❤️"` aquí sería repetir ese problema
   dentro del mockup.
8. **Fotos/video de ejemplo = `illustrationSVG(key)` de `illustrations.js`**
   (escenas vectoriales planas en la paleta cálida), nunca una caja de color
   con texto "foto N" ni una foto real descargada de internet. Si agregas un
   post con media nueva, dale un `illo` temático a cada item en `mock-data.js`
   (agrega una entrada nueva a `ILLUSTRATIONS` si ninguna encaja).
9. **No hay contador de vistas.** El sistema de visualizaciones todavía no
   existe en el backend real — no lo reintroduzcas en el mockup hasta que
   exista allá.
10. **Nunca anides `<button>` dentro de `<button>`.** Es HTML inválido: el
    parser cierra el botón exterior en cuanto ve el interior, así que
    cualquier markup "oculto" adentro se escapa y aparece visible fuera de
    su contenedor (pasó con el menú ☰ del NavRail). Un menú/dropdown siempre
    va como **hermano** del botón que lo abre (envueltos en un `<div
    style="position:relative">`), nunca como su hijo — mismo patrón que
    `renderOptionsMenu`/`renderReactionPicker` en `app.js`.

## Fuente (Inter)

Cada pantalla enlaza Inter desde Google Fonts (`fonts.googleapis.com`) en vez
de copiar el woff2 variable autohospedado real — visualmente es la misma
familia. Si necesitas trabajar sin internet, reemplaza ese `<link>` por un
`@font-face` local apuntando a una copia del archivo de `public/fonts/`.

## Regenerar / extender

No hay paso de build (a diferencia de otras maquetas del equipo que usan un
script Python para ensamblar un prototipo único): cada `screens/*.html` es
autosuficiente y enlaza los `assets/` compartidos con rutas relativas. Para
añadir una pantalla nueva: copia la estructura de `screens/home.html`
(mismos `<link>`/`<script>` en el mismo orden) y usa los helpers de `app.js`
(`renderNavRail`, `renderFeedCard`, `renderReply`, `renderReactionStack`,
`renderOptionsMenu`, `renderNotification`, `renderTrendRow`) en vez de
reescribir el markup a mano.

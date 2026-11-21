/* =========================================================================
   THIUP MOCKUP — ILUSTRACIONES (fotos de ejemplo)
   En vez de cajas beige con texto "foto 1", cada media item se dibuja como
   una pequeña escena vectorial plana en la paleta cálida de Thiup — misma
   técnica que las ilustraciones de ~/my/viajes (gradientes de cielo +
   siluetas en capas), pero con los tokens de esta app. 100% inventado, cero
   fotografía real. IDs de gradiente namespaced por llamada (contador) para
   que varias ilustraciones en una misma página nunca choquen.
   ========================================================================= */

let illoUidCounter = 0;
function nextIlloUid() {
  illoUidCounter += 1;
  return `il${illoUidCounter}`;
}

function illoWrap(uid, body) {
  return `<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" role="img" aria-hidden="true" style="width:100%;height:100%;display:block;">${body(uid)}</svg>`;
}

const ILLUSTRATIONS = {
  // Escritorio junto a la ventana — "renuncié hoy" (p2).
  escritorio(uid) {
    return `
      <defs>
        <linearGradient id="${uid}-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#f3e3d3"/><stop offset="1" stop-color="#e8d5b7"/>
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill="#fdfcf8"/>
      <rect x="40" y="20" width="200" height="180" rx="4" fill="url(#${uid}-sky)"/>
      <rect x="40" y="20" width="200" height="180" rx="4" fill="none" stroke="#c5a572" stroke-width="6"/>
      <line x1="140" y1="20" x2="140" y2="200" stroke="#c5a572" stroke-width="5"/>
      <line x1="40" y1="108" x2="240" y2="108" stroke="#c5a572" stroke-width="5"/>
      <circle cx="175" cy="75" r="26" fill="#e3a45c"/>
      <path d="M40 190 100 140 160 175 200 130 240 165V200H40Z" fill="#b8845f" opacity="0.55"/>
      <rect x="0" y="210" width="400" height="90" fill="#8b6f47"/>
      <rect x="20" y="200" width="360" height="16" fill="#6b5538"/>
      <rect x="60" y="150" width="14" height="60" fill="#5a4a3a"/>
      <rect x="326" y="150" width="14" height="60" fill="#5a4a3a"/>
      <!-- A small desk lamp on the right (quiet "packing up" read, no face-like artifacts). -->
      <rect x="296" y="196" width="28" height="5" rx="2" fill="#5a4a3a"/>
      <rect x="307" y="166" width="6" height="32" fill="#8b6f47"/>
      <path d="M298 150 322 150 316 168 304 168Z" fill="#e3a45c"/>
      <!-- A short stack of papers beside it. -->
      <rect x="248" y="188" width="34" height="5" rx="1.5" fill="#f3e3d3"/>
      <rect x="251" y="181" width="34" height="5" rx="1.5" fill="#f7ead9"/>`;
  },

  // Montaña al atardecer — viaje en solitario (p5 · 1/3).
  montana(uid) {
    return `
      <defs>
        <linearGradient id="${uid}-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#e8a06a"/><stop offset="1" stop-color="#f3e3d3"/>
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill="url(#${uid}-sky)"/>
      <circle cx="310" cy="70" r="34" fill="#f0c48a"/>
      <path d="M0 190 70 110 130 160 200 80 270 150 330 100 400 170V300H0Z" fill="#8b6f47"/>
      <path d="M0 230 90 150 170 195 240 130 320 185 400 150V300H0Z" fill="#a85432"/>
      <path d="M0 260 110 205 190 235 260 195 340 240 400 215V300H0Z" fill="#c5a572"/>`;
  },

  // Carretera al horizonte — viaje en solitario (p5 · 2/3).
  carretera(uid) {
    return `
      <defs>
        <linearGradient id="${uid}-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#b8845f"/><stop offset="1" stop-color="#f7ead9"/>
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill="url(#${uid}-sky)"/>
      <circle cx="200" cy="150" r="26" fill="#f3e3d3"/>
      <path d="M0 300 0 230 400 230 400 300Z" fill="#8b6f47"/>
      <path d="M170 230 190 300 210 300 230 230Z" fill="#5a4a3a"/>
      <path d="M196 236 192 268 198 268 200 236Z" fill="#e8d5b7"/>
      <path d="M198 278 196 300 204 300 202 278Z" fill="#e8d5b7"/>
      <path d="M0 230 140 150 260 150 400 230Z" fill="#c5a572" opacity="0.5"/>`;
  },

  // Ciudad al anochecer — viaje en solitario (p5 · 3/3).
  ciudad(uid) {
    return `
      <defs>
        <linearGradient id="${uid}-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#5a4a3a"/><stop offset="1" stop-color="#b8845f"/>
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill="url(#${uid}-sky)"/>
      <circle cx="110" cy="70" r="22" fill="#f3e3d3" opacity="0.9"/>
      <g fill="#2e2620">
        <rect x="10" y="150" width="46" height="150"/>
        <rect x="64" y="110" width="52" height="190"/>
        <rect x="124" y="170" width="40" height="130"/>
        <rect x="172" y="90" width="56" height="210"/>
        <rect x="236" y="140" width="44" height="160"/>
        <rect x="288" y="120" width="50" height="180"/>
        <rect x="346" y="160" width="44" height="140"/>
      </g>
      <g fill="#f0c48a" opacity="0.85">
        <rect x="20" y="166" width="8" height="8"/><rect x="36" y="166" width="8" height="8"/>
        <rect x="20" y="190" width="8" height="8"/><rect x="36" y="206" width="8" height="8"/>
        <rect x="78" y="130" width="8" height="8"/><rect x="96" y="150" width="8" height="8"/>
        <rect x="78" y="170" width="8" height="8"/><rect x="96" y="190" width="8" height="8"/>
        <rect x="184" y="110" width="8" height="8"/><rect x="202" y="130" width="8" height="8"/>
        <rect x="184" y="150" width="8" height="8"/><rect x="202" y="170" width="8" height="8"/>
        <rect x="250" y="160" width="8" height="8"/><rect x="250" y="184" width="8" height="8"/>
        <rect x="300" y="140" width="8" height="8"/><rect x="318" y="160" width="8" height="8"/>
        <rect x="358" y="180" width="8" height="8"/><rect x="374" y="200" width="8" height="8"/>
      </g>`;
  },

  // Genérica — placeholder sobrio para media sin tema explícito.
  generica(uid) {
    return `
      <defs>
        <linearGradient id="${uid}-sky" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#f3e3d3"/><stop offset="1" stop-color="#e5e0d3"/>
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill="url(#${uid}-sky)"/>
      <circle cx="200" cy="150" r="46" fill="none" stroke="#c5a572" stroke-width="4" opacity="0.6"/>
      <circle cx="200" cy="150" r="14" fill="#c5a572" opacity="0.6"/>`;
  },

  // Taza de café junto a la ventana — bloqueo creativo, mañanas lentas.
  cafe(uid) {
    return `
      <defs>
        <linearGradient id="${uid}-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#f7ead9"/><stop offset="1" stop-color="#e8d5b7"/>
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill="url(#${uid}-sky)"/>
      <rect x="0" y="190" width="400" height="110" fill="#8b6f47"/>
      <rect x="0" y="190" width="400" height="10" fill="#6b5538"/>
      <ellipse cx="175" cy="208" rx="54" ry="14" fill="#5a4a3a"/>
      <path d="M121 208 121 242 Q175 262 229 242 L229 208Z" fill="#fdfcf8"/>
      <ellipse cx="175" cy="208" rx="54" ry="13" fill="#6b5538"/>
      <ellipse cx="175" cy="206" rx="44" ry="9" fill="#3d2b1c"/>
      <path d="M229 212 Q256 214 254 232 Q252 248 229 244" fill="none" stroke="#5a4a3a" stroke-width="7"/>
      <path d="M160 180 Q152 165 162 150" fill="none" stroke="#c5a572" stroke-width="4" stroke-linecap="round" opacity="0.6"/>
      <path d="M190 180 Q182 160 194 142" fill="none" stroke="#c5a572" stroke-width="4" stroke-linecap="round" opacity="0.5"/>
      <rect x="70" y="252" width="40" height="5" rx="2" fill="#f3e3d3"/>
      <rect x="260" y="256" width="52" height="5" rx="2" fill="#f7ead9"/>`;
  },

  // Ventana con lluvia — tardes grises, pausa obligada.
  lluvia(uid) {
    return `
      <defs>
        <linearGradient id="${uid}-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#8b6f47"/><stop offset="1" stop-color="#c5a572"/>
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill="url(#${uid}-sky)"/>
      <rect x="30" y="20" width="340" height="260" rx="6" fill="#e8d5b7" opacity="0.35"/>
      <rect x="30" y="20" width="340" height="260" rx="6" fill="none" stroke="#5a4a3a" stroke-width="7"/>
      <line x1="200" y1="20" x2="200" y2="280" stroke="#5a4a3a" stroke-width="6"/>
      <line x1="30" y1="150" x2="370" y2="150" stroke="#5a4a3a" stroke-width="6"/>
      <g stroke="#fdfcf8" stroke-width="3" stroke-linecap="round" opacity="0.55">
        <line x1="80" y1="50" x2="68" y2="95"/>
        <line x1="130" y1="70" x2="118" y2="115"/>
        <line x1="60" y1="170" x2="48" y2="215"/>
        <line x1="150" y1="190" x2="138" y2="235"/>
        <line x1="250" y1="55" x2="238" y2="100"/>
        <line x1="300" y1="80" x2="288" y2="125"/>
        <line x1="240" y1="175" x2="228" y2="220"/>
        <line x1="320" y1="195" x2="308" y2="240"/>
      </g>`;
  },

  // Sendero entre árboles — caminar para pensar.
  bosque(uid) {
    return `
      <defs>
        <linearGradient id="${uid}-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#e8d5b7"/><stop offset="1" stop-color="#f3e3d3"/>
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill="url(#${uid}-sky)"/>
      <path d="M150 300 180 140 220 140 250 300Z" fill="#e8d5b7"/>
      <g fill="#8b6f47">
        <path d="M40 300 70 110 100 300Z"/>
        <path d="M120 300 145 150 170 300Z"/>
        <path d="M230 300 255 150 280 300Z"/>
        <path d="M300 300 330 110 360 300Z"/>
      </g>
      <g fill="#a85432" opacity="0.75">
        <circle cx="70" cy="100" r="30"/>
        <circle cx="145" cy="140" r="24"/>
        <circle cx="255" cy="140" r="24"/>
        <circle cx="330" cy="100" r="30"/>
      </g>`;
  },

  // Mar al atardecer — primer viaje en solitario, cuerpo en calma.
  playa(uid) {
    return `
      <defs>
        <linearGradient id="${uid}-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#e8a06a"/><stop offset="1" stop-color="#f7ead9"/>
        </linearGradient>
        <linearGradient id="${uid}-sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#c5a572"/><stop offset="1" stop-color="#b8845f"/>
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill="url(#${uid}-sky)"/>
      <circle cx="200" cy="120" r="38" fill="#f0c48a"/>
      <rect x="0" y="170" width="400" height="80" fill="url(#${uid}-sea)"/>
      <path d="M0 170 Q100 160 200 170 T400 170V175 Q300 185 200 175 T0 175Z" fill="#f3e3d3" opacity="0.5"/>
      <rect x="0" y="248" width="400" height="52" fill="#e8d5b7"/>
      <path d="M0 248 Q100 238 200 248 T400 248V260 Q300 250 200 258 T0 252Z" fill="#fdfcf8" opacity="0.5"/>`;
  },

  // Abstracta — textura cálida no representacional, para los ejemplos de
  // contenido sensible/spoiler (el blur la cubre casi siempre; no necesita
  // "ser" nada en concreto una vez revelada).
  abstracta(uid) {
    return `
      <defs>
        <radialGradient id="${uid}-bg" cx="35%" cy="30%" r="80%">
          <stop offset="0%" stop-color="#f7ead9"/><stop offset="100%" stop-color="#e5e0d3"/>
        </radialGradient>
      </defs>
      <rect width="400" height="300" fill="url(#${uid}-bg)"/>
      <circle cx="140" cy="110" r="90" fill="#c5a572" opacity="0.35"/>
      <circle cx="270" cy="190" r="110" fill="#a85432" opacity="0.18"/>
      <circle cx="230" cy="90" r="50" fill="#8b6f47" opacity="0.25"/>`;
  },
};

/** illustrationSVG(key) -> string <svg>. Clave desconocida cae a "generica". */
function illustrationSVG(key) {
  const uid = nextIlloUid();
  const build = ILLUSTRATIONS[key] || ILLUSTRATIONS.generica;
  return illoWrap(uid, build);
}

if (typeof window !== "undefined") window.illustrationSVG = illustrationSVG;

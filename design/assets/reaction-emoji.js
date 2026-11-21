/* =========================================================================
   THIUP MOCKUP — REACTION EMOJI
   Puerto 1:1 de src/components/post/ReactionEmoji.js: el set de reacciones
   PROPIO de Thiup (nunca el emoji nativo del sistema operativo) — caras
   doradas redondas con rasgos cafés dibujados a mano sobre la paleta cálida,
   y un corazón TERRACOTA (el acento de marca, no el rojo de Facebook).
   Devuelve un string <svg>. `animated` reproduce el loop estilo FB (usado en
   el popover del picker); en cualquier otro lado las caras son estáticas.
   ========================================================================= */

const RX_FACE_EDGE = "#f0a830";
const RX_INK = "#5b3a1d";
const RX_TEAR = "#7fb3e0";
const RX_HEART_HI = "#f7e6d8";

let rxUidCounter = 0;
function nextRxUid() {
  rxUidCounter += 1;
  return `rx${rxUidCounter}`;
}

/* `inner` renders OUTSIDE <defs> (it's the visible glyph); only the
   gradient itself belongs inside <defs> — mirrors the real <Face> which
   returns a Fragment of <defs>…</defs> + the visible <circle> as siblings. */
function rxFace(uid, inner, from = "#ffe08a", to = "#f6b73c") {
  return `
    <defs>
      <radialGradient id="${uid}-face" cx="50%" cy="38%" r="70%">
        <stop offset="0%" stop-color="${from}"/><stop offset="100%" stop-color="${to}"/>
      </radialGradient>
    </defs>
    <circle cx="16" cy="16" r="14" fill="url(#${uid}-face)" stroke="${RX_FACE_EDGE}" stroke-width="1"/>
    ${inner}`;
}

const RX_GLYPHS = {
  love(uid) {
    return `
      <defs>
        <radialGradient id="${uid}-love" cx="35%" cy="30%" r="90%">
          <stop offset="0%" stop-color="#e26a4a"/><stop offset="100%" stop-color="#b8432c"/>
        </radialGradient>
      </defs>
      <g class="rx-heart">
        <path d="M16 27.2 C 8.9 22.4 4.8 18 4.8 13.1 C 4.8 9.6 7.4 7 10.6 7 C 12.8 7 14.8 8.2 16 10 C 17.2 8.2 19.2 7 21.4 7 C 24.6 7 27.2 9.6 27.2 13.1 C 27.2 18 23.1 22.4 16 27.2 Z" fill="url(#${uid}-love)"/>
        <ellipse cx="11.2" cy="11.6" rx="2.5" ry="1.5" fill="${RX_HEART_HI}" opacity="0.55" transform="rotate(-28 11.2 11.6)"/>
      </g>`;
  },
  laugh(uid) {
    return rxFace(uid, `
      <g class="rx-laughFace">
        <path d="M8 13.6 Q 10.6 10 13.2 13.6" fill="none" stroke="${RX_INK}" stroke-width="2.2" stroke-linecap="round"/>
        <path d="M18.8 13.6 Q 21.4 10 24 13.6" fill="none" stroke="${RX_INK}" stroke-width="2.2" stroke-linecap="round"/>
        <path d="M8.2 17.6 Q 16 27.4 23.8 17.6 Z" fill="${RX_INK}"/>
        <path d="M11.2 21.4 Q 16 25.2 20.8 21.4 Q 16 27 11.2 21.4 Z" fill="#e0674f"/>
      </g>`);
  },
  wow(uid) {
    return rxFace(uid, `
      <g class="rx-wowBrows">
        <path d="M8.6 10.4 Q 10.8 8.2 13 10.1" fill="none" stroke="${RX_INK}" stroke-width="1.9" stroke-linecap="round"/>
        <path d="M19 10.1 Q 21.2 8.2 23.4 10.4" fill="none" stroke="${RX_INK}" stroke-width="1.9" stroke-linecap="round"/>
      </g>
      <ellipse cx="10.9" cy="14.4" rx="1.7" ry="2.4" fill="${RX_INK}"/>
      <ellipse cx="21.1" cy="14.4" rx="1.7" ry="2.4" fill="${RX_INK}"/>
      <ellipse class="rx-wowMouth" cx="16" cy="22.4" rx="3.4" ry="4.1" fill="${RX_INK}"/>`);
  },
  sad(uid) {
    return rxFace(uid, `
      <g class="rx-sadFace">
        <path d="M8.6 12.9 Q 10.6 12.7 12.6 10.9" fill="none" stroke="${RX_INK}" stroke-width="1.8" stroke-linecap="round"/>
        <path d="M19.4 10.9 Q 21.4 12.7 23.4 12.9" fill="none" stroke="${RX_INK}" stroke-width="1.8" stroke-linecap="round"/>
        <ellipse cx="11.2" cy="16.2" rx="1.4" ry="1.9" fill="${RX_INK}"/>
        <ellipse cx="20.8" cy="16.2" rx="1.4" ry="1.9" fill="${RX_INK}"/>
        <path d="M11.6 24 Q 16 20.8 20.4 24" fill="none" stroke="${RX_INK}" stroke-width="2" stroke-linecap="round"/>
      </g>
      <path class="rx-sadTear" d="M11.2 18.2 C 9.9 20.2 9.3 21.5 10.1 22.7 C 10.9 23.9 12.8 23.7 13.3 22.3 C 13.8 21 12.8 19.5 11.2 18.2 Z" fill="${RX_TEAR}"/>`);
  },
  angry(uid) {
    // The flush's <linearGradient> must sit in its OWN <defs> (not nested
    // inside rxFace's returned markup, which already closed its <defs>).
    return `
      <defs>
        <linearGradient id="${uid}-flush" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stop-color="#c9401f" stop-opacity="0.9"/>
          <stop offset="60%" stop-color="#c9401f" stop-opacity="0.45"/>
          <stop offset="100%" stop-color="#c9401f" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <g class="rx-angryFace">
        ${rxFace(uid, `
          <circle class="rx-angryFlush" cx="16" cy="16" r="14" fill="url(#${uid}-flush)"/>
          <path d="M8.4 12.6 L 13.2 14.2" stroke="${RX_INK}" stroke-width="2.1" stroke-linecap="round"/>
          <path d="M23.6 12.6 L 18.8 14.2" stroke="${RX_INK}" stroke-width="2.1" stroke-linecap="round"/>
          <circle cx="11.4" cy="16.8" r="1.5" fill="${RX_INK}"/>
          <circle cx="20.6" cy="16.8" r="1.5" fill="${RX_INK}"/>
          <path d="M11.4 23.4 Q 16 21.2 20.6 23.4" fill="none" stroke="${RX_INK}" stroke-width="2.1" stroke-linecap="round"/>
        `, "#f6a13f", "#dd5b33")}
      </g>`;
  },
  applause(uid) {
    return `
      <defs>
        <radialGradient id="${uid}-hand" cx="40%" cy="30%" r="80%">
          <stop offset="0%" stop-color="#ffe08a"/><stop offset="100%" stop-color="#f0a830"/>
        </radialGradient>
      </defs>
      <g class="rx-sparks" stroke="#a85432" stroke-width="1.6" stroke-linecap="round">
        <path d="M16 6.2 v-2.4"/><path d="M10.6 8 l-1.7 -1.7"/><path d="M21.4 8 l1.7 -1.7"/>
      </g>
      <g class="rx-handLeft">
        <g transform="rotate(14 10.5 18)">
          <path d="M7.2 25.5 C 5.9 23.9 5.6 21.4 5.9 19 L 6.5 12.4 C 6.6 11.3 8.2 11.1 8.5 12.2 L 8.9 14.2 L 9.3 10.4 C 9.4 9.2 11.1 9.1 11.3 10.3 L 11.7 13.8 L 12.5 10.9 C 12.8 9.8 14.4 10 14.4 11.2 L 14.3 15.4 L 14.9 17 C 15.5 19.9 15.2 22.9 13.6 25.1 Z" fill="url(#${uid}-hand)" stroke="${RX_FACE_EDGE}" stroke-width="1" stroke-linejoin="round"/>
          <path d="M8.9 14.6 L 9 17" fill="none" stroke="${RX_FACE_EDGE}" stroke-width="0.9" stroke-linecap="round"/>
          <path d="M11.7 14.2 L 11.7 17" fill="none" stroke="${RX_FACE_EDGE}" stroke-width="0.9" stroke-linecap="round"/>
          <path d="M14 24.4 C 15.9 23.3 16.7 21.2 16.2 18.6 C 16 17.5 14.6 17.5 14.3 18.6 Z" fill="url(#${uid}-hand)" stroke="${RX_FACE_EDGE}" stroke-width="1" stroke-linejoin="round"/>
        </g>
      </g>
      <g class="rx-handRight">
        <g transform="rotate(-14 21.5 18)">
          <path d="M24.8 25.5 C 26.1 23.9 26.4 21.4 26.1 19 L 25.5 12.4 C 25.4 11.3 23.8 11.1 23.5 12.2 L 23.1 14.2 L 22.7 10.4 C 22.6 9.2 20.9 9.1 20.7 10.3 L 20.3 13.8 L 19.5 10.9 C 19.2 9.8 17.6 10 17.6 11.2 L 17.7 15.4 L 17.1 17 C 16.5 19.9 16.8 22.9 18.4 25.1 Z" fill="url(#${uid}-hand)" stroke="${RX_FACE_EDGE}" stroke-width="1" stroke-linejoin="round"/>
          <path d="M23.1 14.6 L 23 17" fill="none" stroke="${RX_FACE_EDGE}" stroke-width="0.9" stroke-linecap="round"/>
          <path d="M20.3 14.2 L 20.3 17" fill="none" stroke="${RX_FACE_EDGE}" stroke-width="0.9" stroke-linecap="round"/>
          <path d="M18 24.4 C 16.1 23.3 15.3 21.2 15.8 18.6 C 16 17.5 17.4 17.5 17.7 18.6 Z" fill="url(#${uid}-hand)" stroke="${RX_FACE_EDGE}" stroke-width="1" stroke-linejoin="round"/>
        </g>
      </g>`;
  },
};

/**
 * reactionEmojiSVG(name, size, animated) -> string de <svg>.
 * `name`: love | laugh | wow | sad | angry | applause
 */
function reactionEmojiSVG(name, size = 20, animated = false) {
  const uid = nextRxUid();
  const build = RX_GLYPHS[name];
  if (!build) return "";
  return `<svg class="rx-root${animated ? " rx-animated" : ""}" width="${size}" height="${size}" viewBox="0 0 32 32" aria-hidden="true" focusable="false">${build(uid)}</svg>`;
}

if (typeof window !== "undefined") window.reactionEmojiSVG = reactionEmojiSVG;

/* =========================================================================
   THIUP MOCKUP — MASK AVATAR
   Puerto 1:1 del algoritmo real (src/components/MaskAvatar.js): identicon
   procedural a partir de una semilla (hash de la máscara). Misma semilla →
   mismo avatar, sin red. Devuelve un string SVG.
   ========================================================================= */

const MASK_PAIRS = [
  ["#a85432", "#fdfcf8"],
  ["#b8845f", "#fdfcf8"],
  ["#8b6f47", "#f3e3d3"],
  ["#c5a572", "#fdfcf8"],
  ["#f3e3d3", "#a85432"],
  ["#f0e3d2", "#8b6f47"],
  ["#e8d5b7", "#a85432"],
  ["#dac4a8", "#5a4a3a"],
  ["#5a4a3a", "#e8d5b7"],
  ["#1a1a1a", "#c5a572"],
];

const MASK_VB = 36;
const MASK_VC = MASK_VB / 2;
const SERPENTINE_D = "M 12.7 9.3 Q 24.4 13.6 12.7 18 Q 24.4 22.4 12.7 26.7";
const SERPENTINE_DOT = { x: 23.6, y: 10.1 };

function maskExtractByte(hex, idx) {
  if (!hex || hex.length === 0) return 0;
  const offset = (idx * 2) % hex.length;
  const raw = (hex.substr(offset, 2) || "00").padEnd(2, "0");
  const parsed = parseInt(raw, 16);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function maskPolar(cx, cy, radius, angleDeg) {
  const a = (angleDeg * Math.PI) / 180;
  return {
    x: +(cx + radius * Math.cos(a)).toFixed(2),
    y: +(cy + radius * Math.sin(a)).toFixed(2),
  };
}

function maskArcPath(cx, cy, radius, start, sweep) {
  const p0 = maskPolar(cx, cy, radius, start);
  const p1 = maskPolar(cx, cy, radius, start + sweep);
  const largeArc = sweep > 180 ? 1 : 0;
  return `M ${p0.x} ${p0.y} A ${radius} ${radius} 0 ${largeArc} 1 ${p1.x} ${p1.y}`;
}

function maskParams(seed) {
  const raw = (seed || "").toString().replace(/-/g, "").toLowerCase();
  if (!raw) return null;
  const [bg, fg] = MASK_PAIRS[maskExtractByte(raw, 0) % MASK_PAIRS.length];
  const start = (maskExtractByte(raw, 1) % 16) * 22.5;
  const sweepByte = maskExtractByte(raw, 2);
  const sizeByte = maskExtractByte(raw, 3);
  const variant = maskExtractByte(raw, 4) % 4;
  const dotR = +(2.7 + (maskExtractByte(raw, 5) / 256) * 0.9).toFixed(2);

  const strokes = [];
  let dot;
  let rotation = 0;

  if (variant === 0) {
    const radius = sizeByte % 2 ? 10.5 : 8.5;
    const sweep = 130 + (sweepByte / 256) * 130;
    strokes.push({ d: maskArcPath(MASK_VC, MASK_VC, radius, start, sweep), w: 4 });
    dot = { ...maskPolar(MASK_VC, MASK_VC, radius, start + sweep + (360 - sweep) / 2), r: dotR };
  } else if (variant === 1) {
    const sweepOut = 150 + (sweepByte / 256) * 100;
    const sweepIn = 140 + (sizeByte / 256) * 80;
    strokes.push({ d: maskArcPath(MASK_VC, MASK_VC, 11, start, sweepOut), w: 3.4 });
    strokes.push({ d: maskArcPath(MASK_VC, MASK_VC, 5.8, start + sweepOut + 50, sweepIn), w: 3.4 });
    dot = { ...maskPolar(MASK_VC, MASK_VC, 11, start + sweepOut + (360 - sweepOut) / 2), r: dotR };
  } else if (variant === 2) {
    rotation = (maskExtractByte(raw, 1) % 8) * 45;
    strokes.push({ d: SERPENTINE_D, w: 3.1 });
    dot = { ...SERPENTINE_DOT, r: dotR };
  } else {
    const anchor = (sizeByte % 4) * 90 + 45;
    const c = maskPolar(MASK_VC, MASK_VC, 4.2, anchor);
    const sweep = 235 + (sweepByte / 256) * 65;
    strokes.push({ d: maskArcPath(c.x, c.y, 6.4, start, sweep), w: 3.6 });
    dot = { ...maskPolar(MASK_VC, MASK_VC, 12.2, anchor + 180), r: dotR };
  }

  return { bg, fg, strokes, dot, rotation };
}

/**
 * maskAvatarSVG(seed, size, opts) -> string de <svg>.
 * opts: { online, ringColor, snapRing }
 */
function maskAvatarSVG(seed, size = 32, opts = {}) {
  const params = maskParams(seed);
  const ring = opts.snapRing
    ? `outline:2px solid #b8845f;outline-offset:1px;`
    : `outline:0.5px solid rgba(0,0,0,0.15);outline-offset:-0.5px;`;
  const style = `border-radius:50%;display:block;flex:none;${ring}`;
  let svg;
  if (!params) {
    svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${MASK_VB} ${MASK_VB}" style="${style}" aria-hidden="true"><rect width="${MASK_VB}" height="${MASK_VB}" fill="#ebe7dd"/></svg>`;
  } else {
    const { bg, fg, strokes, dot, rotation } = params;
    const g = rotation ? ` transform="rotate(${rotation} ${MASK_VC} ${MASK_VC})"` : "";
    const strokesSvg = strokes
      .map((s) => `<path d="${s.d}" stroke="${fg}" stroke-width="${s.w}" stroke-linecap="round" fill="none"/>`)
      .join("");
    svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${MASK_VB} ${MASK_VB}" style="${style}" aria-hidden="true">
      <rect width="${MASK_VB}" height="${MASK_VB}" fill="${bg}"/>
      <g${g}>${strokesSvg}<circle cx="${dot.x}" cy="${dot.y}" r="${dot.r}" fill="${fg}"/></g>
    </svg>`;
  }

  if (!opts.online) return svg;

  const dotSize = Math.max(8, Math.round((size * 10) / 36));
  const ringColor = opts.ringColor || "#fdfcf8";
  return `<span style="position:relative;display:block;flex:none;width:${size}px;height:${size}px;">
    ${svg}
    <span aria-hidden="true" style="position:absolute;bottom:-1px;right:-2px;width:${dotSize}px;height:${dotSize}px;background:rgb(94,231,71);border-radius:50%;border:2px solid ${ringColor};box-sizing:content-box;"></span>
  </span>`;
}

if (typeof window !== "undefined") window.maskAvatarSVG = maskAvatarSVG;

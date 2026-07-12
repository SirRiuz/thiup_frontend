import { useMemo } from "react";

// Threads' exact activity green — their `--barcelona-green-dot` token
// (rgb(94, 231, 71), same value in light and dark theme).
const ONLINE_GREEN = "rgb(94, 231, 71)";
// Ring around the dot (Threads uses `--background-primary`, i.e. the surface
// the avatar sits on). Default = our card surface; screens whose avatars sit
// directly on the page bg override it via `ringColor`.
const ONLINE_RING = "#fdfcf8";
// Threads' reference geometry: a 10px dot with a 2px ring on a 36px avatar.
const DOT_REF_AVATAR = 36;
const DOT_REF_SIZE = 10;

// === The mask's visual language: a COILED THREAD + ITS DOT ===
// Every mask is the brand mark retold: one bold rounded thread (an arc, each
// mask coiled differently) and the dot that starts it, resting in the coil's
// opening. Drawn in a normalized 36-unit box so strokes keep the same visual
// weight at every avatar size.
const VB = 36;
const VC = VB / 2;

// Curated warm DUOTONE pairs [background · thread] — the whole avatar palette
// lives inside the app's warm family (terracotta, browns, sands, creams; the
// old independent bg/fg roll produced brown-on-brown collisions and muddy
// off-palette greens/blues). Every pair is pre-checked for contrast.
const PAIRS = [
  ["#a85432", "#fdfcf8"], // terracotta · cream — the brand tile itself
  ["#b8845f", "#fdfcf8"], // warm accent · cream
  ["#8b6f47", "#f3e3d3"], // deep brown · warm tint
  ["#c5a572", "#fdfcf8"], // sand · cream
  ["#f3e3d3", "#a85432"], // warm tint · terracotta — the inverted tile
  ["#f0e3d2", "#8b6f47"], // parchment · deep brown
  ["#e8d5b7", "#a85432"], // wheat · terracotta
  ["#dac4a8", "#5a4a3a"], // dune · umber
  ["#5a4a3a", "#e8d5b7"], // umber · wheat
  ["#1a1a1a", "#c5a572"], // ink · sand — the rare striking one
];

function extractByte(hex, idx) {
  if (!hex || hex.length === 0) return 0;
  const offset = (idx * 2) % hex.length;
  const raw = (hex.substr(offset, 2) || "00").padEnd(2, "0");
  const parsed = parseInt(raw, 16);
  return Number.isNaN(parsed) ? 0 : parsed;
}

// Polar point around an arbitrary center (angles in degrees, 0° = east).
function polar(cx, cy, radius, angleDeg) {
  const a = (angleDeg * Math.PI) / 180;
  return {
    x: +(cx + radius * Math.cos(a)).toFixed(2),
    y: +(cy + radius * Math.sin(a)).toFixed(2),
  };
}

// SVG arc path of `sweep` degrees starting at `start`, around (cx, cy).
function arcPath(cx, cy, radius, start, sweep) {
  const p0 = polar(cx, cy, radius, start);
  const p1 = polar(cx, cy, radius, start + sweep);
  const largeArc = sweep > 180 ? 1 : 0;
  return `M ${p0.x} ${p0.y} A ${radius} ${radius} 0 ${largeArc} 1 ${p1.x} ${p1.y}`;
}

// The brand's serpentine, scaled from its 68-unit master to the 36 box
// (path M24 17.5 Q46 25.75 24 34 Q46 42.25 24 50.5 · dot 44.5,19).
const SERPENTINE_D =
  "M 12.7 9.3 Q 24.4 13.6 12.7 18 Q 24.4 22.4 12.7 26.7";
const SERPENTINE_DOT = { x: 23.6, y: 10.1 };

/**
 * Green "active now" dot overlaid on the avatar's bottom-right corner
 * (Threads-style). Rendered only when `online` is true, so avatars without
 * presence keep the exact legacy markup.
 */
function OnlineDot({ size, ringColor }) {
  // Threads-exact geometry: the GREEN CONTENT is 10px (at 36px avatars) and the
  // 2px ring grows OUTWARD (content-box), total 14px. Their wrapper anchors at
  // bottom: 1px / right: 0 and lets the ring overflow 2px on every side — with
  // a single border-box-positioned span that is bottom: -1px / right: -2px.
  const dot = Math.max(8, Math.round((size * DOT_REF_SIZE) / DOT_REF_AVATAR));
  return (
    <span
      aria-label="online"
      style={{
        position: "absolute",
        bottom: -1,
        right: -2,
        width: dot,
        height: dot,
        background: ONLINE_GREEN,
        borderRadius: "50%",
        border: `2px solid ${ringColor || ONLINE_RING}`,
        boxSizing: "content-box",
        pointerEvents: "none",
      }}
    />
  );
}

/**
 * MaskAvatar — Procedural SVG avatar generated from a seed (the mask hash).
 *
 * The visual language IS the brand mark retold: every mask is a coiled
 * thread (a bold rounded arc, each seed coiling it differently) plus the dot
 * that starts it, resting in the coil's opening — on a curated warm duotone.
 * Same seed always produces the same avatar. Pure component, no network,
 * no storage. Accepts both `seed` and `id` for drop-in compatibility with
 * the legacy Identicon API.
 *
 * `online`: when true, wraps the avatar and overlays the Threads-style green
 * activity dot (bottom-right). Falsy/omitted -> identical legacy render.
 * `ringColor`: the dot's cut-out ring — must match the surface BEHIND the
 * avatar (defaults to the card surface #fdfcf8).
 */
function MaskAvatar({
  seed,
  id,
  size = 32,
  className,
  online = false,
  ringColor,
}) {
  const params = useMemo(() => {
    const raw = (seed || id || "").toString().replace(/-/g, "").toLowerCase();
    if (!raw) return null;

    // Deterministic traits (same seed → same mask, always). Four ARCHETYPES
    // of the same thread+dot language, plus independent per-seed knobs
    // (start angle, sweep, coil radius, dot size, rotation) — variety comes
    // from composition, never from leaving the brand language.
    const [bg, fg] = PAIRS[extractByte(raw, 0) % PAIRS.length];
    const start = (extractByte(raw, 1) % 16) * 22.5;
    const sweepByte = extractByte(raw, 2);
    const sizeByte = extractByte(raw, 3);
    const variant = extractByte(raw, 4) % 4;
    const dotR = +(2.7 + (extractByte(raw, 5) / 256) * 0.9).toFixed(2);

    // Each stroke: { d, w (stroke width) }; the dot never collides with the
    // thread by construction (it lives in a gap/opposite orbit).
    const strokes = [];
    let dot;
    let rotation = 0;

    if (variant === 0) {
      // — Single coil: one bold arc, the dot in the coil's opening.
      const radius = sizeByte % 2 ? 10.5 : 8.5;
      const sweep = 130 + (sweepByte / 256) * 130; // 130–260°
      strokes.push({ d: arcPath(VC, VC, radius, start, sweep), w: 4 });
      dot = { ...polar(VC, VC, radius, start + sweep + (360 - sweep) / 2), r: dotR };
    } else if (variant === 1) {
      // — Double coil: the thread wound twice (concentric arcs, offset
      //   mouths), the dot in the OUTER opening.
      const sweepOut = 150 + (sweepByte / 256) * 100; // 150–250°
      const sweepIn = 140 + (sizeByte / 256) * 80; // 140–220°
      strokes.push({ d: arcPath(VC, VC, 11, start, sweepOut), w: 3.4 });
      strokes.push({
        d: arcPath(VC, VC, 5.8, start + sweepOut + 50, sweepIn),
        w: 3.4,
      });
      dot = {
        ...polar(VC, VC, 11, start + sweepOut + (360 - sweepOut) / 2),
        r: dotR,
      };
    } else if (variant === 2) {
      // — The serpentine: the logo's own winding (scaled master path),
      //   rotated in 45° steps, its dot riding the first bend.
      rotation = (extractByte(raw, 1) % 8) * 45;
      strokes.push({ d: SERPENTINE_D, w: 3.1 });
      dot = { ...SERPENTINE_DOT, r: dotR };
    } else {
      // — Orbit: a tight, nearly-closed coil pulled off-center, the dot
      //   orbiting far on the opposite side.
      const anchor = (sizeByte % 4) * 90 + 45; // quadrant the coil leans to
      const c = polar(VC, VC, 4.2, anchor);
      const sweep = 235 + (sweepByte / 256) * 65; // 235–300°
      strokes.push({ d: arcPath(c.x, c.y, 6.4, start, sweep), w: 3.6 });
      dot = { ...polar(VC, VC, 12.2, anchor + 180), r: dotR };
    }

    return { bg, fg, strokes, dot, rotation };
  }, [seed, id]);

  if (!params) {
    return (
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${VB} ${VB}`}
        className={className}
        aria-hidden="true"
        style={{ borderRadius: "50%", display: "block", flex: "none" }}
      >
        <rect width={VB} height={VB} fill="#ebe7dd" />
      </svg>
    );
  }

  const { bg, fg, strokes, dot, rotation } = params;

  const avatar = (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${VB} ${VB}`}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      style={{ borderRadius: "50%", display: "block", flex: "none" }}
    >
      <rect width={VB} height={VB} fill={bg} />
      <g
        transform={
          rotation ? `rotate(${rotation} ${VC} ${VC})` : undefined
        }
      >
        {/* The thread (coil / double coil / serpentine / orbit)… */}
        {strokes.map((s, i) => (
          <path
            key={i}
            d={s.d}
            stroke={fg}
            strokeWidth={s.w}
            strokeLinecap="round"
            fill="none"
          />
        ))}
        {/* …and its dot (the brand's "whoever starts the thread"). */}
        <circle cx={dot.x} cy={dot.y} r={dot.r} fill={fg} />
      </g>
    </svg>
  );

  if (!online) return avatar;

  // Relative wrapper sized exactly like the svg, so surrounding flex/grid
  // layouts see the same box they saw before the indicator existed.
  return (
    <span
      style={{
        position: "relative",
        display: "block",
        flex: "none",
        width: size,
        height: size,
      }}
    >
      {avatar}
      <OnlineDot size={size} ringColor={ringColor} />
    </span>
  );
}

export default MaskAvatar;

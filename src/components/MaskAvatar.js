import { useMemo } from "react";

const BG_COLORS = [
  "#f0e3d2", "#e8d5b7", "#dac4a8", "#d4cfbf", "#e0d4c1",
  "#c9b18a", "#c5a572", "#b8845f", "#a37e6e", "#9b8c7b",
  "#8b9d83", "#7a8b6e", "#6b7a8c", "#a89070", "#8c7a6a",
  "#b89a7a",
];

const FG_COLORS = [
  "#1a1a1a", "#2d2d2d", "#3d3d3d",
  "#fdfcf8", "#f0e3d2",
  "#5a4a3a", "#4a3d2e", "#2d3a4a",
];

function extractByte(hex, idx) {
  if (!hex || hex.length === 0) return 0;
  const offset = (idx * 2) % hex.length;
  const raw = (hex.substr(offset, 2) || "00").padEnd(2, "0");
  const parsed = parseInt(raw, 16);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function buildShape(shapeIdx, cx, cy, r, rotation, fg) {
  switch (shapeIdx) {
    case 0:
      return <circle cx={cx} cy={cy} r={r} fill={fg} opacity="0.85" />;
    case 1: {
      const points = [
        `${cx},${cy - r}`,
        `${cx + r * 0.866},${cy + r * 0.5}`,
        `${cx - r * 0.866},${cy + r * 0.5}`,
      ].join(" ");
      return (
        <polygon
          points={points}
          fill={fg}
          opacity="0.85"
          transform={`rotate(${rotation} ${cx} ${cy})`}
        />
      );
    }
    case 2:
      return (
        <rect
          x={cx - r}
          y={cy - r}
          width={r * 2}
          height={r * 2}
          fill={fg}
          opacity="0.85"
          transform={`rotate(${rotation} ${cx} ${cy})`}
        />
      );
    case 3:
      return (
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy} L ${cx - r} ${cy} Z`}
          fill={fg}
          opacity="0.85"
          transform={`rotate(${rotation} ${cx} ${cy})`}
        />
      );
    case 4: {
      const pts = [];
      for (let i = 0; i < 6; i += 1) {
        const a = ((i / 6) * 360 + rotation) * (Math.PI / 180);
        pts.push(
          `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`
        );
      }
      return <polygon points={pts.join(" ")} fill={fg} opacity="0.85" />;
    }
    case 5:
      return (
        <g>
          <circle cx={cx - r * 0.4} cy={cy} r={r * 0.55} fill={fg} opacity="0.75" />
          <circle cx={cx + r * 0.4} cy={cy} r={r * 0.55} fill={fg} opacity="0.85" />
        </g>
      );
    case 6:
      return (
        <path
          d={`M ${cx} ${cy - r} A ${r} ${r} 0 1 0 ${cx} ${cy + r} A ${r * 0.55} ${r} 0 1 1 ${cx} ${cy - r} Z`}
          fill={fg}
          opacity="0.85"
          transform={`rotate(${rotation} ${cx} ${cy})`}
        />
      );
    case 7:
    default:
      return (
        <rect
          x={cx - r}
          y={cy - r * 0.42}
          width={r * 2}
          height={r * 0.84}
          rx={r * 0.42}
          fill={fg}
          opacity="0.85"
          transform={`rotate(${rotation} ${cx} ${cy})`}
        />
      );
  }
}

/**
 * MaskAvatar — Procedural SVG avatar generated from a seed (UUID).
 *
 * Same seed always produces the same avatar. Pure component, no network,
 * no storage. Accepts both `seed` and `id` for drop-in compatibility with
 * the legacy Identicon API.
 */
function MaskAvatar({ seed, id, size = 32, className }) {
  const params = useMemo(() => {
    const raw = (seed || id || "").toString().replace(/-/g, "").toLowerCase();
    if (!raw) return null;

    const bg = BG_COLORS[extractByte(raw, 0) % BG_COLORS.length];
    const fg = FG_COLORS[extractByte(raw, 1) % FG_COLORS.length];
    const shapeIdx = extractByte(raw, 2) % 8;
    const rotation = (extractByte(raw, 3) / 256) * 360;
    const posX = 0.3 + (extractByte(raw, 4) / 256) * 0.4;
    const posY = 0.3 + (extractByte(raw, 5) / 256) * 0.4;
    const scale = 0.42 + (extractByte(raw, 6) / 256) * 0.28;

    return {
      bg,
      fg,
      shapeIdx,
      rotation,
      cx: posX * size,
      cy: posY * size,
      r: (scale * size) / 2,
    };
  }, [seed, id, size]);

  if (!params) {
    return (
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className={className}
        aria-hidden="true"
        style={{ borderRadius: "50%", display: "block", flex: "none" }}
      >
        <rect width={size} height={size} fill="#ebe7dd" />
      </svg>
    );
  }

  const { bg, fg, shapeIdx, rotation, cx, cy, r } = params;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      style={{ borderRadius: "50%", display: "block", flex: "none" }}
    >
      <rect width={size} height={size} fill={bg} />
      {buildShape(shapeIdx, cx, cy, r, rotation, fg)}
    </svg>
  );
}

export default MaskAvatar;

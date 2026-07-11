import { useId, useMemo } from "react";
import generateTagActivity from "../../utils/generateTagActivity";

/**
 * Line sparkline with area for a tag's activity (posts/day).
 *
 * Mark spec (dataviz): 2px smooth line (Catmull-Rom → cubic bezier), an area
 * that FADES to transparent at the baseline (vertical gradient, not a flat
 * wash), and an EMPHASIZED endpoint — 3px dot with a surface ring so it reads
 * above the line. Single series: no legend, no axes; decorative within the
 * row (aria-hidden) — identity/values live in the row's text.
 *
 * Props:
 *   data:     REAL activity series (posts per day, chronological order).
 *             Takes priority; if it doesn't arrive (or has <2 points) it falls
 *             back to the deterministic mock by seed to not break the UI.
 *   maxValue: GLOBAL maximum across all visible tags. With it the scale is
 *             shared (floor 0, ceiling maxValue): a peak of 4 looks 4× higher
 *             than a peak of 1, and the charts are comparable across tags.
 *             Without it (fallback) it normalizes to the local max, as before.
 *   seed:     string used as the seed of the mock fallback (the tag.name)
 *   width:    width in px (default 104)
 *   height:   height in px (default 32)
 */

const STROKE = "#b8845f"; // warm accent — the app's data hue
const RING = "#fdfcf8"; // surface ring around the endpoint
const PAD = 5; // room for the ringed endpoint at the edges

/**
 * Converts a list of points into a smooth SVG path using Catmull-Rom
 * translated to cubic bezier curves. This avoids the right angles of a
 * polyline and is what gives the "nice" look.
 */
function smoothLine(pts) {
  if (pts.length < 2) return "";
  let d = `M ${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2[0]},${p2[1]}`;
  }
  return d;
}

function TagSparkline({ data, maxValue, seed, width = 104, height = 32 }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const { linePath, areaPath, end } = useMemo(() => {
    // Real series from the backend if it arrives; deterministic mock as fallback.
    const isReal = Array.isArray(data) && data.length >= 2;
    const series = isReal ? data : generateTagActivity(seed);

    // Shared GLOBAL scale (only with real data): floor 0 and ceiling
    // maxValue, so the heights are comparable across tags. The mock fallback
    // isn't comparable with anything, so it keeps the local normalization.
    const useGlobalScale =
      isReal && typeof maxValue === "number" && maxValue > 0;
    const min = useGlobalScale ? 0 : Math.min(...series);
    const max = useGlobalScale ? maxValue : Math.max(...series);
    // Avoids division by zero: flat series (e.g. all at 0) => range 1, the
    // line stays flat at the bottom without breaking.
    const range = max - min || 1;

    const innerW = width - PAD * 2;
    const innerH = height - PAD * 2;

    // x uniform; y normalized and inverted (SVG grows downward).
    const pts = series.map((v, i) => {
      const x =
        PAD + (series.length === 1 ? 0 : (i / (series.length - 1)) * innerW);
      const y = PAD + (1 - (v - min) / range) * innerH;
      return [x, y];
    });

    const line = smoothLine(pts);
    const first = pts[0];
    const last = pts[pts.length - 1];
    // Area = same curve closed down to the bottom edge.
    const area = `${line} L ${last[0]},${height} L ${first[0]},${height} Z`;

    return { linePath: line, areaPath: area, end: last };
  }, [data, maxValue, seed, width, height]);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
    >
      <defs>
        {/* The area fades OUT toward the baseline — reads as ink washing off
            the line, not a solid band. */}
        <linearGradient id={`${uid}-area`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={STROKE} stopOpacity="0.22" />
          <stop offset="100%" stopColor={STROKE} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${uid}-area)`} stroke="none" />
      <path
        d={linePath}
        fill="none"
        stroke={STROKE}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Emphasized endpoint: dot + surface ring, floating above the line. */}
      <circle cx={end[0]} cy={end[1]} r={4.5} fill={RING} />
      <circle cx={end[0]} cy={end[1]} r={3} fill={STROKE} />
    </svg>
  );
}

export default TagSparkline;

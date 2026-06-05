import { useMemo } from "react";
import generateTagActivity from "../../utils/generateTagActivity";

/**
 * Sparkline de línea con área para la actividad de un tag.
 *
 * Línea suave (Catmull-Rom → bezier cúbico), área con fill warm muy sutil y un
 * punto al final que ancla el último valor.
 *
 * Props:
 *   data:     serie REAL de actividad (posts por día, orden cronológico).
 *             Tiene prioridad; si no viene (o tiene <2 puntos) se cae al mock
 *             determinístico por seed para no romper la UI.
 *   maxValue: máximo GLOBAL entre todos los tags visibles. Con él la escala
 *             es compartida (piso 0, techo maxValue): un pico de 4 se ve 4×
 *             más alto que un pico de 1, y las gráficas son comparables entre
 *             tags. Sin él (fallback) se normaliza al max local, como antes.
 *   seed:     string usado como semilla del mock fallback (el tag.name)
 *   width:    ancho en px (default 130)
 *   height:   alto en px (default 34)
 */

const STROKE = "#b8845f";
const PAD = 3; // padding interno para que la línea no toque los bordes

/**
 * Convierte una lista de puntos en un path SVG suave usando Catmull-Rom
 * traducido a curvas bezier cúbicas. Esto evita los ángulos rectos de una
 * polyline y es lo que da el aspecto "lindo".
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

function TagSparkline({ data, maxValue, seed, width = 130, height = 34 }) {
  const { linePath, areaPath, end } = useMemo(() => {
    // Serie real del backend si viene; mock determinístico como fallback.
    const isReal = Array.isArray(data) && data.length >= 2;
    const series = isReal ? data : generateTagActivity(seed);

    // Escala GLOBAL compartida (solo con data real): piso 0 y techo maxValue,
    // para que las alturas sean comparables entre tags. El mock fallback no es
    // comparable con nada, así que conserva la normalización local.
    const useGlobalScale =
      isReal && typeof maxValue === "number" && maxValue > 0;
    const min = useGlobalScale ? 0 : Math.min(...series);
    const max = useGlobalScale ? maxValue : Math.max(...series);
    // Evita división por cero: serie plana (ej: toda en 0) => range 1, la
    // línea queda plana abajo sin romperse.
    const range = max - min || 1;

    const innerW = width - PAD * 2;
    const innerH = height - PAD * 2;

    // x uniforme; y normalizada e invertida (SVG crece hacia abajo).
    const pts = series.map((v, i) => {
      const x =
        PAD + (series.length === 1 ? 0 : (i / (series.length - 1)) * innerW);
      const y = PAD + (1 - (v - min) / range) * innerH;
      return [x, y];
    });

    const line = smoothLine(pts);
    const first = pts[0];
    const last = pts[pts.length - 1];
    // Área = misma curva cerrada hasta el borde inferior.
    const area = `${line} L ${last[0]},${height} L ${first[0]},${height} Z`;

    return { linePath: line, areaPath: area, end: last };
  }, [data, maxValue, seed, width, height]);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path d={areaPath} fill={STROKE} fillOpacity={0.11} stroke="none" />
      <path
        d={linePath}
        fill="none"
        stroke={STROKE}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={end[0]} cy={end[1]} r={2.2} fill={STROKE} />
    </svg>
  );
}

export default TagSparkline;

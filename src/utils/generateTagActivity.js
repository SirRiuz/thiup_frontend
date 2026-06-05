/**
 * Mock data determinístico de actividad por tag.
 *
 * El mismo tagName genera SIEMPRE la misma serie (el name es la semilla),
 * por lo que el sparkline no cambia entre renders ni refrescos. Cuando el
 * backend exponga la serie real, basta reemplazar esta función por la fuente
 * de datos real: el componente TagSparkline no necesita cambios.
 */

// Hash estable de un string → entero positivo (semilla del RNG).
function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0; // fuerza int de 32 bits
  }
  return Math.abs(h);
}

// PRNG lineal congruente sembrado → secuencia determinística en [0, 1).
function seededRandom(seed) {
  let s = seed % 233280;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

/**
 * Genera una serie temporal de `points` valores con picos y valles visibles.
 * @param {string} tagName - semilla (mismo tag → misma línea)
 * @param {number} points  - número de puntos de la serie
 * @returns {number[]}
 */
export default function generateTagActivity(tagName, points = 12) {
  const rng = seededRandom(hashString(tagName || "tag"));
  const data = [];
  let val = 5 + rng() * 12;
  for (let i = 0; i < points; i++) {
    val += (rng() - 0.45) * 9; // variación con leve sesgo al alza
    val = Math.max(1, Math.min(30, val)); // clamp al rango [1, 30]
    data.push(val);
  }
  return data;
}

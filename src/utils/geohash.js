/**
 * Geohash ligero (encode + vecinas) — sin librerías.
 *
 * PRIVACIDAD (Close You): las coordenadas NUNCA salen del dispositivo.
 * Aquí se FUZZEAN (jitter aleatorio ±~1km) y se codifican a una celda
 * GRUESA (precisión 5 ≈ 4.9×4.9 km) — el backend solo recibe celdas.
 * La celda del lector + sus 8 vecinas cubren el radio de ~10-15 km.
 */

const BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";

// Precisión 5 = celdas de ~4.9 km. NO subir: más precisión = menos
// privacidad (y el backend trunca a 5 de todas formas).
export const GEOHASH_PRECISION = 5;

// Fuzzing: jitter uniforme en grados (~±1.1 km) ANTES de codificar — ni
// siquiera la celda es exactamente "donde estás".
export const FUZZ_DEGREES = 0.01;

/** Encode estándar: interleave de bits lon/lat → base32. */
export function encodeGeohash(lat, lon, precision = GEOHASH_PRECISION) {
  let latLo = -90.0;
  let latHi = 90.0;
  let lonLo = -180.0;
  let lonHi = 180.0;
  let result = "";
  let bit = 0;
  let ch = 0;
  let even = true; // arranca con longitud

  while (result.length < precision) {
    if (even) {
      const mid = (lonLo + lonHi) / 2;
      if (lon >= mid) {
        ch = (ch << 1) | 1;
        lonLo = mid;
      } else {
        ch = ch << 1;
        lonHi = mid;
      }
    } else {
      const mid = (latLo + latHi) / 2;
      if (lat >= mid) {
        ch = (ch << 1) | 1;
        latLo = mid;
      } else {
        ch = ch << 1;
        latHi = mid;
      }
    }
    even = !even;
    bit += 1;
    if (bit === 5) {
      result += BASE32[ch];
      bit = 0;
      ch = 0;
    }
  }

  return result;
}

/** Centro y tamaño de la celda de un geohash (para calcular vecinas). */
function decodeCell(geohash) {
  let latLo = -90.0;
  let latHi = 90.0;
  let lonLo = -180.0;
  let lonHi = 180.0;
  let even = true;

  for (const char of geohash) {
    const bits = BASE32.indexOf(char);
    for (let i = 4; i >= 0; i--) {
      const bit = (bits >> i) & 1;
      if (even) {
        const mid = (lonLo + lonHi) / 2;
        if (bit) lonLo = mid;
        else lonHi = mid;
      } else {
        const mid = (latLo + latHi) / 2;
        if (bit) latLo = mid;
        else latHi = mid;
      }
      even = !even;
    }
  }

  return {
    lat: (latLo + latHi) / 2,
    lon: (lonLo + lonHi) / 2,
    latSize: latHi - latLo,
    lonSize: lonHi - lonLo,
  };
}

/**
 * Las 8 celdas vecinas: se decodifica el centro y se re-codifica con
 * offsets de ±1 celda — simple de verificar y sin tablas de lookup.
 */
export function neighborCells(geohash) {
  const { lat, lon, latSize, lonSize } = decodeCell(geohash);
  const neighbors = [];
  for (const dLat of [-1, 0, 1]) {
    for (const dLon of [-1, 0, 1]) {
      if (dLat === 0 && dLon === 0) continue;
      const nLat = lat + dLat * latSize;
      const nLon = lon + dLon * lonSize;
      // Bordes del mundo: clamp de lat, wrap de lon.
      const clampedLat = Math.max(-90, Math.min(90, nLat));
      const wrappedLon = ((nLon + 540) % 360) - 180;
      neighbors.push(
        encodeGeohash(clampedLat, wrappedLon, geohash.length)
      );
    }
  }
  return [...new Set(neighbors)];
}

/**
 * Celdas para consultar el Close You desde una posición: la celda del
 * lector (PRIMERA — el backend le da el boost de misma-celda) + sus 8
 * vecinas. Las coords se fuzzean ANTES de codificar y se descartan —
 * el resultado es EFÍMERO (no persistirlo).
 */
export function cellsForPosition(lat, lon) {
  const fuzzedLat = lat + (Math.random() * 2 - 1) * FUZZ_DEGREES;
  const fuzzedLon = lon + (Math.random() * 2 - 1) * FUZZ_DEGREES;
  const center = encodeGeohash(fuzzedLat, fuzzedLon);
  return [center, ...neighborCells(center)];
}

/** Geohash (fuzzed, precisión 5) para etiquetar un hilo al crearlo. */
export function geohashForPosition(lat, lon) {
  return cellsForPosition(lat, lon)[0];
}

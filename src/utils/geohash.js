/**
 * Lightweight geohash (encode + neighbors) — no libraries.
 *
 * PRIVACY (Close You): the coordinates NEVER leave the device.
 * Here they are FUZZED (random jitter ±~1km) and encoded to a COARSE
 * cell (precision 5 ≈ 4.9×4.9 km) — the backend only receives cells.
 * The reader's cell + its 8 neighbors cover the ~10-15 km radius.
 */

const BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";

// Precision 5 = cells of ~4.9 km. Do NOT raise: more precision = less
// privacy (and the backend truncates to 5 anyway).
export const GEOHASH_PRECISION = 5;

// Fuzzing: uniform jitter in degrees (~±1.1 km) BEFORE encoding — not
// even the cell is exactly "where you are".
export const FUZZ_DEGREES = 0.01;

/** Standard encode: interleave of lon/lat bits → base32. */
export function encodeGeohash(lat, lon, precision = GEOHASH_PRECISION) {
  let latLo = -90.0;
  let latHi = 90.0;
  let lonLo = -180.0;
  let lonHi = 180.0;
  let result = "";
  let bit = 0;
  let ch = 0;
  let even = true; // starts with longitude

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

/** Center and size of a geohash's cell (to compute neighbors). */
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
 * The 8 neighbor cells: the center is decoded and re-encoded with
 * offsets of ±1 cell — simple to verify and without lookup tables.
 */
export function neighborCells(geohash) {
  const { lat, lon, latSize, lonSize } = decodeCell(geohash);
  const neighbors = [];
  for (const dLat of [-1, 0, 1]) {
    for (const dLon of [-1, 0, 1]) {
      if (dLat === 0 && dLon === 0) continue;
      const nLat = lat + dLat * latSize;
      const nLon = lon + dLon * lonSize;
      // World edges: clamp lat, wrap lon.
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
 * Cells to query the Close You from a position: the reader's cell
 * (FIRST — the backend gives it the same-cell boost) + its 8
 * neighbors. The coords are fuzzed BEFORE encoding and discarded —
 * the result is EPHEMERAL (don't persist it).
 */
export function cellsForPosition(lat, lon) {
  const fuzzedLat = lat + (Math.random() * 2 - 1) * FUZZ_DEGREES;
  const fuzzedLon = lon + (Math.random() * 2 - 1) * FUZZ_DEGREES;
  const center = encodeGeohash(fuzzedLat, fuzzedLon);
  return [center, ...neighborCells(center)];
}

/** Geohash (fuzzed, precision 5) to tag a thread on creation. */
export function geohashForPosition(lat, lon) {
  return cellsForPosition(lat, lon)[0];
}

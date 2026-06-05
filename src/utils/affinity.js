/**
 * Perfil de afinidad de tags — 100% client-side.
 *
 * PRIVACIDAD (principio inviolable): este mapa { tag: peso } vive SOLO en
 * localStorage del dispositivo. NUNCA se envía completo al servidor ni se
 * persiste en el backend. Lo único que sale del dispositivo son los top
 * N tags como parámetro de query EFÍMERO del For You — indistinguible de
 * una búsqueda por tags. Si comprometen el servidor, no hay perfil que
 * filtrar.
 *
 * Mismo patrón defensivo que recentSearches.js: localStorage puede estar
 * deshabilitado o lleno — la app nunca se rompe por eso.
 */

import { HASHTAG_RE } from "./hashtags";

const STORAGE_KEY = "thiup:affinity";

// ── Pesos por interacción (ajustables) ────────────────────────────────
// Comentar es la señal más fuerte (esfuerzo), reaccionar media, leer
// (dwell) la más débil. Abrir-y-salir no suma nada.
export const AFFINITY_WEIGHTS = {
  comment: 3,
  reaction: 2,
  dwell: 1,
};

// Dwell: tiempo VISIBLE en el thread para contar como "leyó" (~25s).
export const DWELL_THRESHOLD_MS = 25000;

// Cuántos top tags se envían al For You (solo los nombres, nunca pesos).
// Con POST no hay límite de URL: el cap es por COSTO de la query en el
// backend (filtrar/contar contra muchos tags pesa en la Raspberry).
export const TOP_TAGS_COUNT = 10;

// Decay ligero: al registrar una interacción, los pesos existentes se
// multiplican por DECAY — los intereses recientes pesan más que los
// viejos sin necesidad de timestamps.
const DECAY = 0.99;

// Cap del mapa: nos quedamos con los MAX_TAGS de mayor peso para que el
// perfil no crezca sin límite en localStorage.
const MAX_TAGS = 50;

/** Lee el mapa { tag: peso } desde localStorage. Nunca lanza. */
export function getAffinityMap() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch (err) {
    return {};
  }
}

function persist(map) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch (err) {
    /* storage lleno/deshabilitado: la afinidad simplemente no persiste */
  }
}

/**
 * Extrae los tags de un texto de hilo, normalizados (sin '#', lowercase,
 * sin duplicados). Mismo regex que el resto del frontend y que el backend
 * (los Tag se guardan lowercase). Hilos sin tags → [].
 */
export function extractTags(text) {
  const matches = (text || "").match(HASHTAG_RE) || [];
  return [...new Set(matches.map((t) => t.slice(1).toLowerCase()))];
}

/**
 * Tags del contenido con el que se interactúa (hilo O reply de cualquier
 * nivel): los PROPIOS de su texto; si no tiene, cae a `fallbackTags`
 * (los del hilo raíz — reaccionar a un reply sin tags sigue siendo señal
 * sobre el tema del hilo). Única regla compartida: no duplicar lógica
 * entre hilo y replies.
 */
export function tagsForContent(text, fallbackTags = []) {
  const own = extractTags(text);
  return own.length ? own : fallbackTags;
}

/**
 * Registra una interacción: suma `weight` a CADA tag del contenido
 * (creando la entrada si no existe). Robusto: acepta array o string
 * suelto, ignora vacíos y duplicados. Sin tags → no-op.
 */
export function addInteraction(tags, weight) {
  if (typeof tags === "string") tags = [tags];
  if (!Array.isArray(tags) || tags.length === 0 || !weight) return;

  const map = getAffinityMap();

  // Decay: lo viejo pierde relevancia frente a lo nuevo.
  for (const key of Object.keys(map)) {
    map[key] = map[key] * DECAY;
  }

  for (const tag of tags) {
    const clean = String(tag).trim().toLowerCase();
    if (!clean) continue;
    map[clean] = (map[clean] || 0) + weight;
  }

  // Cap: conservar solo los MAX_TAGS más pesados.
  const entries = Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_TAGS);

  persist(Object.fromEntries(entries));
}

/**
 * Top n tags por peso — SOLO los nombres, los pesos jamás salen de aquí.
 * Mapa vacío (usuario nuevo) → [] → el For You sirve el top global
 * (cold start de FASE 1, sin cambios).
 */
export function getTopTags(n = TOP_TAGS_COUNT) {
  return Object.entries(getAffinityMap())
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([tag]) => tag);
}

/** Borra el perfil (utilidad para debug / ajustes de privacidad futuros). */
export function clearAffinity() {
  persist({});
}

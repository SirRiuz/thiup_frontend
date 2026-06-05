/**
 * Búsquedas recientes en localStorage.
 *
 * Cada entrada: { text, type: 'query' | 'tag', timestamp } — el type permite
 * RE-ejecutar la búsqueda correcta al seleccionarla (query vs modo tag).
 *
 * Se guardan SOLO al ejecutar una búsqueda (Enter / seleccionar sugerencia),
 * nunca mientras se escribe. Máximo MAX_RECENT, sin duplicados (mismo
 * text+type), más reciente primero. Todo con try/catch: localStorage puede
 * estar deshabilitado o lleno — la app no debe romperse por eso.
 */

const STORAGE_KEY = "thiup:recent-searches";
const MAX_RECENT = 8;

export function getRecent() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
}

function persist(entries) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (err) {
    /* storage lleno/deshabilitado: las recientes simplemente no persisten */
  }
}

export function addRecent({ text, type }) {
  const cleaned = (text || "").trim();
  if (!cleaned) return getRecent();
  const entry = { text: cleaned, type: type === "tag" ? "tag" : "query" };
  const rest = getRecent().filter(
    (r) => !(r.text === entry.text && r.type === entry.type)
  );
  const next = [{ ...entry, timestamp: Date.now() }, ...rest].slice(
    0,
    MAX_RECENT
  );
  persist(next);
  return next;
}

export function removeRecent({ text, type }) {
  const next = getRecent().filter(
    (r) => !(r.text === text && r.type === type)
  );
  persist(next);
  return next;
}

export function clearRecent() {
  persist([]);
  return [];
}

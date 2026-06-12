/**
 * Recent searches in localStorage.
 *
 * Each entry: { text, type: 'query' | 'tag', timestamp } — the type allows
 * RE-running the correct search when selecting it (query vs tag mode).
 *
 * Saved ONLY when running a search (Enter / selecting a suggestion),
 * never while typing. At most MAX_RECENT, no duplicates (same
 * text+type), most recent first. All with try/catch: localStorage can
 * be disabled or full — the app must not break because of that.
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
    /* storage full/disabled: the recents simply don't persist */
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

// Full, human date for a timestamp's hover `title` (the compact relative string
// — e.g. "20h" — is what the header renders; this is the context on hover, like
// Threads: "Tuesday, June 23, 2026"). Locale-aware; returns undefined when the
// ISO is missing/invalid so callers can simply spread it onto `title`.
export function fullDateTitle(iso, locale) {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  try {
    return new Intl.DateTimeFormat(locale || "en", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(d);
  } catch (err) {
    return undefined;
  }
}

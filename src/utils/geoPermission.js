/**
 * Geolocation permission state — shared util (Close You and
 * the compose's share-area toggle). Querying the permission is
 * browser metadata, NOT location: it doesn't touch privacy.
 */

/** "granted" | "prompt" | "denied" | null (no Permissions API). */
export async function queryGeolocationPermission() {
  try {
    if (
      typeof navigator !== "undefined" &&
      navigator.permissions &&
      navigator.permissions.query
    ) {
      const status = await navigator.permissions.query({
        name: "geolocation",
      });
      return status.state;
    }
  } catch (err) {
    /* no Permissions API (old Safari) → null: the caller uses a fallback */
  }
  return null;
}

/**
 * Subscription to LIVE permission changes (the user changes it in the
 * browser settings with the page open). Returns a cleanup.
 * No Permissions API → no-op (the callers' fallback covers it).
 */
export function subscribeGeolocationPermission(onChange) {
  let status = null;
  let cancelled = false;
  try {
    if (
      typeof navigator !== "undefined" &&
      navigator.permissions &&
      navigator.permissions.query
    ) {
      navigator.permissions
        .query({ name: "geolocation" })
        .then((permissionStatus) => {
          if (cancelled) return;
          status = permissionStatus;
          permissionStatus.onchange = () =>
            onChange(permissionStatus.state);
        })
        .catch(() => {});
    }
  } catch (err) {
    /* no-op */
  }
  return () => {
    cancelled = true;
    if (status) status.onchange = null;
  };
}

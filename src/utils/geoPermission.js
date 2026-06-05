/**
 * Estado del permiso de geolocalización — util compartida (Close You y
 * el toggle de compartir zona del compose). Consultar el permiso es
 * metadata del navegador, NO ubicación: no toca la privacidad.
 */

/** "granted" | "prompt" | "denied" | null (sin Permissions API). */
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
    /* sin Permissions API (Safari viejo) → null: el caller usa fallback */
  }
  return null;
}

/**
 * Suscripción a cambios EN VIVO del permiso (el usuario lo cambia en los
 * ajustes del navegador con la página abierta). Devuelve cleanup.
 * Sin Permissions API → no-op (el fallback de los callers cubre).
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

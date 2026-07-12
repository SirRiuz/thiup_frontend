/**
 * Config del servidor (GET /config/) — singleton a nivel de módulo, mismo
 * patrón que transportMode/ticket: el transporte de bajo nivel lo escribe
 * durante el bootstrap y el resto del código lo LEE sin volver a la red.
 *
 * Claves relevantes hoy:
 *   - captcha_protect  → el backend exige el pase humano en las escrituras.
 *   - captcha_endpoint → endpoint público del servidor Cap para el widget
 *                        (data-cap-api-endpoint). null cuando está apagado.
 */

let serverConfig = null;

export function setServerConfig(config) {
  serverConfig = config && typeof config === "object" ? config : null;
}

export function getServerConfig() {
  return serverConfig;
}

/** Captcha activo = flag encendido Y endpoint utilizable. */
export function isCaptchaEnabled() {
  return Boolean(serverConfig?.captcha_protect && serverConfig?.captcha_endpoint);
}

export function getCaptchaEndpoint() {
  return isCaptchaEnabled() ? serverConfig.captcha_endpoint : null;
}

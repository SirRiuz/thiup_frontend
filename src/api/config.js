/**
 * Server config (GET /config/) — module-level singleton, same pattern as
 * transportMode/ticket: the low-level transport writes it during bootstrap
 * and the rest of the code READS it without hitting the network again.
 *
 * Keys used today:
 *   - captcha_protect  → the backend requires the human pass on writes.
 *   - captcha_endpoint → public Cap server endpoint for the widget
 *                        (data-cap-api-endpoint). null when disabled.
 */

let serverConfig = null;

export function setServerConfig(config) {
  serverConfig = config && typeof config === "object" ? config : null;
}

export function getServerConfig() {
  return serverConfig;
}

/** Captcha is active = flag on AND a usable endpoint. */
export function isCaptchaEnabled() {
  return Boolean(serverConfig?.captcha_protect && serverConfig?.captcha_endpoint);
}

export function getCaptchaEndpoint() {
  return isCaptchaEnabled() ? serverConfig.captcha_endpoint : null;
}

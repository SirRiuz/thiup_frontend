/**
 * Estado del MODO DE TRANSPORTE (única fuente de verdad), sin dependencias
 * → evita ciclos de import (lo leen ticket.js, transport.js y client.js).
 *
 *   gateway=true  → TODA petición (ticket/config/datos) va por el gateway.
 *   gateway=false → llamadas directas y legibles; CERO peticiones al gateway.
 *
 * El modo lo decide el BACKEND (ENCRYPTED_RESPONSE), descubierto en runtime
 * por transport.js. FAIL-CLOSED: por defecto gateway ON hasta que el sondeo
 * de /config/ resuelva — nunca se degrada a directo por un error de bootstrap.
 */
let mode = { gateway: true, resolved: false };

function getMode() {
  return mode;
}

function setMode(next) {
  mode = next;
}

/** ¿El transporte enruta por el gateway? (punto de verdad único.) */
function shouldUseGateway() {
  return mode.gateway;
}

module.exports = { getMode, setMode, shouldUseGateway };

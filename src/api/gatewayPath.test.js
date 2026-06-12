/**
 * Path ÚNICO POR REQUEST. Verifica unicidad (ruido), formato url-safe, y que
 * el token = HMAC-SHA256(seed, nonce) truncado (mismo cálculo que el backend
 * en Python: hmac(seed, nonce, sha256) → token_matches en tiempo constante).
 */
const CryptoJS = require("crypto-js");
const { newGatewayPath, derive, makeNonce } = require("./gatewayPath");
const { GATEWAY_SEED } = require("../settings");

const HASH_PATH = /^\/[0-9a-f]{24}\/$/;

test("newGatewayPath devuelve { path:/{token}/, nonce } url-safe", () => {
  const { path, nonce } = newGatewayPath();
  expect(path).toMatch(HASH_PATH);
  expect(nonce).toMatch(/^[0-9a-f]{32}$/); // 16 bytes hex
});

test("RUIDO: cada llamada produce un path DISTINTO (nonce aleatorio)", () => {
  const a = newGatewayPath();
  const b = newGatewayPath();
  expect(a.nonce).not.toBe(b.nonce);
  expect(a.path).not.toBe(b.path);
});

test("token = HMAC-SHA256(seed, nonce) truncado — espejo del backend", () => {
  const nonce = makeNonce();
  const expected = CryptoJS.HmacSHA256(nonce, GATEWAY_SEED)
    .toString()
    .slice(0, 24);
  expect(derive(nonce)).toBe(expected);
});

test("derive es determinista para un nonce dado", () => {
  const nonce = "abc123";
  expect(derive(nonce)).toBe(derive(nonce));
});

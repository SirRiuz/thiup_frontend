/**
 * Política "cifrado o nada" + enrutado por el GATEWAY (path rotativo).
 *
 * Modo cifrado forzado (shouldUseGateway → true). Se mockean transport,
 * transportMode, ticket y la util de cripto; dispatch.js y gatewayPath.js
 * corren REALES (para verificar el sellado del sobre y el path /{hash}/).
 * CRA usa resetMocks:true → las implementaciones se fijan en beforeEach.
 */
jest.mock("./transport", () => ({ ensureTransportMode: jest.fn() }));
jest.mock("./transportMode", () => ({ shouldUseGateway: jest.fn() }));
jest.mock("./ticket", () => ({
  getClientAssertion: jest.fn(),
  refreshTicket: jest.fn(),
}));
jest.mock("../services/cripto", () => ({
  encrypt: jest.fn(),
  decrypt: jest.fn(),
}));

import { apiFetch } from "./client";
import { encrypt } from "../services/cripto";
import { ensureTransportMode } from "./transport";
import { shouldUseGateway } from "./transportMode";
import { getClientAssertion, refreshTicket } from "./ticket";

function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: String(status),
    headers: { get: () => "application/json" },
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

const HASH_PATH = /\/[0-9a-f]{24}\/$/; // /{hash}/

beforeEach(() => {
  ensureTransportMode.mockResolvedValue();
  shouldUseGateway.mockReturnValue(true); // modo cifrado → gateway
  getClientAssertion.mockResolvedValue("tok");
  refreshTicket.mockResolvedValue("tok-fresh");
  global.fetch = jest.fn(() => Promise.resolve(jsonResponse(200, { ok: true })));
});

test("fallo de cifrado → NO se envía nada y rechaza con el shape estándar", async () => {
  encrypt.mockImplementation(() => {
    throw new Error("crypto boom");
  });

  await expect(
    apiFetch("/threads/foryou/", { method: "POST", body: "{}" })
  ).rejects.toMatchObject({
    name: "APIError",
    payload: { detail: "encryption_failed" },
  });

  // Lo crítico: NUNCA salió texto plano (ni nada) por la red.
  expect(global.fetch).not.toHaveBeenCalled();
});

test("path ÚNICO por request: el retry usa nonce/token NUEVOS (re-sella fresco)", async () => {
  encrypt.mockImplementation((plain) => ({
    payload: `P(${plain})`,
    data: `C(${plain})`,
  }));

  // primer intento 403 → retry → 200.
  const queue = [jsonResponse(403, {}), jsonResponse(200, { ok: true })];
  global.fetch = jest.fn(() => Promise.resolve(queue.shift()));

  const data = await apiFetch("/reactions/?x=1", {
    method: "POST",
    body: '{"v":1}',
  });
  expect(data).toEqual({ ok: true });

  // encrypt se invocó en CADA intento (2), con el destino real (method,
  // path, query, body) DENTRO del sobre + un nonce por intento.
  expect(encrypt).toHaveBeenCalledTimes(2);
  const inners = encrypt.mock.calls.map((c) => JSON.parse(c[0]));
  for (const inner of inners) {
    expect(inner.method).toBe("POST");
    expect(inner.path).toBe("/reactions/");
    expect(inner.query).toBe("x=1");
    expect(inner.body).toBe('{"v":1}');
    expect(inner.nonce).toMatch(/^[0-9a-f]{32}$/);
  }
  // RUIDO: el nonce (y por tanto el token/URL) CAMBIA entre intentos.
  expect(inners[0].nonce).not.toBe(inners[1].nonce);

  // Cada request salió como POST a un /{token}/ DISTINTO (path único),
  // con el sobre fresco como body (no el endpoint real, no el sobre anterior).
  const urls = global.fetch.mock.calls.map((c) => String(c[0]));
  for (const u of urls) expect(u).toMatch(HASH_PATH);
  expect(urls[0]).not.toBe(urls[1]); // paths distintos por request
  for (const call of global.fetch.mock.calls) {
    expect(call[1].method).toBe("POST");
  }
});

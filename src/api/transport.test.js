/**
 * Detección del modo por SONDEO al gateway con inferencia segura.
 *
 *   - 2xx que descifra → cifrado.
 *   - 404 code=GATEWAY_DISABLED → normal.
 *   - ambiguo (404 genérico / red / descifrado inválido) → fail-closed
 *     (cifrado) + reintentos acotados, sin degradar nunca a texto claro.
 */
jest.mock("./transportMode", () => {
  let mode = { gateway: true, resolved: false };
  return {
    getMode: () => mode,
    setMode: (m) => {
      mode = m;
    },
    shouldUseGateway: () => mode.gateway,
    __reset: () => {
      mode = { gateway: true, resolved: false };
    },
  };
});
jest.mock("./ticket", () => ({
  getClientAssertion: jest.fn(),
  invalidateTicket: jest.fn(),
}));
jest.mock("./dispatch", () => ({ dispatchRequest: jest.fn() }));
jest.mock("./decode", () => ({ parseResponseBody: jest.fn() }));

import { ensureTransportMode } from "./transport";
import { dispatchRequest } from "./dispatch";
import { parseResponseBody } from "./decode";
import { getMode, __reset } from "./transportMode";

beforeEach(() => {
  __reset();
});

test("flag ON: probe 2xx por gateway → modo CIFRADO", async () => {
  dispatchRequest.mockResolvedValue({ ok: true });
  parseResponseBody.mockResolvedValue({ encrypted_response: true });

  await ensureTransportMode();

  expect(getMode().gateway).toBe(true);
  // El probe fue POR EL GATEWAY.
  expect(dispatchRequest.mock.calls[0][0].gateway).toBe(true);
  expect(dispatchRequest.mock.calls[0][0].path).toBe("/config/");
});

test("flag OFF: 404 code=GATEWAY_DISABLED → modo NORMAL", async () => {
  dispatchRequest.mockResolvedValue({
    ok: false,
    status: 404,
    json: async () => ({ detail: "x", code: "GATEWAY_DISABLED" }),
  });

  await ensureTransportMode();

  expect(getMode().gateway).toBe(false); // directo legible
  expect(getMode().resolved).toBe(true);
});

test("404 GENÉRICO (sin código) → AMBIGUO → fail-closed cifrado", async () => {
  dispatchRequest.mockResolvedValue({
    ok: false,
    status: 404,
    json: async () => ({ detail: "Not found" }), // sin code
  });

  await ensureTransportMode();

  // NO se concluye normal: se queda en cifrado.
  expect(getMode().gateway).toBe(true);
  expect(getMode().resolved).toBe(true);
  // Reintentó (hasta el límite) antes de quedarse en cifrado.
  expect(dispatchRequest.mock.calls.length).toBe(3);
});

test("404 con cuerpo CIFRADO (token inválido en modo on) → AMBIGUO → cifrado", async () => {
  dispatchRequest.mockResolvedValue({
    ok: false,
    status: 404,
    json: async () => {
      throw new Error("not json"); // cuerpo cifrado, no parseable
    },
  });

  await ensureTransportMode();

  expect(getMode().gateway).toBe(true); // fail-closed
});

test("error de red en el probe → AMBIGUO → fail-closed cifrado, sin bucle", async () => {
  dispatchRequest.mockRejectedValue(new Error("network down"));

  await ensureTransportMode();

  expect(getMode().gateway).toBe(true);
  expect(getMode().resolved).toBe(true);
  expect(dispatchRequest.mock.calls.length).toBe(3); // límite acotado
});

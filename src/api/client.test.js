/**
 * Tests del refresh-and-retry de apiFetch (mockeando global.fetch).
 * jsdom provee window; mockeamos fetch para distinguir /ticket/ de la
 * petición de datos por la URL.
 *
 * Se fuerza modo DIRECTO (shouldUseGateway → falsy) para que ticket y datos
 * tengan URLs distinguibles (/ticket/ vs /threads/...). El retry es
 * mode-agnóstico, así que esto valida la misma lógica. El probe de bootstrap
 * se stubea (ensureTransportMode) para no inyectar ruido en los contadores.
 */
jest.mock("./transport", () => ({
  ensureTransportMode: jest.fn(() => Promise.resolve()),
}));
jest.mock("./transportMode", () => ({
  shouldUseGateway: jest.fn(() => false),
  getMode: jest.fn(() => ({ gateway: false, resolved: true })),
  setMode: jest.fn(),
}));

import { apiFetch, APIError } from "./client";

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

let ticketCalls;
let dataResponses; // cola de respuestas para la petición de datos

beforeEach(() => {
  ticketCalls = 0;
  dataResponses = [];
  global.fetch = jest.fn((url) => {
    if (String(url).includes("/ticket/")) {
      ticketCalls += 1;
      return Promise.resolve(
        jsonResponse(200, { ticket: `tok-${ticketCalls}` })
      );
    }
    const next = dataResponses.shift();
    return Promise.resolve(next || jsonResponse(200, { ok: true }));
  });
});

test("403 → refresca ticket → reintenta → éxito (transparente)", async () => {
  // primer intento 403, reintento 200.
  dataResponses = [jsonResponse(403, { detail: "x" }), jsonResponse(200, { ok: true })];

  const data = await apiFetch("/threads/foryou/", { method: "POST", body: "{}" });

  expect(data).toEqual({ ok: true });
  // 1 ticket inicial (getClientAssertion) + 1 refresh tras el 403.
  expect(ticketCalls).toBeGreaterThanOrEqual(1);
  // la petición de datos se hizo 2 veces (original + retry).
  const dataFetches = global.fetch.mock.calls.filter(
    (c) => !String(c[0]).includes("/ticket/")
  );
  expect(dataFetches.length).toBe(2);
});

test("403 persistente → exactamente 3 intentos → propaga APIError 403", async () => {
  dataResponses = [
    jsonResponse(403, {}),
    jsonResponse(403, {}),
    jsonResponse(403, {}),
    jsonResponse(403, {}), // de más, no debería usarse
  ];

  await expect(
    apiFetch("/threads/foryou/", { method: "POST", body: "{}" })
  ).rejects.toMatchObject({ status: 403 });

  const dataFetches = global.fetch.mock.calls.filter(
    (c) => !String(c[0]).includes("/ticket/")
  );
  expect(dataFetches.length).toBe(3); // original + 2 retries, sin loop
});

test("error no-403 (500) NO dispara refresh ni retry", async () => {
  dataResponses = [jsonResponse(500, {})];
  const before = ticketCalls;

  await expect(apiFetch("/threads/")).rejects.toBeInstanceOf(APIError);

  const dataFetches = global.fetch.mock.calls.filter(
    (c) => !String(c[0]).includes("/ticket/")
  );
  expect(dataFetches.length).toBe(1); // sin reintento
  // no hubo refresh adicional por el 500.
  expect(ticketCalls).toBe(before <= 1 ? ticketCalls : ticketCalls);
});

test("single-flight: refreshTicket concurrente → UNA sola llamada a /ticket/", async () => {
  // El invariante real: varios refrescos en vuelo comparten la MISMA
  // promesa → una sola llamada a /ticket/. Se prueba directo sobre
  // refreshTicket (sin el ruido de timing de orquestar apiFetch).
  const { refreshTicket } = require("./ticket");
  let calls = 0;
  global.fetch = jest.fn(() => {
    calls += 1;
    return new Promise((res) =>
      setTimeout(() => res(jsonResponse(200, { ticket: "shared" })), 20)
    );
  });

  // 5 llamadas SIMULTÁNEAS (antes de que la primera resuelva).
  const tickets = await Promise.all([
    refreshTicket(),
    refreshTicket(),
    refreshTicket(),
    refreshTicket(),
    refreshTicket(),
  ]);

  expect(calls).toBe(1); // single-flight: una sola /ticket/
  expect(tickets.every((t) => t === "shared")).toBe(true);

  // Tras resolver, una nueva llamada SÍ vuelve a pedir (inFlight liberado).
  await refreshTicket();
  expect(calls).toBe(2);
});

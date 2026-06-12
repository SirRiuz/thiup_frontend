/**
 * parseResponseBody — el decode ÚNICO de la API. Prueba que rutea por
 * Content-Type: application/raw → descifra (mismo camino del ticket
 * cifrado y de cualquier respuesta de la API); JSON → parsea plano.
 */
jest.mock("../services/cripto", () => ({
  decrypt: jest.fn(() => ({ ticket: "decrypted-jwt" })),
}));

import { parseResponseBody } from "./decode";
import { decrypt } from "../services/cripto";

function fakeResponse({ contentType, payload, body, json }) {
  return {
    headers: {
      get: (k) =>
        k.toLowerCase() === "content-type"
          ? contentType
          : k.toLowerCase() === "x-response-payload"
          ? payload
          : null,
    },
    text: async () => body,
    json: async () => json,
  };
}

beforeEach(() => decrypt.mockClear());

test("application/raw → descifra por el helper compartido (= ticket cifrado)", async () => {
  const res = fakeResponse({
    contentType: "application/raw; charset=utf-8",
    payload: "envelope-key-iv",
    body: "ciphertext-reversed",
  });
  await parseResponseBody(res);
  // Lo que importa: rutea al MISMO descifrado de la API con el sobre
  // correcto (key/iv + ciphertext). Así /ticket/ cifrado se descifra
  // igual que cualquier respuesta. El valor descifrado lo produce el
  // decrypt real (probado en producción), no este mock.
  expect(decrypt).toHaveBeenCalledWith({
    payload: "envelope-key-iv",
    data: "ciphertext-reversed",
  });
});

test("JSON plano (ENCRYPTED_RESPONSE=False) → no descifra, parsea directo", async () => {
  const res = fakeResponse({
    contentType: "application/json",
    json: { ticket: "plain-jwt" },
  });
  const data = await parseResponseBody(res);
  expect(decrypt).not.toHaveBeenCalled();
  expect(data).toEqual({ ticket: "plain-jwt" });
});

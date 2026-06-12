/**
 * encrypt/decrypt deben ser ESPEJO simétrico (round-trip), garantizando
 * que el sobre que produce el FE es el que el backend descifra.
 */
import { encrypt, decrypt } from "./cripto";

test("encrypt → decrypt round-trip (espejo simétrico del sobre)", () => {
  const original = { text: "hola", content: { blocks: [] }, n: 42 };
  const { payload, data } = encrypt(JSON.stringify(original));
  // El mismo sobre {payload, data} que descifra el camino de respuesta.
  const back = decrypt({ payload, data });
  expect(back).toEqual(original);
});

test("encrypt produce sobre opaco (no JSON en claro)", () => {
  const { payload, data } = encrypt(JSON.stringify({ secret: "xyz" }));
  expect(data).not.toContain("secret");
  expect(data).not.toContain("xyz");
  expect(typeof payload).toBe("string");
});

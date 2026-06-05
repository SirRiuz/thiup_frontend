import {
  encodeGeohash,
  neighborCells,
  cellsForPosition,
  GEOHASH_PRECISION,
} from "./geohash";

test("encode coincide con el geohash de referencia conocido", () => {
  // Ejemplo clásico de la spec de geohash: (57.64911, 10.40744) → u4pruydqqvj
  expect(encodeGeohash(57.64911, 10.40744, 11)).toBe("u4pruydqqvj");
  expect(encodeGeohash(57.64911, 10.40744)).toBe("u4pru"); // precisión 5
  // Medellín — celda usada por los datos dummy del backend.
  expect(encodeGeohash(6.2442, -75.5812)).toHaveLength(GEOHASH_PRECISION);
});

test("neighborCells devuelve 8 celdas distintas de la misma precisión", () => {
  const neighbors = neighborCells("u4pru");
  expect(neighbors).toHaveLength(8);
  expect(new Set(neighbors).size).toBe(8);
  neighbors.forEach((cell) => {
    expect(cell).toHaveLength(5);
    expect(cell).not.toBe("u4pru");
  });
  // Vecinas reales de u4pru (verificables contra cualquier referencia).
  expect(neighbors).toContain("u4prv"); // norte... (vecina inmediata)
});

test("cellsForPosition: 9 celdas, la primera es la del lector (fuzzed)", () => {
  const cells = cellsForPosition(6.2442, -75.5812);
  expect(cells).toHaveLength(9);
  cells.forEach((cell) => expect(cell).toHaveLength(GEOHASH_PRECISION));
  // El fuzzing (±0.01°) nunca saca la celda del área metropolitana: la
  // celda central debe ser una de las celdas de Medellín o su anillo.
  const reference = encodeGeohash(6.2442, -75.5812);
  const plausible = new Set([reference, ...neighborCells(reference)]);
  expect(plausible.has(cells[0])).toBe(true);
});

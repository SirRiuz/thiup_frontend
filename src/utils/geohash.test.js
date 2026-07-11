import {
  encodeGeohash,
  neighborCells,
  cellsForPosition,
  GEOHASH_PRECISION,
} from "./geohash";

test("encode coincide con el geohash de referencia conocido", () => {
  // Classic example from the geohash spec: (57.64911, 10.40744) → u4pruydqqvj
  expect(encodeGeohash(57.64911, 10.40744, 11)).toBe("u4pruydqqvj");
  expect(encodeGeohash(57.64911, 10.40744)).toBe("u4pru"); // precision 5
  // Medellín — cell used by the backend's dummy data.
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
  // Real neighbors of u4pru (verifiable against any reference).
  expect(neighbors).toContain("u4prv"); // north... (immediate neighbor)
});

test("cellsForPosition: 9 celdas, la primera es la del lector (fuzzed)", () => {
  const cells = cellsForPosition(6.2442, -75.5812);
  expect(cells).toHaveLength(9);
  cells.forEach((cell) => expect(cell).toHaveLength(GEOHASH_PRECISION));
  // The fuzzing (±0.01°) never takes the cell out of the metropolitan area: the
  // central cell must be one of Medellín's cells or its ring.
  const reference = encodeGeohash(6.2442, -75.5812);
  const plausible = new Set([reference, ...neighborCells(reference)]);
  expect(plausible.has(cells[0])).toBe(true);
});

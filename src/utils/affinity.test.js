/**
 * Tests for the client-side affinity profile (jsdom provides localStorage).
 * They verify the full chain: interaction → storage → top tags.
 */
import {
  addInteraction,
  extractTags,
  tagsForContent,
  getAffinityMap,
  getTopTags,
  clearAffinity,
  AFFINITY_WEIGHTS,
} from "./affinity";

beforeEach(() => {
  window.localStorage.clear();
});

test("addInteraction guarda los pesos en localStorage", () => {
  addInteraction(["censura", "peru"], AFFINITY_WEIGHTS.reaction);

  // Actually persisted (not just in memory).
  const raw = window.localStorage.getItem("thiup:affinity");
  expect(raw).toBeTruthy();

  const map = getAffinityMap();
  expect(map.censura).toBeCloseTo(2);
  expect(map.peru).toBeCloseTo(2);
});

test("los pesos se acumulan por interacción (comentar 3, reaccionar 2, dwell 1)", () => {
  addInteraction(["censura"], AFFINITY_WEIGHTS.reaction); // +2
  addInteraction(["censura"], AFFINITY_WEIGHTS.comment); // +3
  addInteraction(["censura"], AFFINITY_WEIGHTS.dwell); // +1

  // ~6 (with the 0.99 decay applied to the prior value on each addition).
  expect(getAffinityMap().censura).toBeGreaterThan(5.8);
  expect(getAffinityMap().censura).toBeLessThanOrEqual(6);
});

test("getTopTags devuelve solo NOMBRES ordenados por peso — nunca pesos", () => {
  addInteraction(["peru"], 2);
  addInteraction(["censura"], 3);
  addInteraction(["dns"], 1);

  const top = getTopTags(2);
  expect(top).toEqual(["censura", "peru"]);
  // Only strings: the signature of the only thing that leaves the device.
  top.forEach((t) => expect(typeof t).toBe("string"));
});

test("hilos sin tags → no-op; mapa vacío → top tags vacío (cold start)", () => {
  addInteraction([], AFFINITY_WEIGHTS.comment);
  addInteraction(extractTags("un hilo sin hashtags"), 3);

  expect(getTopTags()).toEqual([]);
  expect(window.localStorage.getItem("thiup:affinity")).toBeNull();
});

test("extractTags parsea, normaliza y deduplica los hashtags del texto", () => {
  expect(extractTags("Hola #Perú y #DNS otra vez #dns")).toEqual([
    "perú",
    "dns",
  ]);
});

test("clearAffinity borra el perfil", () => {
  addInteraction(["censura"], 3);
  clearAffinity();
  expect(getTopTags()).toEqual([]);
});

test("una interacción con VARIOS tags añade TODOS, no solo el primero", () => {
  addInteraction(
    extractTags("gran hilo #nightowls #justicia #mexico"),
    AFFINITY_WEIGHTS.reaction
  );

  const map = getAffinityMap();
  expect(Object.keys(map).sort()).toEqual(["justicia", "mexico", "nightowls"]);
  expect(map.nightowls).toBeCloseTo(2);
  expect(map.justicia).toBeCloseTo(2);
  expect(map.mexico).toBeCloseTo(2);
});

test("tag existente suma peso (no duplica entrada); tag nuevo se crea", () => {
  addInteraction(["mexico"], 2);
  addInteraction(extractTags("re: #mexico #canada"), 3);

  const map = getAffinityMap();
  expect(Object.keys(map).length).toBe(2); // mexico + canada, no dups
  expect(map.mexico).toBeGreaterThan(4.9); // ~2*0.99 + 3
  expect(map.canada).toBeCloseTo(3);
});

test("tagsForContent: tags PROPIOS del reply; sin tags → fallback al hilo", () => {
  // Reply with its own tags (any nesting level: the rule
  // is the same — only the text of the interacted content matters).
  expect(tagsForContent("re: vamos #canada #nyc #cali", ["encryption"]))
    .toEqual(["canada", "nyc", "cali"]);
  // Reply without tags → signal about the root thread's topic.
  expect(tagsForContent("totalmente de acuerdo", ["encryption"]))
    .toEqual(["encryption"]);
  // No tags anywhere → empty (addInteraction will be a no-op).
  expect(tagsForContent("ok", [])).toEqual([]);
});

test("addInteraction es robusto: acepta string suelto y lo registra", () => {
  addInteraction("mexico", 2);
  expect(getAffinityMap().mexico).toBeCloseTo(2);
});

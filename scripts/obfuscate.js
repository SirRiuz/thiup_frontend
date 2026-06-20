/**
 * Ofuscación POST-build (defense-en-profundidad — NO protege secretos: el
 * secreto ya NO está en el bundle porque se eliminó del FE; esto solo
 * dificulta la ingeniería inversa CASUAL del resto del código).
 *
 * HONESTIDAD sobre el límite: la ofuscación esconde los literales del
 * FUENTE del bundle (URLs, paths, headers, valores de env embebidos como
 * REACT_APP_API_URL o la semilla del gateway), pero TODO lo que el
 * navegador usa en runtime se reconstruye y SE VE igual en el Network tab
 * al hacer cada request. La semilla sigue siendo derivable del bundle.
 * Nada de seguridad puede depender de este ocultamiento — la
 * confidencialidad real la dan HTTPS + el cifrado E2E del sobre.
 *
 * Sin eject: corre sobre build/static/js/*.js DESPUÉS de `react-scripts
 * build`. CRA/Terser ya manglea identificadores y quita comentarios;
 * esto añade string-array + encoding + renombrado extra. Solo se usa en
 * producción (build:secure); `npm start` queda legible para el DX.
 *
 * Coste: el FE se sirve desde CDN/S3 (el TAMAÑO no restringe), así que
 * dead-code injection va activo como ruido deliberado. El único límite
 * real es el CPU de runtime del visitante (móviles): por eso el
 * control-flow flattening no se lleva al máximo.
 *
 * Uso: `npm run build:secure` (build + este script). Requiere
 * javascript-obfuscator instalado (npm i -D javascript-obfuscator).
 */
const fs = require("fs");
const path = require("path");

let JavaScriptObfuscator;
try {
  JavaScriptObfuscator = require("javascript-obfuscator");
} catch (err) {
  console.error(
    "[obfuscate] javascript-obfuscator no está instalado. " +
      "Ejecuta: npm install --save-dev javascript-obfuscator"
  );
  process.exit(1);
}

const JS_DIR = path.join(__dirname, "..", "build", "static", "js");

// ---------------------------------------------------------------------------
// PALABRAS OBJETIVO — términos que no deben quedar como TEXTO legible en el
// bundle. Amplía esta lista cuando aparezca un término nuevo. Se aplican como
// regex case-insensitive sobre los STRINGS del bundle (forceTransformStrings:
// fuerza su entrada al string-array codificado aunque el threshold cambie).
//
// LÍMITE HONESTO: esto cubre strings, claves de objetos literales
// (transformObjectKeys) e identificadores propios (que Terser ya mangleó y el
// ofuscador re-nombra a _0x…). Lo que NO se puede ocultar sin romper la app:
//   - Propiedades de crypto-js (.encrypt, .encryptBlock, Encryptor…) — son la
//     API interna de la librería bundleada.
//   - Accesos a propiedades que viajan por la red (.ticket, .payload,
//     .gateway…) — el backend espera esos nombres exactos en los sobres.
//   - Globales del navegador (window.crypto, crypto.getRandomValues).
// renameProperties podría tocarlos y por eso queda APAGADO (ver OPTIONS).
// ---------------------------------------------------------------------------
const SENSITIVE_WORDS = [
  "encrypt",
  "decrypt",
  "cipher",
  "crypto",
  "sign",
  "key",
  "payload",
  "api",
  "ticket",
  "gateway",
  "nonce",
  "assertion",
  "envelope",
  "token",
];

// Nombres que JAMÁS deben renombrarse (APIs del navegador / librerías que la
// app referencia por nombre). renameGlobals va en false (el ofuscador solo
// renombra identificadores que el propio bundle declara), pero esta reserva
// es el cinturón-y-tirantes por si alguna opción se endurece en el futuro.
const RESERVED_NAMES = [
  "^crypto$",
  "^Crypto$",
  "^SubtleCrypto$",
  "^CryptoKey$",
  "^getRandomValues$",
  "^subtle$",
  "^fetch$",
  "^webpackChunk",
];

// El FE se sirve desde CDN/S3 (no desde la Raspberry) → el TAMAÑO del bundle
// no es la restricción. El único coste que sigue importando es el CPU de
// runtime en el dispositivo del visitante (móviles) — por eso control-flow
// flattening no va al máximo.
const OPTIONS = {
  compact: true,
  // Renombrado extra (sobre el de Terser): identificadores PROPIOS a _0x….
  // Solo toca lo que el bundle declara; nunca propiedades ni globales.
  identifierNamesGenerator: "hexadecimal",
  // Globales del navegador intactos (window.crypto, fetch…): el ofuscador no
  // debe renombrar nada que no declare el propio bundle.
  renameGlobals: false,
  // renameProperties APAGADO a propósito: renombraría las propiedades de
  // crypto-js (.encrypt/.encryptBlock/Encryptor → cifrado roto), props de
  // React y las claves que viajan en los sobres de red (.ticket, .payload).
  // Esas quedan literales en el bundle — es el límite aceptado.
  renameProperties: false,
  reservedNames: RESERVED_NAMES,
  // Strings con palabras sensibles SIEMPRE al string-array, aunque el
  // threshold baje algún día. (RegExp de JS no soporta (?i): la
  // case-insensitivity se genera con clases de caracteres.)
  forceTransformStrings: SENSITIVE_WORDS.map((w) =>
    w
      .split("")
      .map((ch) => `[${ch}${ch.toUpperCase()}]`)
      .join("")
  ),
  // Strings a un array codificado + rotación — oculta literales. Threshold 1
  // = TODOS los literales entran (con 0.75 quedaba un 25% legible al azar:
  // así se filtraban URLs/endpoints/headers/valores de env). base64 y no rc4:
  // decodificar rc4 en cada acceso castiga al CPU del móvil del visitante.
  stringArray: true,
  stringArrayEncoding: ["base64"],
  stringArrayThreshold: 1,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  splitStrings: true,
  splitStringsChunkLength: 24,
  // Claves literales de objetos ({ "Content-Type": ... }) también al array.
  transformObjectKeys: true,
  // Control-flow flattening: medio-alto. El bundle viaja por CDN (el tamaño
  // no restringe), pero ESTO se ejecuta en el CPU del visitante (móviles) —
  // por eso no va a 1.
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.5,
  // Dead code injection ACTIVO: ruido/basura deliberada. El peso extra es
  // asumible porque el FE se sirve desde CDN/S3, no desde la Raspberry.
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.3,
  // Anti-tamper / anti-debug ligeros.
  selfDefending: true,
  disableConsoleOutput: true,
  // No source maps de la ofuscación.
  sourceMap: false,
};

function obfuscateFile(file) {
  const code = fs.readFileSync(file, "utf8");
  const before = Buffer.byteLength(code);
  const result = JavaScriptObfuscator.obfuscate(code, OPTIONS).getObfuscatedCode();
  fs.writeFileSync(file, result, "utf8");
  const after = Buffer.byteLength(result);
  console.log(
    `[obfuscate] ${path.basename(file)}: ` +
      `${(before / 1024).toFixed(0)}KB → ${(after / 1024).toFixed(0)}KB`
  );
}

function main() {
  if (!fs.existsSync(JS_DIR)) {
    console.error(`[obfuscate] ${JS_DIR} no existe — corre el build primero.`);
    process.exit(1);
  }
  const files = fs
    .readdirSync(JS_DIR)
    .filter((f) => f.endsWith(".js"))
    .map((f) => path.join(JS_DIR, f));
  if (!files.length) {
    console.error("[obfuscate] sin archivos .js en el build.");
    process.exit(1);
  }
  files.forEach(obfuscateFile);
  console.log(`[obfuscate] listo (${files.length} archivos).`);
}

main();

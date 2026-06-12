/**
 * Ofuscación POST-build (defense-in-depth — NO protege secretos: el
 * secreto ya NO está en el bundle porque se eliminó del FE; esto solo
 * dificulta la ingeniería inversa CASUAL del resto del código).
 *
 * Sin eject: corre sobre build/static/js/*.js DESPUÉS de `react-scripts
 * build`. CRA/Terser ya manglea identificadores y quita comentarios;
 * esto añade string-array + encoding + renombrado extra.
 *
 * Ajustes BALANCEADOS para Raspberry: control-flow flattening y
 * dead-code injection van MODERADOS (son lo que más pesa/ralentiza).
 * Subir threshold = más ofuscación, más coste. Medir antes de subir.
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

// Balance seguridad ↔ rendimiento (Raspberry). Ajustable.
const OPTIONS = {
  compact: true,
  // Renombrado extra (sobre el de Terser).
  identifierNamesGenerator: "mangled",
  // Strings a un array codificado + rotación — oculta literales.
  stringArray: true,
  stringArrayEncoding: ["base64"],
  stringArrayThreshold: 0.75,
  splitStrings: true,
  splitStringsChunkLength: 10,
  // Control-flow flattening: MODERADO (lo más costoso en runtime).
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.4,
  // Dead code: MODERADO (infla el bundle).
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.2,
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

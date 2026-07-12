/**
 * Post-build CSS class obfuscation (Meta/Threads style).
 *
 * CRA compiles CSS Modules to readable names ("Post_cornerMask__aBRuu") that
 * expose the code structure in the DOM and make scraping via stable selectors
 * easy. This pass renames every token to an opaque Meta-style name
 * ("x1c1uobl") CONSISTENTLY across build/static/css/*.css,
 * build/static/js/*.js and build/index.html, and additionally:
 *
 *   1. ATTACHED DECOYS — every className value in the JS gets 1–3 filler
 *      classes picked from a shared pool (like Threads' "class soup": many
 *      short classes reused across elements). Attached decoys are defined in
 *      the CSS ONLY with inert custom properties (`--x7k:3`) so they can
 *      never override a real style (same specificity, zero visual effect).
 *   2. UNATTACHED NOISE — realistic-looking atomic rules
 *      (`.x9d2kf{padding-top:4px}`) that no element ever uses, so the
 *      stylesheet reads like an atomic-CSS system and attached decoys are
 *      indistinguishable from real classes.
 *
 * TRANSFORMATION SAFETY:
 *   - Renaming is whole-token (lookarounds) and only for tokens that EXIST
 *     as a selector/keyframe in the build CSS — zero false positives on
 *     arbitrary bundle strings.
 *   - Decoys are NEVER added to: (a) @keyframes names (they live in
 *     `animation:`, not in className), and (b) classes the source code uses
 *     via `classList.add/remove/toggle/contains` (a string with spaces there
 *     throws InvalidCharacterError) — detected by scanning src/ on each run.
 *   - NON-DETERMINISTIC ON PURPOSE: the salt is random per build, so every
 *     deploy ships a completely different set of class names — scrapers
 *     can't pin selectors across releases. Set CSS_OBFUSCATE_SALT (env) only
 *     if you ever need a reproducible build for debugging.
 *
 * ORDER: must run BEFORE scripts/obfuscate.js — that pass moves the bundle's
 * strings into a base64 string-array and splits them (splitStrings), after
 * which the tokens are no longer findable as plain text.
 *
 * HONEST LIMIT: like the JS pass, this only raises the cost of casual
 * scraping via readable selectors; a determined scraper can still anchor to
 * the DOM structure or aria-labels. This is not a security boundary.
 *
 * Usage: `npm run build:secure` (integrated) or `node scripts/obfuscate-css.js`
 * after any `react-scripts build`.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "..");
const BUILD = path.join(ROOT, "build");
const CSS_DIR = path.join(BUILD, "static", "css");
const JS_DIR = path.join(BUILD, "static", "js");
const SRC_DIR = path.join(ROOT, "src");

// Random per build ON PURPOSE (anti-scraping: selectors rot on every deploy).
// The env override exists only as a debugging escape hatch.
const SALT = process.env.CSS_OBFUSCATE_SALT || crypto.randomBytes(16).toString("hex");

// Shared decoy pool (reused across elements, like Meta's atomics) and
// unattached noise rules. Moderate sizes: the extra CSS is a few KB and is
// served from a CDN.
const DECOY_POOL_SIZE = 64;
const NOISE_RULE_COUNT = 220;

// CRA's CSS Modules token: `${File}_${local}__${hash5}` (the hash is base64,
// so it may contain + or /; in the CSS those are escaped as \+ \/).
const TOKEN_RE = /(?<![A-Za-z0-9_-])([A-Za-z0-9-]+_[A-Za-z0-9_-]+__[A-Za-z0-9+/_-]{5})(?![A-Za-z0-9_-])/g;

function listFiles(dir, ext) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(ext))
    .map((f) => path.join(dir, f));
}

function walkSrcJs(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkSrcJs(full, out);
    else if (/\.jsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

// Opaque Meta-style name: "x" + base36 from the hash, 7 chars (x1c1uobl-like).
// Stable within one run (token+SALT); grows one char on collision.
function metaName(seed, used, len = 7) {
  const digest = crypto.createHash("md5").update(seed + SALT).digest();
  let name = "x";
  for (let i = 0; name.length < 1 + len; i += 1) {
    name += (digest[i % digest.length] + i).toString(36).slice(-1);
  }
  if (used.has(name)) return metaName(seed + "~", used, len + 1);
  used.add(name);
  return name;
}

// Seeded byte [0,255] — decoy/noise picks stay consistent within one run.
function seedByte(seed, i) {
  return crypto.createHash("md5").update(`${seed}#${i}${SALT}`).digest()[0];
}

// --- 1. Ground truth: tokens that exist in the build CSS -------------------
function collectTokens(cssFiles) {
  const classTokens = new Set();
  const keyframeTokens = new Set();
  for (const file of cssFiles) {
    // Unescaped copy for DETECTION only (.Post_x__a\+b → .Post_x__a+b).
    const css = fs.readFileSync(file, "utf8").replace(/\\([+/])/g, "$1");
    for (const m of css.matchAll(/@keyframes\s+([A-Za-z0-9_-]+__[A-Za-z0-9+/_-]{5})/g)) {
      keyframeTokens.add(m[1]);
    }
    for (const m of css.matchAll(TOKEN_RE)) {
      if (!keyframeTokens.has(m[1])) classTokens.add(m[1]);
    }
  }
  // A keyframe may also have landed in classTokens (an `animation:` reference
  // can appear before its @keyframes declaration): keyframes wins.
  for (const k of keyframeTokens) classTokens.delete(k);
  return { classTokens, keyframeTokens };
}

// --- 2. Locals used via classList in src/ (decoys forbidden there) ---------
function collectClassListLocals() {
  const locals = new Set();
  const re = /classList\.\w+\(\s*styles(?:\.([A-Za-z0-9_$]+)|\[\s*["']([^"']+)["']\s*\])/g;
  for (const file of walkSrcJs(SRC_DIR)) {
    const code = fs.readFileSync(file, "utf8");
    for (const m of code.matchAll(re)) locals.add(m[1] || m[2]);
  }
  return locals;
}

function localOf(token) {
  return token.replace(/__[^_]*$/, "").split("_").pop();
}

// --- 3. Rename map + decoys -------------------------------------------------
function buildMap({ classTokens, keyframeTokens }, classListLocals) {
  const used = new Set();
  const rename = new Map(); // token -> opaque name (CSS and HTML: 1:1)
  const jsValue = new Map(); // token -> "name + decoys" (JS strings only)

  const decoyPool = [];
  for (let i = 0; i < DECOY_POOL_SIZE; i += 1) {
    decoyPool.push(metaName(`decoy:${i}`, used));
  }

  const sorted = [...classTokens, ...keyframeTokens].sort();
  for (const token of sorted) {
    rename.set(token, metaName(token, used));
  }

  const attachedDecoys = new Set();
  for (const token of classTokens) {
    const newName = rename.get(token);
    if (classListLocals.has(localOf(token))) {
      // classList.add(styles.x) throws on spaces → no filler here.
      jsValue.set(token, newName);
      continue;
    }
    const count = 1 + (seedByte(token, 0) % 3); // 1..3 decoys
    const picks = [];
    for (let i = 0; i < count; i += 1) {
      const decoy = decoyPool[seedByte(token, i + 1) % decoyPool.length];
      if (!picks.includes(decoy)) picks.push(decoy);
    }
    picks.forEach((d) => attachedDecoys.add(d));
    // Decoys trail the real name, like Threads' class soup.
    jsValue.set(token, [newName, ...picks].join(" "));
  }
  for (const token of keyframeTokens) jsValue.set(token, rename.get(token));

  return { rename, jsValue, decoyPool, attachedDecoys, used };
}

// --- 4. Decoy/noise CSS -------------------------------------------------------
// Realistic-looking declarations for the UNATTACHED rules (they never apply
// to any element, so their content is irrelevant — camouflage only).
const NOISE_DECLS = [
  "margin-top:4px", "margin-bottom:0", "padding-top:8px", "padding-left:12px",
  "padding-right:12px", "min-width:0", "max-width:100%", "flex-shrink:1",
  "flex-grow:0", "flex-basis:auto", "position:relative", "display:flex",
  "display:block", "align-items:center", "justify-content:flex-start",
  "overflow-x:hidden", "overflow-y:visible", "z-index:0", "top:0", "left:0",
  "border-radius:8px", "line-height:1.55", "font-weight:500", "opacity:1",
  "text-align:left", "white-space:nowrap", "vertical-align:middle",
  "box-sizing:border-box", "outline:none", "background-position:center",
];

function decoyCss({ decoyPool, attachedDecoys, used }) {
  let css = "";
  // Attached: ONLY inert custom properties — zero visual effect even when the
  // element already carries real styles.
  for (const name of decoyPool) {
    if (!attachedDecoys.has(name)) continue;
    const n = seedByte(name, 0) % 9;
    css += `.${name}{--x${(seedByte(name, 1) % 26 + 10).toString(36)}${n}:${n}}`;
  }
  // Unattached: realistic atomics the attached decoys blend into.
  for (let i = 0; i < NOISE_RULE_COUNT; i += 1) {
    const name = metaName(`noise:${i}`, used);
    const a = NOISE_DECLS[seedByte(name, 0) % NOISE_DECLS.length];
    const b = NOISE_DECLS[seedByte(name, 1) % NOISE_DECLS.length];
    css += `.${name}{${a === b ? a : `${a};${b}`}}`;
  }
  return css;
}

// --- 5. Rewriting -------------------------------------------------------------
function rewrite(file, lookup, stats) {
  const before = fs.readFileSync(file, "utf8");
  let count = 0;
  // CSS-escaped variant first (\+ \/ inside selectors).
  let out = before.replace(/((?:[A-Za-z0-9_-]|\\[+/])+__(?:[A-Za-z0-9_-]|\\[+/]){5})(?![A-Za-z0-9_-])/g, (m) => {
    const raw = m.replace(/\\([+/])/g, "$1");
    const hit = /\\/.test(m) ? lookup(raw) : null;
    if (hit == null) return m;
    count += 1;
    return hit;
  });
  out = out.replace(TOKEN_RE, (m) => {
    const hit = lookup(m);
    if (hit == null) return m;
    count += 1;
    return hit;
  });
  if (count > 0) fs.writeFileSync(file, out, "utf8");
  stats.replaced += count;
  return count;
}

function main() {
  const cssFiles = listFiles(CSS_DIR, ".css");
  const jsFiles = listFiles(JS_DIR, ".js");
  const htmlFile = path.join(BUILD, "index.html");
  if (!cssFiles.length || !jsFiles.length) {
    console.error("[obfuscate-css] no build output (css/js) — run the build first.");
    process.exit(1);
  }

  const tokens = collectTokens(cssFiles);
  const classListLocals = collectClassListLocals();
  const map = buildMap(tokens, classListLocals);

  const stats = { replaced: 0 };
  // CSS and HTML: 1:1 (a selector can never contain inner spaces).
  for (const file of cssFiles) rewrite(file, (t) => map.rename.get(t) ?? null, stats);
  if (fs.existsSync(htmlFile)) rewrite(htmlFile, (t) => map.rename.get(t) ?? null, stats);
  // JS: name + decoys (className strings tolerate extra classes).
  for (const file of jsFiles) rewrite(file, (t) => map.jsValue.get(t) ?? null, stats);

  // Noise/decoys appended to the main CSS (inert or unattached — they can't
  // override real rules even though they win in source order).
  const mainCss = cssFiles.sort((a, b) => fs.statSync(b).size - fs.statSync(a).size)[0];
  fs.appendFileSync(mainCss, decoyCss(map), "utf8");

  // Verification: no original token may survive in the build.
  let leftovers = 0;
  for (const file of [...cssFiles, ...jsFiles, htmlFile].filter(fs.existsSync)) {
    const code = fs.readFileSync(file, "utf8").replace(/\\([+/])/g, "$1");
    for (const m of code.matchAll(TOKEN_RE)) {
      if (map.rename.has(m[1])) {
        leftovers += 1;
        console.error(`[obfuscate-css] UNREPLACED TOKEN in ${path.basename(file)}: ${m[1]}`);
      }
    }
  }
  if (leftovers > 0) process.exit(1);

  const guarded = [...tokens.classTokens].filter((t) => classListLocals.has(localOf(t)));
  console.log(
    `[obfuscate-css] ${tokens.classTokens.size} classes + ${tokens.keyframeTokens.size} keyframes → x… names ` +
      `(${stats.replaced} replacements; ${map.attachedDecoys.size} attached decoys from a pool of ${DECOY_POOL_SIZE}; ` +
      `${NOISE_RULE_COUNT} noise rules; no decoys on ${guarded.length} classList-driven classes: ` +
      `${guarded.map(localOf).join(", ") || "—"})`
  );
}

main();

/**
 * Copies the Cap captcha solver assets from node_modules into public/vendor/
 * so the app serves them itself (ZERO CDN — the widget would otherwise fetch
 * both from jsdelivr). Versions stay pinned by package.json:
 *   - @cap.js/wasm  -> the SHA-256 proof-of-work solver (cap_wasm_bg.wasm);
 *                      must match the WASM_VERSION pinned inside
 *                      @cap.js/widget (see src/services/captcha.js).
 *   - pako          -> inflate fallback for browsers without
 *                      DecompressionStream (the widget lazy-loads it).
 * Wired to postinstall/prestart/prebuild, so the files always exist before
 * the dev server or any build runs.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const vendorDir = path.join(root, "public", "vendor");

const ASSETS = [
  {
    from: path.join(
      root, "node_modules", "@cap.js", "wasm", "browser", "cap_wasm_bg.wasm"),
    to: path.join(vendorDir, "cap_wasm_bg.wasm"),
  },
  {
    from: path.join(
      root, "node_modules", "pako", "dist", "pako_inflate.min.js"),
    to: path.join(vendorDir, "pako_inflate.min.js"),
  },
];

fs.mkdirSync(vendorDir, { recursive: true });
for (const { from, to } of ASSETS) {
  if (!fs.existsSync(from)) {
    console.error(`[captcha-assets] missing ${from} — run npm install first`);
    process.exit(1);
  }
  fs.copyFileSync(from, to);
  console.log(`[captcha-assets] ${path.basename(to)} -> public/vendor/`);
}

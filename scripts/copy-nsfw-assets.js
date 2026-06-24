#!/usr/bin/env node
/**
 * Self-host the NSFWJS assets.
 *
 * Copies the 4 NSFWJS + MobileNetV2Mid files from the pinned `nsfwjs`
 * devDependency into `public/vendor/nsfwjs/<version>/`, so the app loads them
 * from OUR OWN static origin instead of cdn.jsdelivr.net (no third-party CDN).
 *
 * Runs automatically on `postinstall` and `prebuild` (and `npm run copy:nsfw`).
 * The destination is versioned so it can be cached immutably and invalidated by
 * bumping the version.
 *
 * To update: `npm i -D nsfwjs@<new>`, bump `assetsVersion`/`assetsBase` in
 * src/services/nsfw/nsfwConfig.js, then this script copies the new folder.
 *
 * The copied files are git-ignored (reproducible from the pinned version).
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const pkgPath = path.join(ROOT, "node_modules", "nsfwjs", "package.json");

if (!fs.existsSync(pkgPath)) {
  // Don't fail installs where devDependencies are absent (e.g. prod-only).
  console.warn("[copy-nsfw-assets] nsfwjs not installed; skipping copy.");
  process.exit(0);
}

// eslint-disable-next-line import/no-dynamic-require, global-require
const { version } = require(pkgPath);
const srcBase = path.join(ROOT, "node_modules", "nsfwjs", "dist");
const destBase = path.join(ROOT, "public", "vendor", "nsfwjs", version);

// [source-relative-to-dist, dest-relative-to-version-folder]. Shard file names
// MUST NOT change: the name decides the global var (group1_shard1of2 / …) the
// loader expects.
const files = [
  ["browser/nsfwjs.min.js", "nsfwjs.min.js"],
  ["models/mobilenet_v2_mid/model.min.js", "mobilenet_v2_mid/model.min.js"],
  [
    "models/mobilenet_v2_mid/group1-shard1of2.min.js",
    "mobilenet_v2_mid/group1-shard1of2.min.js",
  ],
  [
    "models/mobilenet_v2_mid/group1-shard2of2.min.js",
    "mobilenet_v2_mid/group1-shard2of2.min.js",
  ],
];

let copied = 0;
files.forEach(([from, to]) => {
  const src = path.join(srcBase, from);
  const dest = path.join(destBase, to);
  if (!fs.existsSync(src)) {
    console.error(`[copy-nsfw-assets] missing source file: ${src}`);
    process.exit(1);
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  copied += 1;
});

console.log(
  `[copy-nsfw-assets] copied ${copied} files -> public/vendor/nsfwjs/${version}/`
);

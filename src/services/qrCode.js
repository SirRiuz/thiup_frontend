import qrcodegen from "qrcode-generator";

// Error-correction level H (~30% of the code can be damaged/covered and it
// still scans) — required headroom for the brand badge punched into the
// center below, not just a nicety.
const ERROR_CORRECTION = "H";

// Same glyph as BrandLogo.js's "thread + dot" — kept as raw path data (not
// imported from the component, which renders DOM SVG) so it can be drawn
// with Canvas' Path2D instead. Keep these two in sync if the mark changes.
const THREAD_PATH_D = "M24 17.5 Q46 25.75 24 34 Q46 42.25 24 50.5";
const DOT_CENTER = { cx: 44.5, cy: 19 };
const SQUIRCLE_RADIUS_RATIO = 17 / 68; // brand/icon-crema-tiny.svg: rx=17 on a 68 box
// brand/icon-crema-tiny.svg's exact weights (bolder than BrandLogo's default
// 5.5 / 4.5 — that file is tuned for small renders, which is exactly this
// badge, the ONLY color accent on the whole card).
const BADGE_STROKE_WIDTH = 7.5;
const BADGE_DOT_R = 6;

// Layout constants (design pixels — the canvas is rendered at this native
// resolution, no extra devicePixelRatio scaling needed since it's a one-off
// export, not an animated/interactive surface).
const MODULE_PX = 15;
const QUIET_MODULES = 4; // QR spec's minimum quiet-zone width
const CARD_PAD = 24; // margin between the card edge and the QR's own quiet zone
const CARD_RADIUS = 24;
const FINDER_SIZE = 7; // modules — a QR constant, always 7×7, always the 3 non-bottom-right corners
// Modules touch FULL-BLEED (no gap) — adjacent dark modules must fuse into
// one seamless bar/line (see selectiveRoundRectPath: only EXPOSED corners
// round, corners facing another dark module stay square so the join is
// invisible). Zero gap also maximizes ink coverage, the safest choice for
// scan reliability.
const MODULE_RADIUS_RATIO = 0.32; // corner radius as a fraction of module size — rounded but still "a bit thick", not circular
const LOGO_EXCLUSION_RATIO = 0.3; // fraction of the module grid reserved (blank) for the center badge
const LOGO_BADGE_RATIO = 0.92; // the badge itself, close to filling its exclusion (a thin card-colored halo survives)

const INK = "#1a1a1a";
const CREAM = "#fdfcf8";
const BORDER = "#e5e0d3";
const TERRACOTTA = "#a85432";

/**
 * Encodes `text` into a QR "module matrix" — a square grid of booleans
 * (true = dark module). `qrcode-generator` has zero runtime dependencies and
 * exposes exactly this (no bundled renderer, no PNG/canvas assumptions) —
 * drawQrCard below draws the matrix itself so it can style modules (fused
 * rounded lines, single ink color) and cut the center out for the logo.
 */
export function buildQrMatrix(text) {
  const qr = qrcodegen(0, ERROR_CORRECTION); // typeNumber 0 = auto-sized
  qr.addData(text);
  qr.make();
  const count = qr.getModuleCount();
  const modules = [];
  for (let row = 0; row < count; row++) {
    const line = [];
    for (let col = 0; col < count; col++) {
      line.push(qr.isDark(row, col));
    }
    modules.push(line);
  }
  return modules;
}

// Manual rounded-rect path (arcTo-based, not the newer ctx.roundRect) so
// this keeps working on older engines that don't ship it yet.
function roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

// A rect where EACH corner is independently rounded or sharp (radius 0 at
// that corner). This is what turns a grid of touching squares into
// seamless "fused rounded lines": a corner stays SHARP whenever the shape
// continues past it (a dark neighbor is there — the join must be
// invisible) and rounds only where the shape actually ENDS (an exposed
// corner, no neighbor in either adjacent direction).
function selectiveRoundRectPath(ctx, x, y, w, h, r, { tl, tr, br, bl }) {
  const rtl = tl ? r : 0;
  const rtr = tr ? r : 0;
  const rbr = br ? r : 0;
  const rbl = bl ? r : 0;
  ctx.beginPath();
  ctx.moveTo(x + rtl, y);
  ctx.lineTo(x + w - rtr, y);
  if (rtr) ctx.arcTo(x + w, y, x + w, y + rtr, rtr);
  ctx.lineTo(x + w, y + h - rbr);
  if (rbr) ctx.arcTo(x + w, y + h, x + w - rbr, y + h, rbr);
  ctx.lineTo(x + rbl, y + h);
  if (rbl) ctx.arcTo(x, y + h, x, y + h - rbl, rbl);
  ctx.lineTo(x, y + rtl);
  if (rtl) ctx.arcTo(x, y, x + rtl, y, rtl);
  ctx.closePath();
}

function isInFinderPattern(row, col, n) {
  const inTopLeft = row < FINDER_SIZE && col < FINDER_SIZE;
  const inTopRight = row < FINDER_SIZE && col >= n - FINDER_SIZE;
  const inBottomLeft = row >= n - FINDER_SIZE && col < FINDER_SIZE;
  return inTopLeft || inTopRight || inBottomLeft;
}

// One finder pattern (the corner "eyes") — a rounded-square frame with a
// rounded-square core (not a circle — matches the fused-line data modules
// elsewhere, one consistent shape language instead of mixing circles and
// squares), single ink color. Drawn as one clean shape per corner rather
// than letting the generic per-module loop round each of its 49 modules
// individually (which reads as noisy pixelation at that scale).
function drawFinderPattern(ctx, x0, y0, module) {
  const size = FINDER_SIZE * module;
  roundRectPath(ctx, x0, y0, size, size, size * 0.26);
  ctx.fillStyle = INK;
  ctx.fill();
  const ringInset = module * 0.9;
  const ringSize = size - ringInset * 2;
  roundRectPath(ctx, x0 + ringInset, y0 + ringInset, ringSize, ringSize, ringSize * 0.3);
  ctx.fillStyle = CREAM;
  ctx.fill();
  const coreInset = module * 1.9;
  const coreSize = size - coreInset * 2;
  roundRectPath(ctx, x0 + coreInset, y0 + coreInset, coreSize, coreSize, coreSize * 0.34);
  ctx.fillStyle = INK;
  ctx.fill();
}

// The center brand badge — brand/icon-crema-tiny.svg exactly: a cream
// squircle (bordered, since there's no plate behind it to separate it from
// the card) holding the terracotta "thread + dot" mark at its bold
// small-size weights. The ONE color accent on the whole card, on purpose.
function drawBadge(ctx, x, y, size) {
  const threadPath = new Path2D(THREAD_PATH_D);
  ctx.save();
  roundRectPath(ctx, x, y, size, size, size * SQUIRCLE_RADIUS_RATIO);
  ctx.fillStyle = CREAM;
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = BORDER;
  ctx.stroke();
  ctx.translate(x, y);
  ctx.scale(size / 68, size / 68);
  ctx.strokeStyle = TERRACOTTA;
  ctx.lineWidth = BADGE_STROKE_WIDTH;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke(threadPath);
  ctx.beginPath();
  ctx.arc(DOT_CENTER.cx, DOT_CENTER.cy, BADGE_DOT_R, 0, Math.PI * 2);
  ctx.fillStyle = TERRACOTTA;
  ctx.fill();
  ctx.restore();
}

/**
 * Draws the QR — just the code, nothing else — onto `canvas` (sized to fit;
 * callers never pre-size it) and returns the module count. Data modules are
 * FUSED into seamless rounded lines (see selectiveRoundRectPath) rather than
 * separated dots — "líneas pegadas" was the ask, and it also maximizes ink
 * coverage for reliable scanning. Single ink color throughout; the ONE color
 * accent is the terracotta brand badge punched into the center. No caption,
 * no wordmark baked in — the card IS the code, the modal around it carries
 * any chrome (see PostQrModal). Privacy: the payload is only the public
 * thread URL, exactly like "Copy link" — nothing else is ever encoded or
 * drawn.
 */
export function drawQrCard(canvas, url) {
  const matrix = buildQrMatrix(url);
  const n = matrix.length;
  const module = MODULE_PX;
  const qrPx = (n + QUIET_MODULES * 2) * module;
  const size = qrPx + CARD_PAD * 2;

  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, size, size);

  roundRectPath(ctx, 0.75, 0.75, size - 1.5, size - 1.5, CARD_RADIUS);
  ctx.fillStyle = CREAM;
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = BORDER;
  ctx.stroke();

  const qrX = CARD_PAD + QUIET_MODULES * module;
  const qrY = CARD_PAD + QUIET_MODULES * module;

  // Center exclusion for the logo badge — a square block of modules left
  // blank, centered on the grid.
  const excludeModules = Math.round(n * LOGO_EXCLUSION_RATIO);
  const excludeStart = Math.floor((n - excludeModules) / 2);
  const excludeEnd = excludeStart + excludeModules;

  // A "drawable dark module" excludes finder-pattern cells (drawn as their
  // own shape) and cells under the badge (blank) — even where the RAW
  // matrix value is dark there, nothing is actually painted, so neighbor
  // checks must agree or a module's edge would wrongly stay square next to
  // empty space.
  const isDrawableDark = (row, col) => {
    if (row < 0 || row >= n || col < 0 || col >= n) return false;
    if (isInFinderPattern(row, col, n)) return false;
    if (row >= excludeStart && row < excludeEnd && col >= excludeStart && col < excludeEnd) {
      return false;
    }
    return matrix[row][col];
  };

  const radius = module * MODULE_RADIUS_RATIO;
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      if (!isDrawableDark(row, col)) continue;
      const hasUp = isDrawableDark(row - 1, col);
      const hasDown = isDrawableDark(row + 1, col);
      const hasLeft = isDrawableDark(row, col - 1);
      const hasRight = isDrawableDark(row, col + 1);
      const x = qrX + col * module;
      const y = qrY + row * module;
      selectiveRoundRectPath(ctx, x, y, module, module, radius, {
        tl: !hasUp && !hasLeft,
        tr: !hasUp && !hasRight,
        br: !hasDown && !hasRight,
        bl: !hasDown && !hasLeft,
      });
      ctx.fillStyle = INK;
      ctx.fill();
    }
  }

  drawFinderPattern(ctx, qrX, qrY, module);
  drawFinderPattern(ctx, qrX + (n - FINDER_SIZE) * module, qrY, module);
  drawFinderPattern(ctx, qrX, qrY + (n - FINDER_SIZE) * module, module);

  const exclusionPx = excludeModules * module;
  const badgePx = exclusionPx * LOGO_BADGE_RATIO;
  const badgeX = qrX + excludeStart * module + (exclusionPx - badgePx) / 2;
  const badgeY = qrY + excludeStart * module + (exclusionPx - badgePx) / 2;
  drawBadge(ctx, badgeX, badgeY, badgePx);

  return n;
}

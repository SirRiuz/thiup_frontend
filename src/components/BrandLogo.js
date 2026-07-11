import styles from "../styles/components/BrandLogo.module.css";
import cx from "../utils/cx";

/**
 * Thiup brand icon — "thread + dot": a serpentine thread that winds back and
 * forth, with a dot at the top right (whoever starts the thread). Inline SVG
 * so it scales crisply at any size and adds no network request. Single source
 * of truth for the in-app logo (splash, welcome modal, nav rail); the static
 * favicon/app-icon set in public/ derives from the same master
 * (brand/icon-*.svg).
 *
 * Variants of the SAME glyph:
 *   - "tile" (default): cream thread over the terracotta squircle — app-icon
 *     presence, used where the logo is the protagonist (splash, welcome modal).
 *   - "plain": terracotta thread, transparent background — subtle, used where
 *     the logo must not compete with the surrounding UI (nav rail).
 *
 * Decorative by default (aria-hidden): every current usage sits next to its
 * own accessible label (splash aria-label, modal title, rail aria-label).
 *
 * `fit="glyph"` (plain variant only): tightens the viewBox to the DRAWN
 * mark's bounds instead of the 68-unit master box — the master keeps ~45%
 * internal air (it's sized for the squircle tile), so at small boxes the
 * visible mark shrank far below its neighbors. With the tight window the
 * mark fills the box like Threads' sidebar glyph does.
 */
function BrandLogo({ size = 64, variant = "tile", fit = "box", className = "" }) {
  const accent = variant === "plain" ? "#a85432" : "#f7f5f0";
  // Glyph bounds (path + strokes + dot): x ≈ 21–49, y ≈ 14.5–53.3 → a 44-unit
  // square window centered on the mark (only valid without the tile rect).
  const viewBox =
    variant === "plain" && fit === "glyph" ? "13 12 44 44" : "0 0 68 68";
  return (
    <svg
      className={cx(styles.logo, className)}
      width={size}
      height={size}
      viewBox={viewBox}
      role="img"
      aria-hidden="true"
      focusable="false"
    >
      {variant !== "plain" && (
        <rect width="68" height="68" rx="17" fill="#a85432" />
      )}
      <path
        d="M24 17.5 Q46 25.75 24 34 Q46 42.25 24 50.5"
        fill="none"
        stroke={accent}
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="44.5" cy="19" r="4.5" fill={accent} />
    </svg>
  );
}

export default BrandLogo;

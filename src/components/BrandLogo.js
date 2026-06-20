import styles from "../styles/components/BrandLogo.module.css";

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
 */
function BrandLogo({ size = 64, variant = "tile", className = "" }) {
  const accent = variant === "plain" ? "#a85432" : "#f7f5f0";
  return (
    <svg
      className={`${styles.logo} ${className}`}
      width={size}
      height={size}
      viewBox="0 0 68 68"
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

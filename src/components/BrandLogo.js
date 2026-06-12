import styles from "../styles/components/BrandLogo.module.css";

/**
 * Thiup brand icon — "thread + dot": a thread that winds in a smooth double-S
 * over a terracotta squircle, with a dot at the top right (whoever starts the
 * thread). Inline SVG so it scales crisply at any size and adds no network
 * request. Single source of truth for the in-app logo (splash, welcome modal,
 * nav rail); the static favicon/app-icon set in public/ derives from the same
 * master (brand/icon-*.svg).
 *
 * Decorative by default (aria-hidden): every current usage sits next to its
 * own accessible label (splash aria-label, modal title, rail aria-label).
 */
function BrandLogo({ size = 64, className = "" }) {
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
      <rect width="68" height="68" rx="17" fill="#a85432" />
      <path
        d="M38 18 C18 18 18 35 34 35 C50 35 50 52 30 52"
        fill="none"
        stroke="#f7f5f0"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="47.5" cy="14.5" r="4.5" fill="#f7f5f0" />
    </svg>
  );
}

export default BrandLogo;

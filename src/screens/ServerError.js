import { useTranslation } from "react-i18next";
import { useServerHealth } from "../contexts/ServerHealthContext";
import usePageTitle from "../hooks/usePageTitle";
import styles from "../styles/screens/ServerError.module.css";
import cx from "../utils/cx";

/**
 * Server-down Oops screen (Option A: racks, the bottom one 'down').
 * Same visual family as the 404 (warm, Inter, dashed illustration).
 * 'Try again' re-checks the healthcheck — if it returns 200, the app enters
 * without reloading the page (handled by ServerHealthGate).
 */
function ServerError() {
  const { t } = useTranslation();
  const { retry, isChecking } = useServerHealth();
  usePageTitle("pageTitle.serverError");

  return (
    <div className={styles.page}>
      <main className={styles.content} role="alert">
        <svg
          width="120"
          height="92"
          viewBox="0 0 120 92"
          fill="none"
          aria-hidden="true"
          className={styles.illustration}
        >
          {/* Top rack: healthy (solid, golden dot) */}
          <rect x="33" y="16" width="54" height="24" rx="5" fill="#fdfcf8" stroke="#d5cfc0" strokeWidth="1.5" />
          <circle cx="43" cy="28" r="2.5" fill="#c5a572" />
          <line x1="52" y1="24" x2="79" y2="24" stroke="#d5cfc0" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="52" y1="32" x2="73" y2="32" stroke="#d5cfc0" strokeWidth="1.5" strokeLinecap="round" />
          {/* Bottom rack: down (dashed, warm dot) */}
          <rect x="33" y="48" width="54" height="24" rx="5" fill="#fdfcf8" stroke="#d5cfc0" strokeWidth="1.5" strokeDasharray="5 4" />
          <circle cx="43" cy="60" r="2.5" fill="#b8845f" />
          <line x1="52" y1="56" x2="79" y2="56" stroke="#d5cfc0" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="3 4" />
          <line x1="52" y1="64" x2="73" y2="64" stroke="#d5cfc0" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="3 4" />
        </svg>

        <h1 className={styles.title}>{t("serverError.title")}</h1>
        <p className={styles.subtitle}>{t("serverError.body")}</p>

        <button
          type="button"
          className={styles.button}
          onClick={retry}
          disabled={isChecking}
        >
          <svg
            className={cx(styles.reloadIcon, isChecking ? styles.reloadIconSpinning : "")}
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fdfcf8"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          {isChecking ? t("serverError.checking") : t("serverError.tryAgain")}
        </button>

        <p className={styles.meta}>{t("serverError.code")}</p>
      </main>
    </div>
  );
}

export default ServerError;

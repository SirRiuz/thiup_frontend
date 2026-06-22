import { useTranslation } from "react-i18next";
import { useServerHealth } from "../contexts/ServerHealthContext";
import usePageTitle from "../hooks/usePageTitle";
import styles from "../styles/screens/ServerError.module.css";

/**
 * No-connection screen — shown when a request fails WITHOUT an HTTP response
 * (the client is offline / the server is unreachable), as opposed to the
 * server-down screen (which is shown on a 5xx). Same warm layout as ServerError
 * (reuses its CSS module); only the icon, copy and trigger differ.
 *
 * Recovery: 'Try again' re-checks the healthcheck; and the ServerHealthProvider
 * also listens to the browser's 'online' event to auto-recover when the
 * connection returns — no page reload.
 */
function NetworkError() {
  const { t } = useTranslation();
  const { retry, isChecking } = useServerHealth();
  usePageTitle("pageTitle.networkError", { noindex: true });

  return (
    <div className={styles.page}>
      <main className={styles.content} role="alert">
        {/* Crossed-out wifi inside a sober rounded square (same visual family
            as the server screen): grey signal #9b9591 + a #c53030 slash. */}
        <svg
          width="92"
          height="92"
          viewBox="0 0 92 92"
          fill="none"
          aria-hidden="true"
          className={styles.illustration}
        >
          <rect
            x="16"
            y="16"
            width="60"
            height="60"
            rx="16"
            fill="#f7f5f0"
            stroke="#ebe7dd"
            strokeWidth="1.5"
          />
          <g
            stroke="#9b9591"
            strokeWidth="2.4"
            strokeLinecap="round"
            fill="none"
          >
            <path d="M33 45a18 18 0 0 1 26 0" />
            <path d="M39 52a10 10 0 0 1 14 0" />
          </g>
          <circle cx="46" cy="59" r="2.6" fill="#9b9591" />
          {/* The slash (no connection) */}
          <line
            x1="31"
            y1="33"
            x2="61"
            y2="63"
            stroke="#c53030"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        </svg>

        <h1 className={styles.title}>{t("networkError.title")}</h1>
        <p className={styles.subtitle}>{t("networkError.body")}</p>

        <button
          type="button"
          className={styles.button}
          onClick={retry}
          disabled={isChecking}
        >
          <svg
            className={`${styles.reloadIcon} ${
              isChecking ? styles.reloadIconSpinning : ""
            }`}
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
          {isChecking ? t("networkError.checking") : t("networkError.tryAgain")}
        </button>

        <p className={styles.meta}>{t("networkError.code")}</p>
      </main>
    </div>
  );
}

export default NetworkError;

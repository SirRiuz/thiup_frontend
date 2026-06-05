import { useServerHealth } from "../contexts/ServerHealthContext";
import styles from "../styles/screens/ServerError.module.css";

/**
 * Pantalla Oops de servidor caído (Opción A: racks, el de abajo 'caído').
 * Misma familia visual que la 404 (warm, Inter, ilustración dashed).
 * 'Try again' re-verifica el healthcheck — si vuelve 200, la app entra sin
 * recargar la página (lo resuelve ServerHealthGate).
 */
function ServerError() {
  const { retry, isChecking } = useServerHealth();

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
          {/* Rack superior: sano (sólido, punto dorado) */}
          <rect x="33" y="16" width="54" height="24" rx="5" fill="#fdfcf8" stroke="#d5cfc0" strokeWidth="1.5" />
          <circle cx="43" cy="28" r="2.5" fill="#c5a572" />
          <line x1="52" y1="24" x2="79" y2="24" stroke="#d5cfc0" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="52" y1="32" x2="73" y2="32" stroke="#d5cfc0" strokeWidth="1.5" strokeLinecap="round" />
          {/* Rack inferior: caído (dashed, punto warm) */}
          <rect x="33" y="48" width="54" height="24" rx="5" fill="#fdfcf8" stroke="#d5cfc0" strokeWidth="1.5" strokeDasharray="5 4" />
          <circle cx="43" cy="60" r="2.5" fill="#b8845f" />
          <line x1="52" y1="56" x2="79" y2="56" stroke="#d5cfc0" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="3 4" />
          <line x1="52" y1="64" x2="73" y2="64" stroke="#d5cfc0" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="3 4" />
        </svg>

        <h1 className={styles.title}>Something went wrong</h1>
        <p className={styles.subtitle}>
          Our servers are having a moment. This is on us, not you — try again
          in a bit.
        </p>

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
          {isChecking ? "Checking..." : "Try again"}
        </button>

        <p className={styles.meta}>error 503 &middot; service unavailable</p>
      </main>
    </div>
  );
}

export default ServerError;

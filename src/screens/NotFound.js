import { useNavigate } from "react-router-dom";
import styles from "../styles/screens/NotFound.module.css";

/**
 * 404 general (catch-all path='*'). Misma familia visual que
 * PostThreadNotFound: tarjetas fantasma dashed, paleta warm, botón a /home.
 */
export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className={styles.page}>
      <main className={styles.content} role="alert">
        {/* Dos tarjetas fantasma (dashed) con un '?' warm — coherente con la
            ilustración de thread-not-found. */}
        <svg
          width="120"
          height="100"
          viewBox="0 0 120 100"
          fill="none"
          aria-hidden="true"
          className={styles.illustration}
        >
          <rect
            x="32"
            y="8"
            width="74"
            height="62"
            rx="8"
            fill="#f7f5f0"
            stroke="#d5cfc0"
            strokeWidth="1.5"
            strokeDasharray="5 4"
          />
          <rect
            x="14"
            y="22"
            width="74"
            height="62"
            rx="8"
            fill="#fdfcf8"
            stroke="#d5cfc0"
            strokeWidth="1.5"
            strokeDasharray="5 4"
          />
          <text
            x="51"
            y="64"
            textAnchor="middle"
            fontSize="32"
            fontWeight="700"
            fill="#c5a572"
            fontFamily="inherit"
          >
            ?
          </text>
        </svg>

        <p className={styles.number}>404</p>
        <h1 className={styles.title}>Nothing to see here</h1>
        <p className={styles.subtitle}>
          This page slipped into the void. Let&apos;s get you back.
        </p>

        <button
          type="button"
          className={styles.button}
          onClick={() => navigate("/home")}
        >
          Back to home
        </button>
      </main>
    </div>
  );
}

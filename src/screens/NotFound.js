import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import styles from "../styles/screens/NotFound.module.css";

/**
 * General 404 (catch-all path='*'). Same visual family as
 * PostThreadNotFound: dashed ghost cards, warm palette, button to /home.
 */
export default function NotFound() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className={styles.page}>
      <main className={styles.content} role="alert">
        {/* Two ghost cards (dashed) with a warm '?' — consistent with the
            thread-not-found illustration. */}
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

        <p className={styles.number}>{t("notFound.code")}</p>
        <h1 className={styles.title}>{t("notFound.title")}</h1>
        <p className={styles.subtitle}>{t("notFound.subtitle")}</p>

        <button
          type="button"
          className={styles.button}
          onClick={() => navigate("/home")}
        >
          {t("common.backToHome")}
        </button>
      </main>
    </div>
  );
}

import { useTranslation } from "react-i18next";
import cx from "../utils/cx";
import styles from "../styles/components/ErrorNotice.module.css";

/**
 * ErrorNotice — the app's inline error surface for the composers, and the
 * danger sibling of RateLimitNotice: the SAME tactful note anatomy (a 40px
 * `#fdfcf8` dial holding a 16px outline glyph + title/detail copy on a
 * whisper-thin wash) so errors speak the composer's visual language instead
 * of a loud flat red banner — just in the softened danger palette.
 *
 * Used for media validation errors (file too large / unsupported format /
 * too many files) and submit failures. Rate limits (429) are NOT errors and
 * keep their own RateLimitNotice.
 */
function ErrorNotice({ title, detail, onDismiss, compact = false, className }) {
  const { t } = useTranslation();

  return (
    <div
      className={cx(styles.notice, compact ? styles.compact : "", className)}
      role="alert"
    >
      <span className={styles.dial} aria-hidden="true">
        {/* Alert circle (the app's outline style): "this didn't go through". */}
        <svg
          className={styles.glyph}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </span>

      <div className={styles.text}>
        <p className={styles.title}>{title}</p>
        {detail && <p className={styles.detail}>{detail}</p>}
      </div>

      {onDismiss && (
        <button
          type="button"
          className={styles.dismiss}
          onClick={onDismiss}
          aria-label={t("common.dismissError")}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  );
}

export default ErrorNotice;

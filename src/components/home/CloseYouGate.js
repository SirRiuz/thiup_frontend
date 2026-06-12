import { useTranslation } from "react-i18next";
import styles from "../../styles/components/home/CloseYouGate.module.css";

/**
 * Close You gate — the states before the feed exists:
 *
 *   prompt      → explicit location opt-in (permission undecided)
 *   locating    → computing the reader's approximate cell
 *   error       → transient failure (timeout / no signal) → Try again
 *   denied      → blocked at browser level → settings instructions
 *                 (the native dialog CANNOT be reopened when denied)
 *   unsupported → no geolocation in this browser
 *
 * "Try again" (onRetry) re-runs the real permission flow: prompt →
 * reopens the native dialog; granted → retries the position; denied →
 * stays here with the settings instructions. Navigation back to For You
 * is the tabs' job — no redundant back button.
 */

function LocationIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function CloseYouGate({ status, onEnable, onRetry, onBack }) {
  const { t } = useTranslation();

  if (status === "locating") {
    return (
      <div className={styles.gate}>
        <span className={`${styles.iconWrap} ${styles.iconPulse}`}>
          <LocationIcon />
        </span>
        <p className={styles.title}>{t("closeYou.findingTitle")}</p>
        <p className={styles.subtitle}>{t("closeYou.findingBody")}</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className={styles.gate}>
        <span className={styles.iconWrap}>
          <LocationIcon />
        </span>
        <p className={styles.title}>{t("closeYou.errorTitle")}</p>
        <p className={styles.body}>{t("closeYou.errorBody")}</p>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={onRetry}
          >
            {t("common.tryAgain")}
          </button>
        </div>
      </div>
    );
  }

  if (status === "denied") {
    return (
      <div className={styles.gate}>
        <span className={styles.iconWrap}>
          <LocationIcon />
        </span>
        <p className={styles.title}>{t("closeYou.blockedTitle")}</p>
        <p className={styles.body}>{t("closeYou.blockedBody")}</p>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={onRetry}
          >
            {t("common.tryAgain")}
          </button>
        </div>
      </div>
    );
  }

  if (status === "unsupported") {
    return (
      <div className={styles.gate}>
        <span className={styles.iconWrap}>
          <LocationIcon />
        </span>
        <p className={styles.title}>{t("closeYou.unsupportedTitle")}</p>
        <p className={styles.body}>{t("closeYou.unsupportedBody")}</p>
      </div>
    );
  }

  // prompt — the explicit opt-in (browser permission still undecided).
  return (
    <div className={styles.gate}>
      <span className={styles.iconWrap}>
        <LocationIcon />
      </span>
      <p className={styles.title}>{t("closeYou.promptTitle")}</p>
      <p className={styles.body}>{t("closeYou.promptBody")}</p>
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.primaryButton}
          onClick={onEnable}
        >
          {t("closeYou.enable")}
        </button>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={onBack}
        >
          {t("closeYou.notNow")}
        </button>
      </div>
    </div>
  );
}

export default CloseYouGate;

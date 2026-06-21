import { Trans, useTranslation } from "react-i18next";
import styles from "../../styles/components/home/CloseYouGate.module.css";

/**
 * Close You gate — the states before the feed exists:
 *
 *   prompt      → explicit location opt-in (permission undecided)
 *   locating    → computing the reader's approximate cell
 *   error       → transient failure (timeout / no signal) → Try again
 *   denied      → blocked at browser level → sober empty-state-style notice
 *                 (the native dialog CANNOT be reopened when denied; the user
 *                 re-enables it in settings and reloads — no button here)
 *   unsupported → no geolocation in this browser
 *
 * "Try again" (onRetry) re-runs the real permission flow: prompt →
 * reopens the native dialog; granted → retries the position; denied →
 * stays here with the settings notice. Navigation back to For You
 * is the tabs' job — no redundant back button.
 */

function LocationIcon() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#9b9591"
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
    // Sober, empty-state-style notice. The browser does NOT allow reopening the
    // native dialog once denied — so there is NO button: the user re-enables
    // location in settings and reloads. One universal sentence + a reload hint;
    // no per-platform steps (conscious simplicity tradeoff).
    return (
      <div className={styles.gate}>
        <span className={styles.iconWrap}>
          <LocationIcon />
        </span>
        <p className={styles.title}>{t("closeYou.blocked.title")}</p>
        <p className={styles.body}>{t("closeYou.blocked.body")}</p>
        <p className={styles.hint}>
          <Trans i18nKey="closeYou.blocked.hint" components={{ b: <strong /> }} />
        </p>
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

  // prompt — the explicit opt-in (browser permission still undecided). Two
  // text tiers: what it does (body) + a quieter privacy reassurance, so it
  // reads as a clear hierarchy instead of one long block. The action column is
  // width-capped in CSS so the button isn't feed-wide.
  return (
    <div className={styles.gate}>
      <span className={styles.iconWrap}>
        <LocationIcon />
      </span>
      <p className={styles.title}>{t("closeYou.promptTitle")}</p>
      <p className={styles.body}>{t("closeYou.promptBody")}</p>
      <p className={styles.privacyNote}>{t("closeYou.promptPrivacy")}</p>
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

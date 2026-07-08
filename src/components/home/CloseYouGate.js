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

/* "The blurred cell" — the compose privacy note's paper micro-map, promoted
   to the gate's hero: faint grid + hinted street + a LITERALLY blurred warm
   blob (never a pin — the app never suggests an exact point). It SHOWS the
   promise the copy makes. */
function BlurredAreaMap() {
  return (
    <svg width="52" height="52" viewBox="0 0 44 44" aria-hidden="true">
      <defs>
        <filter
          id="closeYouGateBlur"
          x="-60%"
          y="-60%"
          width="220%"
          height="220%"
        >
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>
      <g stroke="#e5e0d3" strokeWidth="1">
        <line x1="15" y1="2" x2="15" y2="42" />
        <line x1="29" y1="2" x2="29" y2="42" />
        <line x1="2" y1="15" x2="42" y2="15" />
        <line x1="2" y1="29" x2="42" y2="29" />
      </g>
      <path
        d="M4 36 Q 18 28 24 18 T 40 6"
        fill="none"
        stroke="#ebe7dd"
        strokeWidth="1.4"
      />
      <rect
        x="16"
        y="16"
        width="13"
        height="13"
        rx="3"
        fill="#b8845f"
        filter="url(#closeYouGateBlur)"
      />
    </svg>
  );
}

/* Small lock for the "never stored" guarantee (the /me privacy-note glyph). */
function LockIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

function CloseYouGate({ status, onEnable, onRetry, onBack }) {
  const { t } = useTranslation();

  if (status === "locating") {
    return (
      <div className={styles.gate}>
        <span className={`${styles.mapWrap} ${styles.iconPulse}`}>
          <BlurredAreaMap />
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
      {/* The hero SHOWS the promise: an area, blurred, on paper — not a pin. */}
      <span className={styles.mapWrap}>
        <BlurredAreaMap />
      </span>
      <p className={styles.title}>{t("closeYou.promptTitle")}</p>
      <p className={styles.body}>{t("closeYou.promptBody")}</p>
      {/* Guarantee line with the /me privacy-note lock. */}
      <p className={styles.privacyNote}>
        <LockIcon />
        {t("closeYou.promptPrivacy")}
      </p>
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

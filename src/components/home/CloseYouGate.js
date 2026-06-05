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
  if (status === "locating") {
    return (
      <div className={styles.gate}>
        <span className={`${styles.iconWrap} ${styles.iconPulse}`}>
          <LocationIcon />
        </span>
        <p className={styles.title}>finding your area…</p>
        <p className={styles.subtitle}>
          computing your approximate cell (~5 km) — your coordinates never
          leave this device
        </p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className={styles.gate}>
        <span className={styles.iconWrap}>
          <LocationIcon />
        </span>
        <p className={styles.title}>we couldn't load your area</p>
        <p className={styles.body}>
          Something went wrong getting your location. You can try again.
        </p>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={onRetry}
          >
            try again
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
        <p className={styles.title}>location is blocked</p>
        <p className={styles.body}>
          Enable location for this site in your browser settings to use
          Close You, then try again.
        </p>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={onRetry}
          >
            try again
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
        <p className={styles.title}>location isn't supported</p>
        <p className={styles.body}>
          Try a browser with geolocation support to use Close You.
        </p>
      </div>
    );
  }

  // prompt — the explicit opt-in (browser permission still undecided).
  return (
    <div className={styles.gate}>
      <span className={styles.iconWrap}>
        <LocationIcon />
      </span>
      <p className={styles.title}>see what's happening near you</p>
      <p className={styles.body}>
        Close You uses an <strong>approximate area</strong> — a ~5 km
        cell, randomly blurred — never your exact location. Your area
        isn't stored on any server: it's used for the query and then
        discarded.
      </p>
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.primaryButton}
          onClick={onEnable}
        >
          enable location
        </button>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={onBack}
        >
          not now
        </button>
      </div>
    </div>
  );
}

export default CloseYouGate;

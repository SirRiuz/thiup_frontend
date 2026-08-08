import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useScrollLock } from "../utils/scrollLock";
import welcomeStyles from "../styles/components/WelcomeModal.module.css";
import styles from "../styles/components/LocationOptInModal.module.css";
import cx from "../utils/cx";

/**
 * Location opt-in — shown ONCE, a couple seconds after the first-visit
 * WelcomeModal closes. Optional: "Not now" (or Escape/backdrop) skips it
 * for good, same as WelcomeModal's "seen" flag — it never reappears once
 * dismissed, whichever way. Reuses WelcomeModal's exact panel/backdrop/
 * button chrome (imported directly, not duplicated).
 *
 * Accepting requests the REAL browser permission (getCurrentPosition). On
 * success it persists BOTH location-driven preferences so they start ON by
 * default from here on: `thiup:share-location` (ComposeModal's "Area"
 * toggle reads this as its initial state) and `thiup:closeyou-optin`
 * (FeedContext's own permission-resolution flow re-opts-in from this flag
 * as a fallback). Declining touches neither — the user can still turn
 * either on manually later, exactly as before this modal existed.
 */

const LOCATION_OPTIN_STORAGE_KEY = "thiup:location_optin_seen";

export function hasSeenLocationOptIn() {
  try {
    return window.localStorage.getItem(LOCATION_OPTIN_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function markLocationOptInSeen() {
  try {
    window.localStorage.setItem(LOCATION_OPTIN_STORAGE_KEY, "1");
  } catch {
    // Ignore: the live close still works, it just doesn't persist.
  }
}

function persistLocationEnabled() {
  try {
    window.localStorage.setItem("thiup:share-location", "true");
    window.localStorage.setItem("thiup:closeyou-optin", "true");
  } catch {
    // No storage: the permission is still granted at the browser level,
    // it just won't default the toggles on next visit.
  }
}

function LocationOptInModal({ onClose }) {
  const { t } = useTranslation();
  const [requesting, setRequesting] = useState(false);
  const dialogRef = useRef(null);
  const primaryButtonRef = useRef(null);
  const previousFocusRef = useRef(null);

  useScrollLock(true);

  const dismiss = () => {
    if (requesting) return;
    markLocationOptInSeen();
    onClose();
  };

  const handleEnable = () => {
    if (requesting) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      markLocationOptInSeen();
      onClose();
      return;
    }
    setRequesting(true);
    navigator.geolocation.getCurrentPosition(
      () => {
        persistLocationEnabled();
        markLocationOptInSeen();
        onClose();
      },
      () => {
        // Denied/unavailable: nothing persisted, same as "Not now".
        markLocationOptInSeen();
        onClose();
      },
      { maximumAge: 300000, timeout: 10000 }
    );
  };

  useEffect(() => {
    previousFocusRef.current =
      typeof document !== "undefined" ? document.activeElement : null;
    const target = primaryButtonRef.current || dialogRef.current;
    if (target) target.focus();

    return () => {
      const prev = previousFocusRef.current;
      if (prev && typeof prev.focus === "function") prev.focus();
    };
  }, []);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        dismiss();
        return;
      }
      if (e.key === "Tab") {
        const focusables = dialogRef.current?.querySelectorAll(
          'button, [href], [tabindex]:not([tabindex="-1"])'
        );
        if (!focusables || focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return createPortal(
    <div
      className={welcomeStyles.backdrop}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) dismiss();
      }}
    >
      <div
        className={welcomeStyles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="location-optin-title"
        aria-describedby="location-optin-body"
        ref={dialogRef}
        tabIndex={-1}
      >
        <span className={styles.iconTile} aria-hidden="true">
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        </span>

        <h2 className={welcomeStyles.title} id="location-optin-title">
          {t("locationOptIn.title")}
        </h2>
        <p className={welcomeStyles.mission} id="location-optin-body">
          {t("locationOptIn.body")}
        </p>

        <button
          type="button"
          className={cx(welcomeStyles.button, styles.primaryButton, "springPress")}
          ref={primaryButtonRef}
          onClick={handleEnable}
          disabled={requesting}
          aria-busy={requesting || undefined}
        >
          <span className={requesting ? styles.labelHidden : undefined}>
            {t("locationOptIn.enable")}
          </span>
          {requesting && <span className={styles.spinner} aria-hidden="true" />}
        </button>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={dismiss}
          disabled={requesting}
        >
          {t("locationOptIn.notNow")}
        </button>
      </div>
    </div>,
    document.body
  );
}

export default LocationOptInModal;

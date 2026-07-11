import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import MaskAvatar from "../MaskAvatar";
import { useScrollLock } from "../../utils/scrollLock";
import styles from "../../styles/components/me/ProfileAvatarModal.module.css";

/**
 * Fullscreen avatar viewer (IG's profile-picture dialog): tapping the
 * profile identicon opens it BIG — their exact 262px circle — centered on
 * the app's modal backdrop, with a floating close. The identicon is
 * procedural SVG, so the blow-up is perfectly crisp at any size.
 * Escape / backdrop click / the X close it; body scroll locked while open.
 */
function ProfileAvatarModal({ seed, onClose }) {
  const { t } = useTranslation();
  useScrollLock(true);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-label={t("profile.avatarLabel")}
      onClick={onClose}
    >
      <button
        type="button"
        className={styles.closeButton}
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label={t("media.viewer.close")}
      >
        <svg
          width="18"
          height="18"
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
      {/* IG's exact viewer size: a 262px circle. Clicking the avatar itself
          must not close (only backdrop/X/Escape). */}
      <span
        className={styles.avatarBox}
        onClick={(e) => e.stopPropagation()}
      >
        <MaskAvatar seed={seed} size={262} />
      </span>
    </div>,
    document.body
  );
}

export default ProfileAvatarModal;

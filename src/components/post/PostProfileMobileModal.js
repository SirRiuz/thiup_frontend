import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PostProfileHoverCard from "./PostProfileHoverCard";
import { useCurrentUser } from "../../contexts/CurrentUserContext";
import { useScrollLock } from "../../utils/scrollLock";
import styles from "../../styles/components/post/PostProfileMobileModal.module.css";

/**
 * Mobile-only stand-in for the desktop hover card (PostProfileTrigger never
 * wires hover/click-through-tooltip on touch — see that component's own
 * comment for why: mouseenter/mouseleave don't map cleanly to touch, and a
 * held tap that crossed the show-delay left the tooltip stuck open with no
 * mouseleave to ever hide it again, sometimes surviving into a bfcache
 * restore on browser back). Tapping the AVATAR opens this bottom sheet
 * instead of navigating straight away; tapping it again (its own "View
 * profile" row) is the actual navigation.
 *
 * Reuses PostProfileHoverCard's content (`bare`, so it drops the floating-
 * card chrome this panel already supplies) — one source of truth for what a
 * mask's preview shows, desktop tooltip and mobile sheet alike.
 */
function PostProfileMobileModal({ mask, onClose }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUserMask } = useCurrentUser();
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);

  // Same centralized scroll-lock every other modal in the app uses (counter-
  // based, coexists with anything else that's locking at the same time).
  useScrollLock(true);

  useEffect(() => {
    previousFocusRef.current =
      typeof document !== "undefined" ? document.activeElement : null;
    dialogRef.current?.focus();
    return () => {
      const prev = previousFocusRef.current;
      if (prev && typeof prev.focus === "function") prev.focus();
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
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
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  if (!mask?.id) return null;

  const handleViewProfile = () => {
    const target =
      currentUserMask?.id && mask.id === currentUserMask.id
        ? "/profile"
        : `/m/${mask.id}`;
    onClose();
    if (location.pathname === target) return;
    navigate(target);
  };

  return createPortal(
    <div
      className={styles.backdrop}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label={t("profile.previewLabel")}
        ref={dialogRef}
        tabIndex={-1}
      >
        <div className={styles.grabber} aria-hidden="true" />

        <PostProfileHoverCard mask={mask} bare />

        <button
          type="button"
          className={styles.viewProfile}
          onClick={handleViewProfile}
        >
          {t("profile.viewProfile")}
        </button>
      </div>
    </div>,
    document.body
  );
}

export default PostProfileMobileModal;

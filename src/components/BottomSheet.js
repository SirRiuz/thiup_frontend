import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useScrollLock } from "../utils/scrollLock";
import styles from "../styles/components/BottomSheet.module.css";

/**
 * Reusable bottom sheet (Threads-style): full-width panel that slides up from
 * the bottom over a dimmed scrim, with a grabber as a visual affordance.
 *
 * Generic shell only — the caller provides the content (and its semantics,
 * e.g. a role="menu" wrapper). Portal to <body> so `position: fixed` resolves
 * against the viewport (rails/cards use transforms).
 *
 * Closes on scrim tap and Escape (no Cancel button by design). Drag-to-dismiss
 * is intentionally left as a future enhancement; the grabber is shown anyway.
 *
 * A11y: role="dialog" + aria-modal, focus moved into the sheet and restored to
 * the previously focused element on close, simple focus trap, background scroll
 * locked.
 */
function BottomSheet({ onClose, ariaLabel, children }) {
  const sheetRef = useRef(null);
  const previousFocusRef = useRef(null);

  useScrollLock(true);

  useEffect(() => {
    previousFocusRef.current =
      typeof document !== "undefined" ? document.activeElement : null;
    sheetRef.current?.focus();
    return () => {
      const prev = previousFocusRef.current;
      if (prev && typeof prev.focus === "function") prev.focus();
    };
  }, []);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key === "Tab") {
        const focusables = sheetRef.current?.querySelectorAll(
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
  }, [onClose]);

  return createPortal(
    <div
      className={styles.scrim}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        ref={sheetRef}
        tabIndex={-1}
      >
        <div className={styles.grabber} aria-hidden="true" />
        {children}
      </div>
    </div>,
    document.body
  );
}

export default BottomSheet;

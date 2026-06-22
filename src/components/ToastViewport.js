import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styles from "../styles/components/ToastViewport.module.css";

const CheckIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);
const AlertIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9.5" />
    <path d="M12 7.5v5.5" />
    <path d="M12 16.5h.01" />
  </svg>
);
const InfoIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9.5" />
    <path d="M12 11v5" />
    <path d="M12 7.5h.01" />
  </svg>
);

const ICONS = { success: CheckIcon, error: AlertIcon, info: InfoIcon };

// Resolve the leading glyph. Explicit `toast.icon` wins; otherwise the type's
// default. "none" → nothing (copy confirmations), "spinner" / type "loading" →
// spinning ring. The success glyph is the check, coloured WHITE via CSS
// (.success .icon) — no per-toast colour here.
function renderIcon(toast) {
  const override = toast.icon;
  if (override === "none") return null;
  if (override === "spinner" || toast.type === "loading") {
    return <span className={styles.spinner} aria-hidden="true" />;
  }
  const Icon = ICONS[toast.type];
  if (!Icon) return null;
  return (
    <span className={styles.icon}>
      <Icon />
    </span>
  );
}

function Toast({ toast, onDismiss }) {
  const [leaving, setLeaving] = useState(false);
  const exitTimerRef = useRef(null);
  const autoTimerRef = useRef(null);

  // Fade out, then remove from the stack.
  const close = useCallback(() => {
    setLeaving(true);
    exitTimerRef.current = window.setTimeout(() => onDismiss(toast.id), 200);
  }, [onDismiss, toast.id]);

  // Auto-dismiss — ONLY when a duration is set. `0`/falsey = persistent (the
  // loading toast stays until updated/dismissed). When a later updateToast sets
  // a real duration (loading → posted), this effect re-runs and arms the timer.
  useEffect(() => {
    if (!toast.duration) return undefined;
    autoTimerRef.current = window.setTimeout(close, toast.duration);
    return () => window.clearTimeout(autoTimerRef.current);
  }, [close, toast.duration]);

  // Exit-animation timer cleared on unmount (independent of duration).
  useEffect(() => () => window.clearTimeout(exitTimerRef.current), []);

  const isError = toast.type === "error";
  const isLoading = toast.type === "loading";
  const { action } = toast;

  // The action runs its handler then dismisses. stopPropagation so the pill's
  // own click-to-dismiss doesn't also fire. For a real link, let the browser
  // handle modified clicks (new tab); otherwise prevent the full load and let
  // onClick do the SPA navigation.
  const handleAction = (e) => {
    e.stopPropagation();
    if (action?.href) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
      e.preventDefault();
    }
    action?.onClick?.();
    close();
  };

  return (
    <div
      className={`${styles.toast} ${styles[toast.type] || styles.info} ${
        leaving ? styles.leaving : ""
      }`}
      // SR announcement: assertive for errors, polite otherwise. aria-busy while
      // loading. Never steals focus or blocks interaction.
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
      aria-busy={isLoading || undefined}
      // A persistent loading toast is not click-to-dismiss (work in progress).
      onClick={isLoading ? undefined : close}
    >
      {renderIcon(toast)}
      <span className={styles.message}>{toast.message}</span>
      {action &&
        (action.href ? (
          <a href={action.href} className={styles.action} onClick={handleAction}>
            {action.label}
          </a>
        ) : (
          <button type="button" className={styles.action} onClick={handleAction}>
            {action.label}
          </button>
        ))}
    </div>
  );
}

function ToastViewport({ toasts, onDismiss }) {
  if (typeof document === "undefined") return null;
  return createPortal(
    <div className={styles.viewport}>
      {toasts.map((toShow) => (
        <Toast key={toShow.id} toast={toShow} onDismiss={onDismiss} />
      ))}
    </div>,
    document.body
  );
}

export default ToastViewport;

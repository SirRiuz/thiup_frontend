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

function Toast({ toast, onDismiss }) {
  const [leaving, setLeaving] = useState(false);
  const exitTimerRef = useRef(null);
  const autoTimerRef = useRef(null);

  // Fade out, then remove from the stack.
  const close = useCallback(() => {
    setLeaving(true);
    exitTimerRef.current = window.setTimeout(() => onDismiss(toast.id), 200);
  }, [onDismiss, toast.id]);

  useEffect(() => {
    autoTimerRef.current = window.setTimeout(close, toast.duration ?? 2000);
    return () => {
      window.clearTimeout(autoTimerRef.current);
      window.clearTimeout(exitTimerRef.current);
    };
  }, [close, toast.duration]);

  const isError = toast.type === "error";
  const Icon = ICONS[toast.type] || ICONS.info;

  return (
    <div
      className={`${styles.toast} ${styles[toast.type] || styles.info} ${
        leaving ? styles.leaving : ""
      }`}
      // SR announcement: assertive for errors, polite otherwise. Does not steal
      // focus or block interaction.
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
      onClick={close}
    >
      <span className={styles.icon}>
        <Icon />
      </span>
      <span className={styles.message}>{toast.message}</span>
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

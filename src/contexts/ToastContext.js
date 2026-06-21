import { createContext, useCallback, useContext, useState } from "react";
import ToastViewport from "../components/ToastViewport";

/**
 * Central, reusable toast system. Mount <ToastProvider> high in the tree; any
 * screen can then do:
 *
 *   const showToast = useToast();
 *   showToast({ type: "success", message: t("toast.linkCopied") });
 *
 * Types: "success" | "error" | "info". Messages arrive ALREADY translated
 * (i18n) — the system never hardcodes copy. Toasts are rendered in a portal
 * above everything (see ToastViewport), auto-dismiss (~3s) and stack (capped).
 */

const ToastContext = createContext(null);
const MAX_TOASTS = 3;
const noop = () => undefined;
let idCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((toShow) => toShow.id !== id));
  }, []);

  const showToast = useCallback(({ type = "info", message, duration = 2000 } = {}) => {
    if (!message) return undefined;
    idCounter += 1;
    const id = idCounter;
    setToasts((prev) => {
      const next = [...prev, { id, type, message, duration }];
      // Cap the stack: drop the oldest (its own timer is cleared on unmount).
      return next.length > MAX_TOASTS ? next.slice(next.length - MAX_TOASTS) : next;
    });
    return id;
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

// Returns showToast({ type, message }). No-op if no provider is mounted.
export function useToast() {
  return useContext(ToastContext) || noop;
}

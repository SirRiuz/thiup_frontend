import { createContext, useCallback, useContext, useMemo, useState } from "react";
import ToastViewport from "../components/ToastViewport";

/**
 * Central, reusable toast system. Mount <ToastProvider> high in the tree; any
 * screen can then do:
 *
 *   const showToast = useToast();
 *   showToast({ type: "success", message: t("toast.linkCopied"), icon: "none" });
 *
 * Options: { type, message, duration, action, icon }
 *   - type: "success" | "error" | "info" | "loading". Drives aria semantics and
 *     the default glyph. "loading" shows a spinner and is PERSISTENT by default.
 *   - duration: ms until auto-dismiss. `0` (or falsey) = PERSISTENT — stays until
 *     updated or dismissed. Default 2000.
 *   - icon: override the glyph — "none" (no icon, e.g. copy confirmations),
 *     "check" (WHITE check #f7f5f0), "spinner". Omit to use the type's default.
 *   - action: a trailing link/button inside the pill (Threads-style "View").
 *     `{ label, href?, onClick }` — copy already translated; with `href` it
 *     renders as a real <a> (keyboard/new-tab) and `onClick` does the SPA nav.
 *
 * showToast returns an `id`. Drive a persistent toast with the augmented
 * function: `showToast.update(id, patch)` morphs it IN PLACE (same node, no
 * jump — key to the "Publishing… → Thread posted" sequence) and
 * `showToast.dismiss(id)` closes it. Setting a new `duration` via update
 * (re)starts the auto-dismiss.
 *
 * Messages arrive ALREADY translated (i18n). Toasts render in a portal above
 * everything (see ToastViewport) and the stack is capped.
 */

const ToastContext = createContext(null);
const MAX_TOASTS = 3;
const noop = () => undefined;
noop.update = noop;
noop.dismiss = noop;
let idCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toShow) => toShow.id !== id));
  }, []);

  const showToast = useCallback(
    ({ type = "info", message, duration = 2000, action, icon } = {}) => {
      if (!message) return undefined;
      idCounter += 1;
      const id = idCounter;
      setToasts((prev) => {
        const next = [...prev, { id, type, message, duration, action, icon }];
        // Cap the stack: drop the oldest (its own timer is cleared on unmount).
        return next.length > MAX_TOASTS ? next.slice(next.length - MAX_TOASTS) : next;
      });
      return id;
    },
    []
  );

  // Update an existing toast IN PLACE (same id → same DOM node, no remount and
  // no re-entry animation). `patch` merges over the current toast; a new
  // `duration` makes the Toast re-arm (or clear) its auto-dismiss timer.
  const updateToast = useCallback((id, patch = {}) => {
    if (id == null) return;
    setToasts((prev) =>
      prev.map((toShow) => (toShow.id === id ? { ...toShow, ...patch, id } : toShow))
    );
  }, []);

  // The context value IS the showToast function (backward compatible: callers
  // keep doing `const showToast = useToast(); showToast({...})`), augmented with
  // `.update` / `.dismiss` for persistent toasts. Memoized so the augmented
  // function is stable across renders.
  const api = useMemo(() => {
    const fn = (opts) => showToast(opts);
    fn.update = updateToast;
    fn.dismiss = dismissToast;
    return fn;
  }, [showToast, updateToast, dismissToast]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

// Returns the augmented showToast (with .update / .dismiss). No-op if no
// provider is mounted.
export function useToast() {
  return useContext(ToastContext) || noop;
}

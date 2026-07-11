/**
 * Silences the BENIGN, browser-emitted warning:
 *   "ResizeObserver loop completed with undelivered notifications."
 *   (older Chrome wording: "ResizeObserver loop limit exceeded")
 *
 * It fires when responding to a resize triggers another resize that the browser
 * defers to the next frame. It is harmless — no layout break, no infinite
 * re-render — but CRA's dev error overlay (webpack-dev-server) surfaces it as an
 * "Uncaught runtime error", which is pure noise and alarms users/devs.
 *
 * We swallow ONLY this exact message (by text match). Every OTHER error still
 * propagates to the overlay and the console — this is not a blanket error
 * suppressor and must not become one.
 */

const RO_MESSAGES = [
  "ResizeObserver loop completed with undelivered notifications",
  "ResizeObserver loop limit exceeded",
];

const isResizeObserverNoise = (message) =>
  typeof message === "string" && RO_MESSAGES.some((m) => message.includes(m));

export default function silenceResizeObserverError() {
  if (typeof window === "undefined") return;

  // Capture phase + stopImmediatePropagation so the dev overlay's own 'error'
  // listener never runs FOR THIS MESSAGE ONLY. Registered first thing at app
  // startup so it precedes the overlay client's listener.
  window.addEventListener(
    "error",
    (event) => {
      if (isResizeObserverNoise(event.message)) {
        event.stopImmediatePropagation();
        event.preventDefault();
      }
    },
    true
  );
}

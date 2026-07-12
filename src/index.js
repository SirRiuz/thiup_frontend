import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
// Initialize the UI i18n (OS language + persisted preference).
import "./i18n";
import silenceResizeObserverError from "./utils/silenceResizeObserverError";
import stripWafParams from "./utils/stripWafParams";
import initAntiSnoop from "./utils/antiSnoop";
import { initHumanBlock } from "./utils/humanBlock";

// Swallow ONLY the benign "ResizeObserver loop ..." browser warning so it stops
// tripping CRA's error overlay. All other errors still surface. Registered
// before render so it precedes the dev overlay's own error listener.
silenceResizeObserverError();

// Scrub Cloudflare WAF challenge tokens (?__cf_chl_f_tk=...) that the challenge
// redirect sometimes leaves in the URL — BEFORE the router mounts, so the clean
// URL is what lands in the address bar, history and any copied link.
stripWafParams();

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Casual anti-prying guard: with REACT_APP_DEBUG=false it wipes the DOM and
// shows a calm on-brand notice when the browser DevTools are detected open.
// No-op with DEBUG=true so development keeps DevTools available. onLockdown
// unmounts React first so it removes its portals cleanly before the wipe.
initAntiSnoop({ onLockdown: () => root.unmount() });

// Human-verification wall: when the invisible captcha can't prove the visitor
// is human (persistent CAPTCHA_FAILED), the API layer wipes the DOM and shows
// an on-brand notice. Register the same teardown so React unmounts cleanly
// before the wipe.
initHumanBlock({ onLockdown: () => root.unmount() });

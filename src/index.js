import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
// Initialize the UI i18n (OS language + persisted preference).
import "./i18n";
import silenceResizeObserverError from "./utils/silenceResizeObserverError";
import stripWafParams from "./utils/stripWafParams";

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

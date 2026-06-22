import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
// Initialize the UI i18n (OS language + persisted preference).
import "./i18n";
import silenceResizeObserverError from "./utils/silenceResizeObserverError";

// Swallow ONLY the benign "ResizeObserver loop ..." browser warning so it stops
// tripping CRA's error overlay. All other errors still surface. Registered
// before render so it precedes the dev overlay's own error listener.
silenceResizeObserverError();

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

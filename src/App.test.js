import { render } from "@testing-library/react";
import App from "./App";

// Smoke test: the app mounts without crashing (router + providers + splash).
// Replaces the CRA boilerplate ("learn react"), which does not apply to this app.
// The startup fetches (healthcheck, /me/) fail under jsdom and the contexts
// handle that error — the render must not fall over.
test("renders the app shell without crashing", () => {
  render(<App />);
});

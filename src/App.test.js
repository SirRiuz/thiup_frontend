import { render } from "@testing-library/react";
import App from "./App";

// Smoke test: la app monta sin crashear (router + providers + splash).
// Reemplaza el boilerplate de CRA ("learn react"), que no aplica a esta app.
// Los fetch de arranque (healthcheck, /me/) fallan en jsdom y los contexts
// manejan ese error — el render no debe tumbarse.
test("renders the app shell without crashing", () => {
  render(<App />);
});

import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Post from "./screens/Post";
import NotFound from "./screens/NotFound";
import HomeNew from "./screens/HomeNew";
import SearchNew from "./screens/SearchNew";
import MyThreads from "./screens/MyThreads";
import ScrollToTop from "./components/ScrollToTop";
import SplashScreen from "./components/SplashSreen";
import WelcomeModal, { hasSeenWelcome } from "./components/WelcomeModal";
import AppShell from "./components/nav/AppShell";
import { FeedProvider } from "./contexts/FeedContext";
import { CurrentUserProvider } from "./contexts/CurrentUserContext";
import { ThreadCacheProvider } from "./contexts/ThreadCacheContext";
import { SearchCacheProvider } from "./contexts/SearchCacheContext";
import {
  ServerHealthProvider,
  ServerHealthGate,
} from "./contexts/ServerHealthContext";
import { ToastProvider } from "./contexts/ToastContext";
import ServerError from "./screens/ServerError";
import "./styles/index.css";

export default function App() {
  // The splash manages its own timing (short minimum + fade-out) and signals
  // via onFinish to unmount itself.
  const [showSplash, setShowSplash] = useState(true);
  // Welcome modal: shown ONCE on the first visit (flag in localStorage). The
  // modal sets the flag on close, so on later visits/reloads this is false.
  const [showWelcome, setShowWelcome] = useState(() => !hasSeenWelcome());

  return (
    <>
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
      {/* First-visit welcome — overlays any screen once the splash has faded. */}
      {!showSplash && showWelcome && (
        <WelcomeModal mandatory onClose={() => setShowWelcome(false)} />
      )}
      {/* Server down (healthcheck) => Oops screen instead of the app.
          The check runs on load and on any 5xx. */}
      <ServerHealthProvider>
        <ServerHealthGate fallback={<ServerError />}>
          {/* Toasts available to every screen; rendered in a portal above all. */}
          <ToastProvider>
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <CurrentUserProvider>
              <FeedProvider>
                <ThreadCacheProvider>
                  <SearchCacheProvider>
                    <ScrollToTop />
                    <Routes>
                      <Route
                        path="/"
                        element={<Navigate to="/home" replace />}
                      />
                      {/* ADDITIVE layout route: the AppShell adds the NavRail
                        (capsule/bar) around Home and Search via Outlet
                        — the screens' content is not modified. */}
                      <Route element={<AppShell />}>
                        <Route path="/home" element={<HomeNew />} />
                        <Route path="/search" element={<SearchNew />} />
                        <Route path="/me" element={<MyThreads />} />
                        {/* The thread view also lives inside the shell:
                          rail visible (no active item — the route doesn't match
                          any) and bottom bar on mobile. The
                          thread's content is not modified. */}
                        <Route path="/post/:id/" element={<Post />} />
                      </Route>
                      {/* /post without id (hand-edited URL): to /home, not to 404. */}
                      <Route
                        path="/post"
                        element={<Navigate to="/home" replace />}
                      />
                      {/* Old My threads route: links/bookmarks don't break. */}
                      <Route
                        path="/my-threads"
                        element={<Navigate to="/me" replace />}
                      />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </SearchCacheProvider>
                </ThreadCacheProvider>
              </FeedProvider>
            </CurrentUserProvider>
          </BrowserRouter>
          </ToastProvider>
        </ServerHealthGate>
      </ServerHealthProvider>
    </>
  );
}

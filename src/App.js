import { useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  useParams,
} from "react-router-dom";
import Post from "./screens/Post";
import NotFound from "./screens/NotFound";
import HomeNew from "./screens/HomeNew";
import SearchNew from "./screens/SearchNew";
import MyThreads from "./screens/MyThreads";
import AnonProfile from "./screens/AnonProfile";
import Notifications from "./screens/Notifications";
import ScrollToTop from "./components/ScrollToTop";
import SplashScreen from "./components/SplashSreen";
import WelcomeModal, { hasSeenWelcome } from "./components/WelcomeModal";
import LocationOptInModal, {
  hasSeenLocationOptIn,
} from "./components/LocationOptInModal";
import AppShell from "./components/nav/AppShell";
import { FeedProvider } from "./contexts/FeedContext";
import { ComposeProvider } from "./contexts/ComposeContext";
import { CurrentUserProvider } from "./contexts/CurrentUserContext";
import { ThreadCacheProvider } from "./contexts/ThreadCacheContext";
import { SearchCacheProvider } from "./contexts/SearchCacheContext";
import {
  ServerHealthProvider,
  ServerHealthGate,
} from "./contexts/ServerHealthContext";
import { ToastProvider } from "./contexts/ToastContext";
import ServerError from "./screens/ServerError";
import NetworkError from "./screens/NetworkError";
import "./styles/index.css";

// Legacy /post/:id → canonical short /p/:id (replace: the long URL doesn't
// stay in history). Old shared links keep working and normalize to the short
// form in the address bar.
function LegacyPostRedirect() {
  const { id } = useParams();
  return <Navigate to={`/p/${id}`} replace />;
}

// /anon/:maskId was the profile's first URL — /m/:id is the canonical one
// (the /p/:id convention: p = post, m = mask). Kept so shared links survive.
function LegacyAnonRedirect() {
  const { maskId } = useParams();
  return <Navigate to={`/m/${maskId}`} replace />;
}

// /me was the private profile's first URL — /profile is the canonical one.
// The search is preserved so /me?tab=media lands on the right tab.
function LegacyMeRedirect() {
  const location = useLocation();
  return (
    <Navigate to={{ pathname: "/profile", search: location.search }} replace />
  );
}

export default function App() {
  // The splash manages its own timing (short minimum + fade-out) and signals
  // via onFinish to unmount itself.
  const [showSplash, setShowSplash] = useState(true);
  // Welcome modal: shown ONCE on the first visit (flag in localStorage). The
  // modal sets the flag on close, so on later visits/reloads this is false.
  const [showWelcome, setShowWelcome] = useState(() => !hasSeenWelcome());
  // Location opt-in: shown ONCE, a couple seconds after the first-visit
  // Welcome closes (never on the ☰ "About" reopen — that's a separate,
  // dismissible mount not wired to this trigger). Optional and one-shot,
  // same "seen" flag pattern as Welcome — see LocationOptInModal.
  const [showLocationOptIn, setShowLocationOptIn] = useState(false);
  const handleWelcomeClose = () => {
    setShowWelcome(false);
    if (!hasSeenLocationOptIn()) {
      setTimeout(() => setShowLocationOptIn(true), 2000);
    }
  };

  return (
    <>
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
      {/* First-visit welcome — overlays any screen once the splash has faded. */}
      {!showSplash && showWelcome && (
        <WelcomeModal mandatory onClose={handleWelcomeClose} />
      )}
      {!showSplash && !showWelcome && showLocationOptIn && (
        <LocationOptInModal onClose={() => setShowLocationOptIn(false)} />
      )}
      {/* Server down (healthcheck) => Oops screen instead of the app.
          The check runs on load and on any 5xx. */}
      <ServerHealthProvider>
        <ServerHealthGate
          fallback={<ServerError />}
          offlineFallback={<NetworkError />}
        >
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
                    {/* Global composer: one modal, opened from the home
                        compose row and the nav "+" on every screen. Inside
                        the router (it navigates on post) and the feed/user
                        providers (it posts through them). */}
                    <ComposeProvider>
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
                        <Route path="/notifications" element={<Notifications />} />
                        <Route path="/profile" element={<MyThreads />} />
                        {/* Legacy: the private profile's old URL. */}
                        <Route path="/me" element={<LegacyMeRedirect />} />
                        {/* Anonymous PUBLIC profile — same anatomy as /profile,
                            public data only (own mask redirects to /profile).
                            /m/:id mirrors /p/:id (p = post, m = mask). */}
                        <Route path="/m/:maskId" element={<AnonProfile />} />
                        {/* Legacy: the profile's first URL. */}
                        <Route
                          path="/anon/:maskId"
                          element={<LegacyAnonRedirect />}
                        />
                        {/* The thread view also lives inside the shell:
                          rail visible (no active item — the route doesn't match
                          any) and bottom bar on mobile. The
                          thread's content is not modified. /p/:id is the
                          CANONICAL short URL; every in-app navigation uses it. */}
                        <Route path="/p/:id/" element={<Post />} />
                        {/* Deep link into the thread's OWN media, opened
                          directly in the fullscreen viewer (e.g. shared from
                          the viewer's "Copy link", or restored on reload).
                          SAME element as /p/:id — react-router doesn't key
                          the rendered route by its path pattern, so toggling
                          between the two as the viewer opens/slides/closes
                          updates params WITHOUT remounting Post (no
                          data re-fetch, no flash). */}
                        <Route path="/p/:id/m/:mediaId" element={<Post />} />
                      </Route>
                      {/* Legacy long URL (back-compat): old shared /post/:id
                        links redirect to the canonical /p/:id. */}
                      <Route path="/post/:id/" element={<LegacyPostRedirect />} />
                      {/* /p or /post without id (hand-edited URL): to /home, not 404. */}
                      <Route path="/p" element={<Navigate to="/home" replace />} />
                      <Route
                        path="/post"
                        element={<Navigate to="/home" replace />}
                      />
                      {/* Old My threads route: links/bookmarks don't break. */}
                      <Route
                        path="/my-threads"
                        element={<Navigate to="/profile" replace />}
                      />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                    </ComposeProvider>
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

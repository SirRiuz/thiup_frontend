import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Post from "./screens/Post";
import NotFound from "./screens/NotFound";
import HomeNew from "./screens/HomeNew";
import SearchNew from "./screens/SearchNew";
import ScrollToTop from "./components/ScrollToTop";
import SplashScreen from "./components/SplashSreen";
import { FeedProvider } from "./contexts/FeedContext";
import { CurrentUserProvider } from "./contexts/CurrentUserContext";
import { ThreadCacheProvider } from "./contexts/ThreadCacheContext";
import { SearchCacheProvider } from "./contexts/SearchCacheContext";
import {
  ServerHealthProvider,
  ServerHealthGate,
} from "./contexts/ServerHealthContext";
import ServerError from "./screens/ServerError";
import "./styles/index.css";

export default function App() {
  // El splash maneja su propio timing (mínimo corto + fade-out) y avisa con
  // onFinish para desmontarse.
  const [showSplash, setShowSplash] = useState(true);

  return (
    <>
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
      {/* Servidor caído (healthcheck) => pantalla Oops en lugar de la app.
          La verificación corre al cargar y ante cualquier 5xx. */}
      <ServerHealthProvider>
        <ServerHealthGate fallback={<ServerError />}>
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
                    <Route path="/" element={<Navigate to="/home" replace />} />
                    <Route path="/home" element={<HomeNew />} />
                    <Route path="/search" element={<SearchNew />} />
                    <Route path="/post/:id/" element={<Post />} />
                    {/* /post sin id (URL editada a mano): a /home, no al 404. */}
                    <Route path="/post" element={<Navigate to="/home" replace />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </SearchCacheProvider>
              </ThreadCacheProvider>
            </FeedProvider>
            </CurrentUserProvider>
          </BrowserRouter>
        </ServerHealthGate>
      </ServerHealthProvider>
    </>
  );
}

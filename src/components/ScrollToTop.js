import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

/**
 * Scroll manager global — control TOTAL del scroll (anti-drift).
 *
 * Por qué manual: con scrollRestoration 'auto' el navegador restauraba por su
 * cuenta COMPITIENDO con el render de React (y con restauraciones manuales).
 * Cada vuelta podía clamparse contra una altura transitoria y quedar corrida;
 * la siguiente navegación guardaba esa posición ya corrida como nueva base →
 * drift acumulativo en el feed. Con 'manual' el navegador no toca el scroll y
 * aquí se controla todo de forma determinista.
 *
 * Mecanismo:
 *  - Tracking pasivo de window.scrollY en un ref (último valor REAL mientras
 *    la pantalla vivía). No se puede leer window.scrollY al cambiar de ruta:
 *    para entonces el DOM ya cambió y pudo clamparse.
 *  - Al cambiar de entrada del historial (location.key), se persiste la
 *    posición EXACTA de la entrada que se abandona — una sola vez, en el
 *    instante de salir (y nunca se re-guarda tras restaurar: anti-drift).
 *  - POP (back/forward): restaura la posición guardada de esa entrada, con
 *    reintentos por frame (la altura final puede llegar tarde) hasta caer
 *    EXACTO o agotar intentos.
 *  - PUSH (o REPLACE que cambia de pathname): scroll al top (página nueva).
 *    REPLACE del mismo pathname (ej: tipear en la búsqueda reescribe ?q=):
 *    no se toca el scroll.
 *
 * Cubre TODAS las pantallas (feed, search, post) y TODAS las navegaciones
 * (hilos, tags) con un único mecanismo — sin restauradores duplicados.
 */

if ("scrollRestoration" in window.history) {
  window.history.scrollRestoration = "manual";
}

// Posición exacta por entrada del historial (location.key es único por
// entrada en React Router v6). Tope simple para no crecer sin límite.
const positions = new Map();
const MAX_POSITIONS = 50;

function ScrollToTop() {
  const location = useLocation();
  const navigationType = useNavigationType();

  const lastScrollRef = useRef(window.scrollY);
  const prevKeyRef = useRef(location.key);
  const prevPathRef = useRef(location.pathname);

  // Tracking pasivo: solo actualiza el ref (no persiste nada por sí solo).
  useEffect(() => {
    const onScroll = () => {
      lastScrollRef.current = window.scrollY;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useLayoutEffect(() => {
    const prevKey = prevKeyRef.current;
    const prevPath = prevPathRef.current;
    if (prevKey === location.key) return undefined; // montaje inicial

    // Persiste la posición exacta de la entrada que se abandona.
    positions.set(prevKey, lastScrollRef.current);
    if (positions.size > MAX_POSITIONS) {
      positions.delete(positions.keys().next().value);
    }
    prevKeyRef.current = location.key;
    prevPathRef.current = location.pathname;

    if (navigationType === "POP") {
      // Volver atrás/adelante: restauración exacta con reintentos. El primer
      // intento es síncrono (layout effect, antes del paint): con el estado
      // cacheado renderizando de una, normalmente cae sin ningún salto.
      const target = positions.get(location.key) ?? 0;
      let attempts = 0;
      let rafId = 0;
      const restore = () => {
        window.scrollTo(0, target);
        lastScrollRef.current = window.scrollY;
        attempts += 1;
        if (Math.abs(window.scrollY - target) > 1 && attempts < 20) {
          rafId = requestAnimationFrame(restore);
        }
      };
      restore();
      return () => cancelAnimationFrame(rafId);
    }

    // PUSH (o REPLACE que cambia de pantalla): página nueva → top.
    // REPLACE del mismo pathname (?q= al tipear) no toca el scroll.
    if (navigationType === "PUSH" || prevPath !== location.pathname) {
      window.scrollTo(0, 0);
      lastScrollRef.current = 0;
    }
    return undefined;
  }, [location.key, location.pathname, navigationType]);

  return null;
}

export default ScrollToTop;

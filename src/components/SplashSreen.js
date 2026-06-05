import { useEffect, useState } from "react";
import { useScrollLock } from "../utils/scrollLock";
import styles from "../styles/components/SplashScreen.module.css";

// Rápido: la app es una SPA — está "lista" en cuanto React monta (cada
// pantalla carga su data con skeletons). Solo se mantiene un mínimo CORTO
// para que la animación se alcance a ver (antes: 1500ms fijos + corte seco).
const MIN_DISPLAY_MS = 700;
const FADE_OUT_MS = 350;

/**
 * Splash screen — telón animado estilo Threads.
 *
 * - Telón: cubre todo (fixed, opaco, z-index alto), bloquea scroll y eventos.
 * - Animación A: fade + scale suave en loop (splashPulse) sobre el squircle.
 * - Sale rápido: mínimo corto + fade-out suave; no espera a completar el loop.
 */
export default function SplashScreen({ onFinish }) {
  const [isLeaving, setIsLeaving] = useState(false);

  // Telón: bloquea el scroll del body mientras el splash está visible, vía
  // el scroll-lock centralizado (contador) — coexiste con otros lockers
  // (ej: el loading de /post) sin pisarse, y el unlock está garantizado.
  useScrollLock(true);

  // Mínimo corto de display → fade-out → onFinish (App desmonta el splash).
  useEffect(() => {
    const timer = setTimeout(() => setIsLeaving(true), MIN_DISPLAY_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isLeaving) return undefined;
    const timer = setTimeout(() => {
      if (onFinish) onFinish();
    }, FADE_OUT_MS);
    return () => clearTimeout(timer);
  }, [isLeaving, onFinish]);

  return (
    <div
      className={`${styles.curtain} ${isLeaving ? styles.curtainLeaving : ""}`}
      role="status"
      aria-label="Loading"
    >
      {/* ============================================================
          PLACEHOLDER DEL LOGO — reemplazar este contenido por el logo
          definitivo (<img src={...} /> o un SVG) DENTRO del squircle.
          La animación (splashPulse) vive en el contenedor, así el logo
          la hereda sin cambios.
          ============================================================ */}
      <div className={styles.logoPlaceholder}>
        <span className={styles.logoHint}>logo</span>
      </div>
    </div>
  );
}

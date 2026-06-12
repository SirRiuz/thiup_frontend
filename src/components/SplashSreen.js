import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useScrollLock } from "../utils/scrollLock";
import BrandLogo from "./BrandLogo";
import styles from "../styles/components/SplashScreen.module.css";

// Fast: the app is an SPA — it's "ready" as soon as React mounts (each
// screen loads its data with skeletons). Only a SHORT minimum is kept so the
// animation can be seen (previously: fixed 1500ms + abrupt cut).
const MIN_DISPLAY_MS = 1400;
const FADE_OUT_MS = 350;

/**
 * Splash screen — Threads-style animated curtain.
 *
 * - Curtain: covers everything (fixed, opaque, high z-index), blocks scroll
 *   and events.
 * - Animation A: smooth fade + scale in a loop (splashPulse) over the squircle.
 * - Exits fast: short minimum + smooth fade-out; doesn't wait for the loop to
 *   complete.
 */
export default function SplashScreen({ onFinish }) {
  const { t } = useTranslation();
  const [isLeaving, setIsLeaving] = useState(false);

  // Curtain: blocks the body scroll while the splash is visible, via the
  // centralized scroll-lock (counter) — coexists with other lockers (e.g.
  // the /post loading) without clobbering, and the unlock is guaranteed.
  useScrollLock(true);

  // Short display minimum → fade-out → onFinish (App unmounts the splash).
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
      aria-label={t("splash.loading")}
    >
      {/* Brand icon (thread + dot) — the pulse animation lives on the logo
          class, same rhythm as the old placeholder. */}
      <BrandLogo size={72} className={styles.logo} />
    </div>
  );
}

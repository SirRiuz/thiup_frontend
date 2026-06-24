import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useScrollLock } from "../../utils/scrollLock";
import VideoPlayer from "./VideoPlayer";
import styles from "../../styles/components/media/MediaViewer.module.css";

// Warm-dark fallback when an image has no dominant color (keeps the light
// controls legible). Threads-like: the background IS the image's color.
const FALLBACK_BG = "#1a1a1a";

// Gesture thresholds.
const AXIS_LOCK = 10; // px before we commit to horizontal vs vertical
const NAV_RATIO = 0.22; // fraction of width to change image
const CLOSE_DISTANCE = 110; // px of vertical drag to dismiss
const CLOSE_MS = 240; // exit duration — image + background fade together
const EXIT_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

// Coerce a stored color into a VALID CSS color. The backend default arrives as
// bare hex without '#' (e.g. "161c1e", common on videos that don't compute a
// frame color). Assigning an invalid color is ignored by the browser, so the
// background would keep the PREVIOUS item's color (the image→video bug) — adding
// the '#' makes it apply, so the bg always reflects the current item.
const normalizeColor = (c) => {
  if (!c || typeof c !== "string") return FALLBACK_BG;
  const v = c.trim();
  if (!v) return FALLBACK_BG;
  if (v[0] === "#") return v;
  if (/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(v)) return `#${v}`;
  return v; // assume an already-valid named/functional color
};

const colorOf = (images, i) => normalizeColor(images[i]?.dominantColor);

// Threads-style item change: NOT a view-pager lateral sweep. The new item
// appears slightly small + dim and settles to full size/opacity in place — so
// the stage resizes to the new item's proportion as it fades in (notable when
// adjacent items differ, e.g. a vertical video then a wide photo). The bg color
// morph (driven by setIndex) is coordinated with it. Call AFTER swapping index.
function morphInPlace(s) {
  if (!s) return;
  s.style.transition = "none";
  s.style.transform = "translate3d(0, 0, 0) scale(0.96)";
  s.style.opacity = "0.4";
  requestAnimationFrame(() => {
    s.style.transition = "";
    s.style.transform = "translate3d(0, 0, 0) scale(1)";
    s.style.opacity = "1";
  });
}

// Return focus to the opener for a11y, but WITHOUT the keyboard focus ring:
// closing via Escape leaves keyboard modality, which would make the opener match
// :focus-visible. The data attribute suppresses the outline (see index.css) only
// for this silent restore, and is removed on the next blur so real keyboard focus
// still shows a ring.
const restoreFocusSilently = (el) => {
  if (!el || typeof el.focus !== "function") return;
  el.setAttribute("data-focus-silent", "");
  el.focus({ preventScroll: true });
  const cleanup = () => {
    el.removeAttribute("data-focus-silent");
    el.removeEventListener("blur", cleanup);
  };
  el.addEventListener("blur", cleanup);
};

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}
function ChevronIcon({ dir }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={dir === "right" ? { transform: "scaleX(-1)" } : undefined}>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

/**
 * Fullscreen media viewer (portal). Opens at `index`; background is the current
 * image's dominant color (morphs between images). Horizontal swipe / arrows /
 * ←→ keys change image; swipe-down dismisses (image follows, background fades),
 * with a snap-back if not dragged far enough.
 *
 * A11y: role=dialog + aria-modal, focus trapped, Escape closes, focus restored
 * on close, background scroll locked. Gesture follows via rAF; reduced-motion
 * drops the open/close animation.
 */
function MediaViewer({ images, index: startIndex, onClose }) {
  const { t } = useTranslation();
  const [index, setIndexState] = useState(startIndex);
  const [bgColor, setBgColor] = useState(() => colorOf(images, startIndex));
  const [entered, setEntered] = useState(false);
  const [closing, setClosing] = useState(false);

  const viewerRef = useRef(null);
  const stageRef = useRef(null);
  const bgRef = useRef(null);
  const closingRef = useRef(false);
  const finishedRef = useRef(false);
  const closeTimerRef = useRef(0);
  const previousFocusRef = useRef(null);
  const reducedRef = useRef(false);
  const idxRef = useRef(startIndex);
  const g = useRef({
    active: false,
    axis: null,
    startX: 0,
    startY: 0,
    dx: 0,
    dy: 0,
    scale: 1,
    bgOpacity: 1,
    raf: 0,
  });

  useScrollLock(true);

  const last = images.length - 1;
  const canGo = useCallback(
    (dir) => {
      const n = idxRef.current + dir;
      return n >= 0 && n <= last;
    },
    [last]
  );

  // Open animation + focus management + reduced-motion probe.
  useEffect(() => {
    reducedRef.current =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    previousFocusRef.current =
      typeof document !== "undefined" ? document.activeElement : null;
    viewerRef.current?.focus();
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => {
      cancelAnimationFrame(raf);
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      restoreFocusSilently(previousFocusRef.current);
    };
  }, []);

  // Preload the adjacent images so the swipe is instant (never load all).
  useEffect(() => {
    [index - 1, index + 1].forEach((i) => {
      const it = images[i];
      if (it && it.type !== "video" && it.url) {
        const im = new Image();
        im.src = it.url;
      }
    });
  }, [index, images]);

  const setIndex = useCallback(
    (n) => {
      idxRef.current = n;
      setIndexState(n);
      setBgColor(colorOf(images, n));
    },
    [images]
  );

  // Unmount exactly once, when the exit animation ends.
  const finishClose = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = 0;
    }
    onClose();
  }, [onClose]);

  const animateClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
    if (reducedRef.current) {
      finishClose();
      return;
    }
    const s = stageRef.current;
    const b = bgRef.current;
    const h = typeof window !== "undefined" ? window.innerHeight : 800;
    // Image and background fade out TOGETHER (same duration/easing); the image
    // also drifts down. It ends fully transparent — no frozen remnant.
    if (s) {
      s.style.transition = `transform ${CLOSE_MS}ms ${EXIT_EASE}, opacity ${CLOSE_MS}ms ease`;
      s.style.transform = `translate3d(0, ${h * 0.3}px, 0) scale(0.92)`;
      s.style.opacity = "0";
    }
    if (b) {
      b.style.transition = `opacity ${CLOSE_MS}ms ease`;
      b.style.opacity = "0";
    }
    // Unmount is driven by the stage's transitionend (see onTransitionEnd); this
    // is only a safety net if that event never fires.
    closeTimerRef.current = window.setTimeout(finishClose, CLOSE_MS + 80);
  }, [finishClose]);

  // Arrow/keyboard navigation: swap index + in-place morph (no lateral slide).
  const navTo = useCallback(
    (dir) => {
      if (!canGo(dir) || closingRef.current) return;
      setIndex(idxRef.current + dir);
      if (!reducedRef.current) morphInPlace(stageRef.current);
    },
    [canGo, setIndex]
  );

  // Keyboard: Escape closes, ←/→ navigate, Tab is trapped.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        animateClose();
      } else if (e.key === "ArrowRight") {
        navTo(1);
      } else if (e.key === "ArrowLeft") {
        navTo(-1);
      } else if (e.key === "Tab") {
        // Only the controls are focusable — keep focus inside the dialog.
        const f = viewerRef.current?.querySelectorAll(
          'button:not(:disabled), [href], [tabindex]:not([tabindex="-1"])'
        );
        if (!f || f.length === 0) {
          e.preventDefault();
          return;
        }
        const first = f[0];
        const lastEl = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          lastEl.focus();
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [animateClose, navTo]);

  // Gesture: pointer-driven, rAF-coalesced. Locks to horizontal (navigate) or
  // vertical (dismiss) on first significant move; tap inside does nothing.
  useEffect(() => {
    const stage = stageRef.current;
    const bg = bgRef.current;
    if (!stage) return undefined;
    const st = g.current;

    const flush = () => {
      st.raf = 0;
      stage.style.transform = `translate3d(${st.dx}px, ${st.dy}px, 0) scale(${st.scale})`;
      if (bg) bg.style.opacity = String(st.bgOpacity);
    };
    const schedule = () => {
      if (!st.raf) st.raf = requestAnimationFrame(flush);
    };

    const onDown = (e) => {
      if (e.button === 2 || closingRef.current) return;
      // On the custom video player, let it own the pointer (play/seek/sound) —
      // no swipe gesture/capture. Close via the X, backdrop or Escape; navigate
      // with the arrows.
      if (e.target.closest("[data-video-player]")) return;
      st.active = true;
      st.axis = null;
      st.startX = e.clientX;
      st.startY = e.clientY;
      st.dx = 0;
      st.dy = 0;
      st.scale = 1;
      st.bgOpacity = 1;
      stage.style.transition = "none";
      if (bg) bg.style.transition = "none";
      if (stage.setPointerCapture) stage.setPointerCapture(e.pointerId);
    };
    const onMove = (e) => {
      if (!st.active) return;
      const dx = e.clientX - st.startX;
      const dy = e.clientY - st.startY;
      if (!st.axis) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) < AXIS_LOCK) return;
        st.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      }
      if (st.axis === "x") {
        // Resistance at the ends (nothing to scroll to).
        const atEnd =
          (idxRef.current === 0 && dx > 0) ||
          (idxRef.current === last && dx < 0);
        st.dx = atEnd ? dx * 0.35 : dx;
        st.dy = 0;
        st.scale = 1;
        st.bgOpacity = 1;
      } else {
        st.dy = dy;
        st.dx = 0;
        const ad = Math.abs(dy);
        st.scale = Math.max(0.85, 1 - ad / 1800);
        const h = typeof window !== "undefined" ? window.innerHeight : 800;
        st.bgOpacity = Math.max(0.12, 1 - ad / (h * 0.6));
      }
      schedule();
    };
    const onUp = (e) => {
      if (!st.active) return;
      st.active = false;
      if (stage.releasePointerCapture && e.pointerId != null) {
        try {
          stage.releasePointerCapture(e.pointerId);
        } catch (err) {
          /* already released */
        }
      }
      // Back to CSS transitions for the settle.
      stage.style.transition = "";
      if (bg) bg.style.transition = "";
      const { axis, dx, dy } = st;
      const w = typeof window !== "undefined" ? window.innerWidth : 0;
      st.dx = 0;
      st.dy = 0;
      st.scale = 1;
      st.bgOpacity = 1;
      // Swipe-down past the threshold → close. Don't reset the backdrop opacity
      // first: animateClose continues fading it (and the image) from here, so
      // there's no flash back to opaque.
      if (axis === "y" && Math.abs(dy) > CLOSE_DISTANCE) {
        animateClose();
        return;
      }
      const dir = axis === "x" && Math.abs(dx) > w * NAV_RATIO ? (dx < 0 ? 1 : -1) : 0;
      if (bg) bg.style.opacity = "1";
      if (dir && canGo(dir)) {
        // Commit: swap item (bg morphs) and settle the new one IN PLACE — the
        // stage adapts to its proportion as it fades in (no lateral page sweep).
        setIndex(idxRef.current + dir);
        if (reducedRef.current) {
          stage.style.transform = "translate3d(0, 0, 0) scale(1)";
          stage.style.opacity = "1";
          return;
        }
        morphInPlace(stage);
      } else {
        // Snap back to center.
        stage.style.transform = "translate3d(0, 0, 0) scale(1)";
      }
    };

    stage.addEventListener("pointerdown", onDown);
    stage.addEventListener("pointermove", onMove);
    stage.addEventListener("pointerup", onUp);
    stage.addEventListener("pointercancel", onUp);
    return () => {
      stage.removeEventListener("pointerdown", onDown);
      stage.removeEventListener("pointermove", onMove);
      stage.removeEventListener("pointerup", onUp);
      stage.removeEventListener("pointercancel", onUp);
      if (st.raf) cancelAnimationFrame(st.raf);
    };
  }, [animateClose, canGo, last, setIndex]);

  const current = images[index];
  if (!current) return null;

  return createPortal(
    <div
      ref={viewerRef}
      className={`${styles.viewer} ${entered ? styles.entered : ""} ${
        closing ? styles.closing : ""
      }`}
      role="dialog"
      aria-modal="true"
      aria-label={t("media.viewer.label")}
      tabIndex={-1}
      // The viewer is portaled to <body> but is a React child of the (clickable)
      // post card, so React replays its events through the component tree to the
      // card's onClick — closing would navigate to the thread (click-through).
      // Stop every pointer/click here so nothing inside the viewer reaches the
      // card. (Native gesture listeners on the stage are a separate system and
      // are unaffected.)
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
    >
      {/* The dominant-color backdrop fills the screen behind the image; a click
          on it (i.e. outside the image) closes the viewer. */}
      <div
        ref={bgRef}
        className={styles.bg}
        style={{ backgroundColor: bgColor }}
        aria-hidden="true"
        onClick={animateClose}
      />

      <div className={styles.controlsTop}>
        <button
          type="button"
          className={styles.iconButton}
          aria-label={t("media.viewer.close")}
          onClick={animateClose}
        >
          <CloseIcon />
        </button>
      </div>

      {images.length > 1 && (
        <>
          <button
            type="button"
            className={`${styles.arrow} ${styles.arrowPrev}`}
            aria-label={t("media.viewer.previous")}
            disabled={index === 0}
            onClick={() => navTo(-1)}
          >
            <ChevronIcon dir="left" />
          </button>
          <button
            type="button"
            className={`${styles.arrow} ${styles.arrowNext}`}
            aria-label={t("media.viewer.next")}
            disabled={index === last}
            onClick={() => navTo(1)}
          >
            <ChevronIcon dir="right" />
          </button>
        </>
      )}

      <div
        ref={stageRef}
        className={styles.stage}
        onTransitionEnd={(e) => {
          // Unmount the moment the exit fade finishes (one property → fires once).
          if (
            closingRef.current &&
            e.target === stageRef.current &&
            e.propertyName === "opacity"
          ) {
            finishClose();
          }
        }}
      >
        {current.type === "video" ? (
          <VideoPlayer key={current.id} item={current} />
        ) : (
          <img
            src={current.url}
            alt=""
            className={styles.image}
            draggable={false}
            decoding="async"
          />
        )}
      </div>
    </div>,
    document.body
  );
}

export default MediaViewer;

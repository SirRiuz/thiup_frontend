import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useScrollLock } from "../../utils/scrollLock";
import VideoPlayer from "./VideoPlayer";
import {
  setAudioOwner,
  clearAudioOwnerIf,
  VIEWER_AUDIO_ID,
} from "../../services/media/audioOwner";
import {
  forcePlaybackOwner,
  removePlaybackCandidate,
} from "../../services/media/playbackArbiter";
import styles from "../../styles/components/media/MediaViewer.module.css";

// Warm-dark fallback when an image has no dominant color (keeps the light
// controls legible). Threads-like: the background IS the image's color.
const FALLBACK_BG = "#1a1a1a";

// Gesture thresholds.
const AXIS_LOCK = 10; // px before we commit to horizontal vs vertical
const NAV_RATIO = 0.25; // fraction of width dragged to change item
const FLICK_V = 0.5; // px/ms — a fast flick changes item even if short
const CLOSE_DISTANCE = 110; // px of vertical drag to dismiss
const CLOSE_MS = 240; // exit duration — image + background fade together
const EXIT_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const SLIDE_MS = 280; // item-change slide duration (no/low velocity)
const SLIDE_MIN = 160; // floor so a fast flick doesn't feel instant/jarring
const SLIDE_MAX = 340; // ceiling so a slow release doesn't drag on
const SLIDE_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const VELOCITY_WINDOW = 90; // ms — average only the RECENT moves (robust flick)
const ZOOM_MAX = 4; // max pinch scale (images only)
const ZOOM_DOUBLE = 2.5; // double-tap zoom level
const DOUBLE_TAP_MS = 300; // max gap between the two taps
const DOUBLE_TAP_DIST = 30; // max px between the two taps

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
function WarnIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 9v4M12 17h.01" />
      <path d="M10.3 3.9 2.4 18a1.6 1.6 0 0 0 1.4 2.4h16.4a1.6 1.6 0 0 0 1.4-2.4L13.7 3.9a1.6 1.6 0 0 0-2.8 0Z" />
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
// Small play glyph for an ADJACENT video cell (a peek while sliding) — the live
// player only mounts for the current item, so neighbors show their dominant
// color + this hint instead of a second playing video.
function PeekPlayIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5.5v13a1 1 0 0 0 1.54.84l10-6.5a1 1 0 0 0 0-1.68l-10-6.5A1 1 0 0 0 8 5.5Z" />
    </svg>
  );
}

/**
 * Fullscreen media viewer (portal). Opens at `index`; background is the current
 * item's dominant color. Items change with a finger-tracked horizontal SLIDE
 * (a 3-cell strip: prev / current / next) so the movement itself signals the
 * change and its direction even when adjacent images look alike — released past
 * a distance OR velocity threshold it completes the slide, otherwise it springs
 * back; the ends rubber-band. Swipe-down dismisses (image follows, background
 * fades). Pinch-zoom / double-tap on images suspend the slide.
 *
 * A11y: role=dialog + aria-modal, focus trapped, Escape closes, focus restored
 * on close, background scroll locked. Gesture follows via rAF; reduced-motion
 * keeps the direction but drops the elaborate animation.
 */
function MediaViewer({ images, index: startIndex, onClose }) {
  const { t } = useTranslation();
  const [index, setIndexState] = useState(startIndex);
  const [bgColor, setBgColor] = useState(() => colorOf(images, startIndex));
  const [entered, setEntered] = useState(false);
  const [closing, setClosing] = useState(false);
  // Per-item load state for the loading placeholder (dominant-color screen +
  // spinner) shown until the media finishes downloading from the CDN.
  const [mediaLoaded, setMediaLoaded] = useState(false);
  const [mediaError, setMediaError] = useState(false);
  const [showSpinner, setShowSpinner] = useState(false);
  const [reloadKey, setReloadKey] = useState(0); // bump → remount media to retry

  const viewerRef = useRef(null);
  const stageRef = useRef(null);
  const trackRef = useRef(null);
  const bgRef = useRef(null);
  const imageRef = useRef(null);
  const closingRef = useRef(false);
  // True for a short window after open: swallows the iOS "ghost click" (a
  // synthetic click fired ~300ms after the opening tap, at the tap's
  // coordinates) so an off-center tap doesn't land on the backdrop and close
  // the viewer the instant it opens.
  const justOpenedRef = useRef(true);
  const finishedRef = useRef(false);
  const closeTimerRef = useRef(0);
  const previousFocusRef = useRef(null);
  const reducedRef = useRef(false);
  const idxRef = useRef(startIndex);
  // Bridge so keyboard/arrow nav triggers the SAME slide as the gesture (the
  // slide commit is defined inside the gesture effect, where the track lives).
  const navCommitRef = useRef(null);
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
    sliding: false, // a commit/spring animation is in flight
    samples: null, // recent {x,t} pointer samples → robust release velocity
    slideTimer: 0,
    slideOnEnd: null, // active transitionend handler (so it can be cancelled)
    downTarget: null, // real element under the press (pointer capture hides it on up)
    // Pinch-zoom / pan (images only) — coexists with the 1-finger swipe/close by
    // the number of active pointers. At zoom 1 the swipe/close logic below is
    // untouched; while zoomed, one finger pans instead of swiping.
    pts: null, // Map<pointerId, {x,y}> of active touches
    zoom: 1,
    panX: 0,
    panY: 0,
    pinching: false,
    panning: false,
    zStartDist: 0,
    zStartScale: 1,
    zStartMidX: 0,
    zStartMidY: 0,
    zStartPanX: 0,
    zStartPanY: 0,
    panStartX: 0,
    panStartY: 0,
    baseW: 0,
    baseH: 0,
    zraf: 0,
    lastTapTime: 0, // double-tap detection
    lastTapX: 0,
    lastTapY: 0,
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
    // Open the close gate after the ghost-click window (~300ms on iOS).
    justOpenedRef.current = true;
    const openGate = window.setTimeout(() => {
      justOpenedRef.current = false;
    }, 400);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(openGate);
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      restoreFocusSilently(previousFocusRef.current);
    };
  }, []);

  // Opening (or navigating) the viewer ALWAYS silences the feed's audio. If the
  // shown item is a VIDEO it takes over the audio (defaults to ON; the one-audio
  // rule mutes the preview); if it's a PHOTO the owner goes null → the preview
  // video that was sounding goes muted (nothing in the viewer plays audio).
  // Released on close → the feed stays muted (no surprise audio).
  useEffect(() => {
    setAudioOwner(images[index]?.type === "video" ? VIEWER_AUDIO_ID : null);
  }, [index, images]);

  useEffect(() => () => clearAudioOwnerIf(VIEWER_AUDIO_ID), []);

  // While the viewer is open it owns PLAYBACK too: every inline preview pauses
  // (only the viewer's own player decodes — one active decoder at a time). On
  // close the arbiter re-promotes the most visible inline video.
  useEffect(() => {
    forcePlaybackOwner(VIEWER_AUDIO_ID);
    return () => removePlaybackCandidate(VIEWER_AUDIO_ID);
  }, []);

  // Reset the load state whenever the shown item (or a manual retry) changes, so
  // the placeholder + spinner show again while the new media downloads. Runs
  // BEFORE paint and treats an already-decoded image as loaded: after a slide
  // the new current <img> is often a neighbor that was already cached — it won't
  // fire onLoad again, so without this it would be stuck transparent.
  useLayoutEffect(() => {
    const el = imageRef.current;
    const alreadyLoaded =
      el && el.tagName === "IMG" && el.complete && el.naturalWidth > 0;
    setMediaLoaded(!!alreadyLoaded);
    setMediaError(false);
  }, [index, reloadKey]);

  // Show the spinner only if the load takes longer than a short threshold — a
  // cached/instant load never flashes it.
  useEffect(() => {
    if (mediaLoaded || mediaError) {
      setShowSpinner(false);
      return undefined;
    }
    const id = window.setTimeout(() => setShowSpinner(true), 160);
    return () => clearTimeout(id);
  }, [mediaLoaded, mediaError, index, reloadKey]);

  const retryLoad = useCallback(() => {
    setMediaError(false);
    setMediaLoaded(false);
    setReloadKey((k) => k + 1);
  }, []);

  // Preload the adjacent images so the slide peek is instant (never load all).
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

  // After the index changes, re-center the track instantly (no transition) so
  // the cell that slid into view sits at 0 again, ready for the next gesture.
  // Runs before paint (layout effect) → no flash.
  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    track.style.transition = "none";
    track.style.transform = "translate3d(0, 0, 0)";
  }, [index]);

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

  // Arrow/keyboard navigation: trigger the SAME slide as the gesture.
  const navTo = useCallback(
    (dir) => {
      if (!canGo(dir) || closingRef.current || g.current.sliding) return;
      if (navCommitRef.current) navCommitRef.current(dir);
      else setIndex(idxRef.current + dir);
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

  // Gesture: pointer-driven, rAF-coalesced. Locks to horizontal (slide between
  // items, on the TRACK) or vertical (dismiss, on the STAGE) on first
  // significant move; tap inside does nothing.
  useEffect(() => {
    const stage = stageRef.current;
    const track = trackRef.current;
    const bg = bgRef.current;
    if (!stage || !track) return undefined;
    const st = g.current;

    // x → slide the horizontal track; y → translate the stage (close).
    const flush = () => {
      st.raf = 0;
      if (st.axis === "y") {
        stage.style.transform = `translate3d(0, ${st.dy}px, 0) scale(${st.scale})`;
        if (bg) bg.style.opacity = String(st.bgOpacity);
      } else {
        track.style.transform = `translate3d(${st.dx}px, 0, 0)`;
      }
    };
    const schedule = () => {
      if (!st.raf) st.raf = requestAnimationFrame(flush);
    };

    // ---- Item-change slide (horizontal) ----

    // The track's CURRENT translateX (px) — read from the live computed matrix so
    // an interrupting gesture can continue exactly where an in-flight slide is,
    // with no jump.
    const currentTrackX = () => {
      try {
        const tr = window.getComputedStyle(track).transform;
        if (!tr || tr === "none") return 0;
        return new DOMMatrix(tr).m41;
      } catch (err) {
        return 0;
      }
    };

    // Stop any in-flight commit/spring cleanly: drop its transitionend handler +
    // safety timer so it can't fire later and fight a new gesture (no orphans).
    const clearSlide = () => {
      if (st.slideOnEnd) {
        track.removeEventListener("transitionend", st.slideOnEnd);
        st.slideOnEnd = null;
      }
      if (st.slideTimer) {
        clearTimeout(st.slideTimer);
        st.slideTimer = 0;
      }
      st.sliding = false;
    };

    // Duration that inherits the release speed (momentum): distance left to
    // travel / speed, clamped — a fast flick finishes fast and CONTINUOUS with
    // the finger; a slow/zero-speed release uses the default. speed in px/ms.
    const momentumMs = (distance, speed) => {
      if (!speed || speed < 0.05) return SLIDE_MS;
      return Math.max(SLIDE_MIN, Math.min(SLIDE_MAX, distance / speed));
    };

    const finishSlide = (dir) => {
      clearSlide();
      // setIndex re-renders the 3 cells around the new index; the layout effect
      // re-centers the track (transition cleared) → seamless, no flash.
      setIndex(idxRef.current + dir);
    };
    const springBackX = (speed) => {
      const from = st.dx;
      if (reducedRef.current) {
        track.style.transition = "none";
        track.style.transform = "translate3d(0, 0, 0)";
        return;
      }
      const dur = momentumMs(Math.abs(from), speed);
      track.style.transition = `transform ${dur}ms ${SLIDE_EASE}`;
      track.style.transform = "translate3d(0, 0, 0)";
    };
    const commitSlide = (dir, speed) => {
      if (!canGo(dir)) {
        springBackX(speed);
        return;
      }
      if (reducedRef.current) {
        // Keep the direction (the drag already showed it) but no elaborate
        // animation: change immediately; the layout effect re-centers.
        setIndex(idxRef.current + dir);
        return;
      }
      const w = (typeof window !== "undefined" ? window.innerWidth : 0) || 1;
      const from = st.dx; // current offset (drag end, or interrupted mid-slide)
      const target = dir > 0 ? -w : w;
      const dur = momentumMs(Math.abs(target - from), speed);
      st.sliding = true;
      track.style.transition = `transform ${dur}ms ${SLIDE_EASE}`;
      track.style.transform = `translate3d(${target}px, 0, 0)`;
      const onEnd = (e) => {
        if (e && e.target !== track) return;
        finishSlide(dir);
      };
      st.slideOnEnd = onEnd;
      track.addEventListener("transitionend", onEnd);
      st.slideTimer = window.setTimeout(onEnd, dur + 80);
    };
    // Keyboard/arrow nav reuses the slide with no inherited velocity (speed 0).
    navCommitRef.current = (dir) => commitSlide(dir, 0);

    // --- Pinch-zoom / pan (images only) — written to the IMAGE, separate from
    // the stage/track so it never disturbs the swipe/close/slide (which only run
    // at zoom 1). ---
    const isImage = () => images[idxRef.current]?.type !== "video";
    const dist2 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    const applyZoom = () => {
      st.zraf = 0;
      const el = imageRef.current;
      if (el) {
        el.style.transform = `translate3d(${st.panX}px, ${st.panY}px, 0) scale(${st.zoom})`;
      }
    };
    const scheduleZoom = () => {
      if (!st.zraf) st.zraf = requestAnimationFrame(applyZoom);
    };
    const clampPan = () => {
      const maxX = Math.max(0, (st.baseW * (st.zoom - 1)) / 2);
      const maxY = Math.max(0, (st.baseH * (st.zoom - 1)) / 2);
      st.panX = Math.min(maxX, Math.max(-maxX, st.panX));
      st.panY = Math.min(maxY, Math.max(-maxY, st.panY));
    };
    const captureBase = () => {
      const el = imageRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const s = st.zoom || 1;
      st.baseW = r.width / s;
      st.baseH = r.height / s;
      el.style.transition = "none";
    };
    const resetZoom = (animate) => {
      st.zoom = 1;
      st.panX = 0;
      st.panY = 0;
      const el = imageRef.current;
      if (el) {
        el.style.transition =
          animate && !reducedRef.current
            ? "transform 220ms cubic-bezier(0.22, 1, 0.36, 1)"
            : "none";
        el.style.transform = "translate3d(0, 0, 0) scale(1)";
      }
    };

    // Double-tap toggle (images only), sharing the SAME zoom state as the pinch:
    // 1x → zoom toward the tapped point; zoomed → back to 1x. Anchored so the
    // tapped point stays under the finger (focal formula, origin centered).
    const toggleDoubleTapZoom = (x, y) => {
      const el = imageRef.current;
      if (!el) return;
      if (st.zoom > 1.01) {
        resetZoom(true);
        return;
      }
      const r = el.getBoundingClientRect(); // at ~1x → base displayed size
      st.baseW = r.width;
      st.baseH = r.height;
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const s = ZOOM_DOUBLE;
      st.zoom = s;
      // Keep the tapped point fixed: t = f * (1 - s), f = point relative to center.
      st.panX = (x - cx) * (1 - s);
      st.panY = (y - cy) * (1 - s);
      clampPan();
      el.style.transition = reducedRef.current
        ? "none"
        : "transform 240ms cubic-bezier(0.22, 1, 0.36, 1)";
      applyZoom();
    };
    // Returns true if this tap completed a DOUBLE-tap (and acted on it).
    const handleTap = (x, y) => {
      const tnow = Date.now();
      const isDouble =
        tnow - st.lastTapTime < DOUBLE_TAP_MS &&
        Math.hypot(x - st.lastTapX, y - st.lastTapY) < DOUBLE_TAP_DIST;
      if (isDouble) {
        st.lastTapTime = 0; // consume so a third tap starts fresh
        toggleDoubleTapZoom(x, y);
        return true;
      }
      st.lastTapTime = tnow;
      st.lastTapX = x;
      st.lastTapY = y;
      return false;
    };

    const onDown = (e) => {
      if (e.button === 2 || closingRef.current) return;
      // Video CONTROLS (progress bar, mute) own their own pointer — bail so the
      // gesture never starts on them (this handler is a NATIVE listener, so a
      // React stopPropagation on the control fires too late to stop it; the data
      // attribute is the reliable signal). Scrubbing must not trigger the swipe.
      if (e.target.closest && e.target.closest("[data-video-control]")) return;
      // The rest of the video (the SURFACE) DOES take the swipe (slide / close),
      // exactly like an image. We just don't pointer-capture on a video: the
      // capture would swallow the <video>'s click (tap-to-play). The gesture
      // still tracks fine via event bubbling inside the fullscreen stage, and a
      // tap on the video is ignored in onUp (the <video> handles play/pause).
      const onVideoSurface = !!(
        e.target.closest && e.target.closest("[data-video-player]")
      );
      if (!st.pts) st.pts = new Map();
      st.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (stage.setPointerCapture && !onVideoSurface) {
        try {
          stage.setPointerCapture(e.pointerId);
        } catch (err) {
          /* capture not supported */
        }
      }

      // Two fingers on an image → pinch. Abort any in-progress 1-finger swipe and
      // snap the stage/track back to neutral so nothing lingers.
      if (st.pts.size === 2 && isImage()) {
        st.active = false;
        st.panning = false;
        st.pinching = true;
        stage.style.transition = "";
        stage.style.transform = "translate3d(0, 0, 0) scale(1)";
        stage.style.opacity = "1";
        track.style.transition = "none";
        track.style.transform = "translate3d(0, 0, 0)";
        if (bg) {
          bg.style.transition = "";
          bg.style.opacity = "1";
        }
        const [a, b] = Array.from(st.pts.values());
        st.zStartDist = dist2(a, b) || 1;
        st.zStartScale = st.zoom;
        st.zStartMidX = (a.x + b.x) / 2;
        st.zStartMidY = (a.y + b.y) / 2;
        st.zStartPanX = st.panX;
        st.zStartPanY = st.panY;
        captureBase();
        return;
      }

      // One finger while zoomed → pan the image (NOT swipe/slide/close).
      if (st.pts.size === 1 && st.zoom > 1 && isImage()) {
        st.active = false;
        st.panning = true;
        st.panStartX = e.clientX;
        st.panStartY = e.clientY;
        st.zStartPanX = st.panX;
        st.zStartPanY = st.panY;
        captureBase();
        return;
      }

      // Otherwise: the 1-finger swipe (slide / close) — only at zoom 1.
      // Interrupt any in-flight commit/spring: read where the track ACTUALLY is
      // now and continue from there (chained fast flicks don't fight or jump; no
      // orphan rAF/transition/listener left behind).
      const curX = st.sliding || track.style.transition ? currentTrackX() : 0;
      clearSlide();
      st.active = true;
      // Remember the REAL element pressed: setPointerCapture redirects the later
      // pointerup target to `stage`, so we can't read it there — but we need it
      // to tell a tap on the color background from a tap on the image.
      st.downTarget = e.target;
      // If we caught a moving slide, we're already on the horizontal axis and
      // start offset from curX; otherwise it's a fresh gesture (axis undecided).
      st.axis = Math.abs(curX) > 0.5 ? "x" : null;
      st.startX = e.clientX - curX;
      st.startY = e.clientY;
      st.dx = curX;
      st.dy = 0;
      st.scale = 1;
      st.bgOpacity = 1;
      st.samples = [{ x: e.clientX, t: e.timeStamp }];
      stage.style.transition = "none";
      track.style.transition = "none";
      track.style.transform = `translate3d(${curX}px, 0, 0)`;
      if (bg) bg.style.transition = "none";
    };
    const onMove = (e) => {
      if (st.pts && st.pts.has(e.pointerId)) {
        st.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      }
      // Pinch: scale from the start distance; pan follows the midpoint drift.
      if (st.pinching) {
        const vals = Array.from(st.pts.values());
        if (vals.length < 2) return;
        const [a, b] = vals;
        const curDist = dist2(a, b) || 1;
        const midX = (a.x + b.x) / 2;
        const midY = (a.y + b.y) / 2;
        st.zoom = Math.min(
          ZOOM_MAX,
          Math.max(1, st.zStartScale * (curDist / st.zStartDist))
        );
        st.panX = st.zStartPanX + (midX - st.zStartMidX);
        st.panY = st.zStartPanY + (midY - st.zStartMidY);
        clampPan();
        scheduleZoom();
        return;
      }
      // One-finger pan while zoomed.
      if (st.panning) {
        st.panX = st.zStartPanX + (e.clientX - st.panStartX);
        st.panY = st.zStartPanY + (e.clientY - st.panStartY);
        clampPan();
        scheduleZoom();
        return;
      }
      // 1-finger swipe (slide / close).
      if (!st.active) return;
      const dx = e.clientX - st.startX;
      const dy = e.clientY - st.startY;
      if (!st.axis) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) < AXIS_LOCK) return;
        // Lock to the dominant axis at the start of the gesture (horizontal =
        // slide, vertical = close) so the two never get confused.
        st.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      }
      if (st.axis === "x") {
        // Rubber-band at the ends (no neighbor in that direction).
        const atEnd =
          (idxRef.current === 0 && dx > 0) ||
          (idxRef.current === last && dx < 0);
        st.dx = atEnd ? dx * 0.3 : dx;
        st.dy = 0;
        st.scale = 1;
        st.bgOpacity = 1;
        // Buffer recent samples for a ROBUST release velocity (averaged over the
        // last ~VELOCITY_WINDOW ms, not just the final two points → no noisy
        // flick reads). Prune anything older than the window (keep ≥ 2).
        if (!st.samples) st.samples = [];
        st.samples.push({ x: e.clientX, t: e.timeStamp });
        const cutoff = e.timeStamp - VELOCITY_WINDOW;
        while (st.samples.length > 2 && st.samples[0].t < cutoff) {
          st.samples.shift();
        }
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
      if (st.pts) st.pts.delete(e.pointerId);
      if (stage.releasePointerCapture && e.pointerId != null) {
        try {
          stage.releasePointerCapture(e.pointerId);
        } catch (err) {
          /* already released */
        }
      }

      // End of pinch (a finger lifted).
      if (st.pinching) {
        if (st.pts && st.pts.size >= 2) return; // still pinching
        st.pinching = false;
        if (st.zoom <= 1.01) {
          resetZoom(true); // back to 1x → normal gestures resume
          return;
        }
        clampPan();
        const el = imageRef.current;
        if (st.pts && st.pts.size === 1) {
          // Hand off to one-finger pan with the remaining finger.
          const p = Array.from(st.pts.values())[0];
          st.panning = true;
          st.panStartX = p.x;
          st.panStartY = p.y;
          st.zStartPanX = st.panX;
          st.zStartPanY = st.panY;
          captureBase();
        } else if (el) {
          el.style.transition = "transform 180ms ease";
          applyZoom();
        }
        return;
      }
      // End of one-finger pan.
      if (st.panning) {
        st.panning = false;
        // A stationary "pan" is a tap → maybe a double-tap to reset to 1x.
        const movedPan = Math.hypot(
          e.clientX - st.panStartX,
          e.clientY - st.panStartY
        );
        if (movedPan < AXIS_LOCK && handleTap(e.clientX, e.clientY)) {
          return; // double-tap handled (reset zoom)
        }
        clampPan();
        const el = imageRef.current;
        if (el) {
          el.style.transition = "transform 180ms ease";
          applyZoom();
        }
        return;
      }

      // 1-finger swipe end.
      if (!st.active) return;
      st.active = false;
      // Cancel any pending drag flush so it can't run on the NEXT frame and
      // overwrite the commit/spring transform with the stale drag position —
      // that race made the slide jump/snap instead of animating to the target.
      if (st.raf) {
        cancelAnimationFrame(st.raf);
        st.raf = 0;
      }
      const { axis, dx, dy } = st; // dx = current offset (kept for momentum)
      const w = typeof window !== "undefined" ? window.innerWidth : 0;
      st.dy = 0;
      st.scale = 1;
      st.bgOpacity = 1;

      // No axis lock = a TAP (not a swipe). On an image it may be a double-tap
      // zoom; otherwise it's a no-op (snap to neutral). Either way it's terminal.
      if (!axis) {
        st.dx = 0;
        stage.style.transition = "";
        stage.style.transform = "translate3d(0, 0, 0) scale(1)";
        track.style.transition = "none";
        track.style.transform = "translate3d(0, 0, 0)";
        const tgt = st.downTarget;
        // Tap ON a VIDEO → do nothing here: the <video>'s own click toggles
        // play/pause. Never close on a video tap (a swipe on it still slides /
        // closes, since that locks an axis and skips this branch).
        if (tgt && tgt.closest && tgt.closest("[data-video-player]")) {
          return;
        }
        // Tap ON the image → double-tap-to-zoom (never closes). Tap on the COLOR
        // BACKGROUND around it → close (Threads-style). This only runs for a
        // clean tap (no axis lock = no drag), so a swipe that ends over the
        // background never closes. iOS-safe: it's a pointerup, no :hover/click.
        const onImage =
          !!tgt &&
          imageRef.current &&
          (tgt === imageRef.current || imageRef.current.contains(tgt));
        if (onImage) {
          handleTap(e.clientX, e.clientY);
        } else if (!justOpenedRef.current) {
          // Ignore the opening tap's window so it can't close on open.
          animateClose();
        }
        return;
      }

      if (axis === "y") {
        // Back to CSS transitions for the settle.
        stage.style.transition = "";
        if (bg) bg.style.transition = "";
        // Swipe-down past the threshold → close. Don't reset the backdrop
        // opacity first: animateClose keeps fading it (and the image) from here.
        if (Math.abs(dy) > CLOSE_DISTANCE) {
          animateClose();
          return;
        }
        // Snap back up.
        if (bg) bg.style.opacity = "1";
        stage.style.transform = "translate3d(0, 0, 0) scale(1)";
        return;
      }

      // axis === "x": robust release velocity = displacement over the recent
      // window (px/ms). Crucially, the window is measured against the RELEASE
      // moment — so if the finger paused before lifting (no samples in the last
      // VELOCITY_WINDOW ms), velocity reads ~0 and the slide settles calmly,
      // instead of reusing the stale pre-pause momentum (the abrupt snap).
      let vel = 0;
      const sx = st.samples;
      if (sx && sx.length >= 2) {
        const now = e.timeStamp;
        const recent = sx.filter((s) => now - s.t <= VELOCITY_WINDOW);
        if (recent.length >= 2) {
          const a = recent[0];
          const b = recent[recent.length - 1];
          const dt = b.t - a.t;
          if (dt > 0) vel = (b.x - a.x) / dt;
        }
      }
      const speed = Math.abs(vel);
      // Change item if dragged far enough OR flicked fast (short but quick).
      const far = Math.abs(dx) > w * NAV_RATIO;
      const flick = speed > FLICK_V;
      let dir = 0;
      if (far) dir = dx < 0 ? 1 : -1;
      else if (flick) dir = vel < 0 ? 1 : -1;
      // commit/spring inherit `speed` → the animation continues the finger's
      // momentum (fast flick finishes fast & continuous; no fixed-duration tug).
      if (dir && canGo(dir)) commitSlide(dir, speed);
      else springBackX(speed);
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
      navCommitRef.current = null;
      if (st.raf) cancelAnimationFrame(st.raf);
      if (st.zraf) cancelAnimationFrame(st.zraf);
      clearSlide(); // drop any pending transitionend handler + safety timer
    };
  }, [animateClose, canGo, last, setIndex, images]);

  // Reset zoom/pan whenever the item changes (and on the new image element) so
  // navigation always lands at 1x with the normal gestures active.
  useEffect(() => {
    const st = g.current;
    st.zoom = 1;
    st.panX = 0;
    st.panY = 0;
    st.pinching = false;
    st.panning = false;
    if (st.pts) st.pts.clear();
    const el = imageRef.current;
    if (el) {
      el.style.transition = "none";
      el.style.transform = "translate3d(0, 0, 0) scale(1)";
      // Restore the opacity-only transition so the load cross-fade (.loaded)
      // animates while the zoom-reset transform above stays instant (transform
      // isn't in the list). The gesture handlers set their own transition when
      // they need to animate the transform.
      el.style.transition = "opacity 260ms ease";
    }
  }, [index]);

  const current = images[index];
  if (!current) return null;

  // One cell of the horizontal strip. The current cell holds the live media
  // (with the load placeholder/cross-fade); neighbors are lightweight peeks so
  // the slide shows real content (and the destination's dominant color) without
  // a second playing video. Keys carry reloadKey UNIFORMLY so the slide's DOM
  // reuse holds, and a retry remounts all three.
  const renderCell = (pos) => {
    const i = index + pos;
    const it = images[i];
    const baseStyle = { transform: `translate3d(${pos * 100}%, 0, 0)` };
    if (!it) {
      return (
        <div
          key={`edge${pos}`}
          className={styles.cell}
          style={baseStyle}
          aria-hidden="true"
        />
      );
    }
    const isCurrent = pos === 0;
    const cellKey = `${it.id != null ? it.id : i}-${reloadKey}`;
    return (
      <div
        key={cellKey}
        className={styles.cell}
        style={{ ...baseStyle, backgroundColor: colorOf(images, i) }}
        aria-hidden={isCurrent ? undefined : "true"}
      >
        {it.type === "video" ? (
          isCurrent ? (
            <VideoPlayer
              item={it}
              onReady={() => setMediaLoaded(true)}
              onError={() => setMediaError(true)}
            />
          ) : (
            <div className={styles.videoPeek}>
              <PeekPlayIcon />
            </div>
          )
        ) : (
          <img
            ref={isCurrent ? imageRef : undefined}
            src={it.url}
            alt=""
            className={`${styles.image} ${
              isCurrent ? (mediaLoaded ? styles.loaded : "") : styles.loaded
            }`}
            draggable={false}
            decoding="async"
            loading={isCurrent ? undefined : "lazy"}
            onLoad={isCurrent ? () => setMediaLoaded(true) : undefined}
            onError={isCurrent ? () => setMediaError(true) : undefined}
          />
        )}
      </div>
    );
  };

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
      // Stop the (synthetic) CLICK from bubbling through the React portal tree to
      // any clickable ancestor (the post card). Only `click` is stopped: stopping
      // pointer/mouse DOWN/UP here broke iOS Safari's first-tap click synthesis
      // for the X and backdrop (they required a double tap). Native gesture
      // listeners live on the stage and are unaffected.
      onClick={(e) => e.stopPropagation()}
    >
      {/* The dominant-color backdrop fills the screen behind the strip. The
          full-screen cells sit on top of it, so closing-on-background is handled
          by the gesture's clean-tap logic (a tap NOT on the image), which also
          distinguishes a tap from a swipe — not a click handler here. */}
      <div
        ref={bgRef}
        className={styles.bg}
        style={{ backgroundColor: bgColor }}
        aria-hidden="true"
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
        {/* Horizontal strip: prev / current / next. translateX follows the
            finger; on commit it slides a full width and re-centers. */}
        <div ref={trackRef} className={styles.track}>
          {renderCell(-1)}
          {renderCell(0)}
          {renderCell(1)}
        </div>
      </div>

      {/* Loading placeholder: while the media downloads, the dominant-color
          backdrop (already behind) reads as the placeholder and a spinner sits
          centered over it — instead of an empty stage with floating controls.
          Cross-fades out (and the sharp media in) once loaded. The threshold
          (showSpinner) avoids a flash on cached/instant loads. */}
      {!mediaError && (
        <div
          className={`${styles.loader} ${
            showSpinner && !mediaLoaded ? styles.loaderShown : ""
          }`}
          aria-hidden={mediaLoaded ? "true" : undefined}
          role={!mediaLoaded ? "status" : undefined}
          aria-label={!mediaLoaded ? t("common.loading") : undefined}
        >
          <span className={styles.spinner} />
        </div>
      )}

      {mediaError && (
        <div className={styles.error} role="alert">
          <WarnIcon />
          <span className={styles.errorText}>{t("media.viewer.loadError")}</span>
          <button type="button" className={styles.retry} onClick={retryLoad}>
            {t("common.tryAgain")}
          </button>
        </div>
      )}
    </div>,
    document.body
  );
}

export default MediaViewer;

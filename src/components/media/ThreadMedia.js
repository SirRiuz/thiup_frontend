import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useTranslation } from "react-i18next";
import MediaViewer from "./MediaViewer";
import {
  getAudioOwner,
  setAudioOwner,
  clearAudioOwnerIf,
  subscribeAudioOwner,
} from "../../services/media/audioOwner";
import {
  getPlaybackOwner,
  setPlaybackCandidate,
  forcePlaybackOwner,
  removePlaybackCandidate,
  subscribePlayback,
} from "../../services/media/playbackArbiter";
import styles from "../../styles/components/media/ThreadMedia.module.css";

// Layout sizing. The cap/floor on the aspect-ratio gives the Threads look
// (narrow verticals, wide horizontals) WITHOUT letting extremes become a sliver
// (pano) or a full-screen column (very tall).
const MAX_HEIGHT = 360; // px ceiling for a single image
const MIN_RATIO = 0.7; // tallest allowed (≈ 7:10)
const MAX_RATIO = 2.0; // widest allowed (2:1)

const clampRatio = (r) => Math.min(MAX_RATIO, Math.max(MIN_RATIO, r));

// Tap spring: a frame springs (shrink + overshoot bounce) only on a TAP. Beyond
// this much pointer movement it's a drag/swipe → cancel the press (no bounce),
// so dragging the carousel never makes images shrink.
const TAP_MOVE_THRESHOLD = 8; // px

const pressEl = (el) => {
  if (el) el.classList.add(styles.pressing);
};
// Tap release: remove .pressing → the CSS transition plays the overshoot bounce.
const bounceEl = (el) => {
  if (el) el.classList.remove(styles.pressing);
};
// Drag/cancel: remove .pressing WITHOUT animating back (no bounce while dragging)
// by suppressing the transition for that single frame.
const cancelEl = (el) => {
  if (!el || !el.classList.contains(styles.pressing)) return;
  el.style.transition = "none";
  el.classList.remove(styles.pressing);
  el.getBoundingClientRect(); // force reflow so the removal isn't animated
  el.style.transition = "";
};

function EyeIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function SpeakerIcon({ muted }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 5 6 9H3v6h3l5 4V5Z" />
      {muted ? (
        <path d="M22 9l-6 6M16 9l6 6" />
      ) : (
        <>
          <path d="M15.5 8.5a5 5 0 0 1 0 7" />
          <path d="M18.5 5.5a9 9 0 0 1 0 13" />
        </>
      )}
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5.5v13a1 1 0 0 0 1.54.84l10-6.5a1 1 0 0 0 0-1.68l-10-6.5A1 1 0 0 0 8 5.5Z" />
    </svg>
  );
}

// Lazy image: native loading="lazy" + fade-in on load; reports its natural size
// so the frame can size to the real aspect-ratio.
function ImageMedia({ item, revealed, onNaturalSize, eager }) {
  const [loaded, setLoaded] = useState(false);
  const handleLoad = (e) => {
    setLoaded(true);
    const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
    if (w && h) onNaturalSize?.(w, h);
  };
  return (
    <img
      src={item.url}
      alt=""
      // In a carousel, once the CARD is visible (eager) load now — native lazy
      // only measures vertical viewport proximity, so an off-screen-right item
      // would otherwise stay an empty hole. Standalone keeps native lazy.
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      draggable={false}
      onLoad={handleLoad}
      className={`${styles.img} ${loaded ? styles.loaded : ""} ${
        revealed ? "" : styles.blurred
      }`}
    />
  );
}

// Lazy video: IntersectionObserver for (1) load near viewport and (2) playback
// candidacy while visible. Muted + playsinline + loop by default; a sound
// toggle (own icon) unmutes. prefers-reduced-motion → no autoplay (a manual
// play button instead). Both observers cleaned up on unmount.
//
// PLAYBACK is arbitrated globally (playbackArbiter): only the MOST VISIBLE
// video in the app actually plays (Threads rule) — the rest sit paused on their
// poster frame. Multiple 4K iPhone videos decoding at once is what crashed iOS
// Safari (few hardware decoders + a low memory ceiling).
function VideoMedia({ item, revealed, onNaturalSize, eager }) {
  const { t } = useTranslation();
  const videoRef = useRef(null);
  const [src, setSrc] = useState(null); // lazy: unset until near viewport
  const [loaded, setLoaded] = useState(false);
  // Audio is GLOBAL: this video is unmuted only while it owns the audio (one at
  // a time across the whole feed). Deriving muted from the store means claiming
  // audio elsewhere mutes this one reactively.
  const audioOwner = useSyncExternalStore(subscribeAudioOwner, getAudioOwner);
  const muted = audioOwner !== item.id;
  // Playback is GLOBAL too: only the arbiter's owner plays.
  const playbackOwner = useSyncExternalStore(subscribePlayback, getPlaybackOwner);
  const isPlaybackOwner = playbackOwner === item.id;
  const [needsTap, setNeedsTap] = useState(false); // reduced-motion: manual play
  const visibleRef = useRef(false);
  const reducedRef = useRef(false);
  const startedRef = useRef(false);

  // Keep the element's muted state in sync (the muted attribute alone is flaky).
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted, src]);

  const tryPlay = useCallback(() => {
    const el = videoRef.current;
    if (!el || !visibleRef.current || !revealed || !src) return;
    // Only the arbitrated owner may decode/play — everyone else stays paused.
    if (getPlaybackOwner() !== item.id) return;
    if (reducedRef.current && !startedRef.current) {
      setNeedsTap(true);
      return;
    }
    const p = el.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
  }, [revealed, src, item.id]);

  // React to ownership changes: won → play; lost → pause (poster stays).
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (isPlaybackOwner) tryPlay();
    else el.pause();
  }, [isPlaybackOwner, tryPlay]);

  useEffect(() => {
    reducedRef.current =
      (typeof window !== "undefined" &&
        window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches) ||
      false;
    if (reducedRef.current) setNeedsTap(true);
  }, []);

  // (1) Lazy load (poster only — preload="metadata" loads the first frame, NOT
  // the whole video; the full download happens on play, see (2)). In a CAROUSEL
  // (eager is a boolean) we load as soon as the CARD is visible — NOT when the
  // item scrolls into horizontal view — so an off-screen-right item (e.g. the
  // last video) never stays an empty hole. Standalone (eager === undefined) we
  // fall back to the element's own viewport proximity.
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return undefined;
    if (eager !== undefined) {
      if (eager) setSrc(item.url);
      return undefined;
    }
    if (typeof IntersectionObserver === "undefined") {
      setSrc(item.url);
      return undefined;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSrc(item.url);
          io.disconnect();
        }
      },
      { rootMargin: "300px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [item.url, eager]);

  // (2) Playback candidacy while visible / drop out off-screen. The arbiter
  // picks the MOST visible candidate as the single playing video (the ownership
  // effect above does the actual play/pause), so N visible videos never decode
  // at once (data + battery + the iOS decoder/memory crash).
  useEffect(() => {
    const el = videoRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[entries.length - 1];
        if (!e) return;
        const ratio = e.isIntersecting ? e.intersectionRatio : 0;
        visibleRef.current = ratio >= 0.5;
        setPlaybackCandidate(item.id, ratio);
        if (!visibleRef.current) {
          el.pause();
          // Leaving the screen releases the audio so nothing plays sound
          // off-screen; it returns muted next time it's visible.
          clearAudioOwnerIf(item.id);
        }
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1] }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      removePlaybackCandidate(item.id);
    };
  }, [tryPlay, item.id]);

  // iOS Safari is lazy about decoding: once the src is set, explicitly load() so
  // it fetches metadata + renders the #t=0.1 poster frame (no full download).
  useEffect(() => {
    const el = videoRef.current;
    if (el && src) el.load();
  }, [src]);

  // Play once an NSFW video is revealed (if it's already on screen).
  useEffect(() => {
    if (revealed) tryPlay();
  }, [revealed, tryPlay]);

  const toggleMute = (e) => {
    e.stopPropagation();
    // Read the LIVE owner (not the render-closure `muted`): after a fullscreen
    // open/close this instance's render may lag the store for a tick, and a
    // stale closure would make the first click only resync (the "double click"
    // bug). The live value guarantees the first click toggles.
    if (getAudioOwner() !== item.id) {
      // Claim the audio → every other video mutes reactively. Unmuting is
      // explicit intent to WATCH this one, so it also claims playback (the
      // arbiter pauses whichever video was playing).
      setAudioOwner(item.id);
      forcePlaybackOwner(item.id);
      const el = videoRef.current;
      if (el && visibleRef.current) {
        const p = el.play();
        if (p && typeof p.catch === "function") p.catch(() => {});
      }
    } else {
      // Mute everyone (we were the owner).
      setAudioOwner(null);
    }
  };

  // Release audio + playback candidacy on unmount (no phantom audio, and the
  // arbiter can promote the next visible video).
  useEffect(
    () => () => {
      clearAudioOwnerIf(item.id);
      removePlaybackCandidate(item.id);
    },
    [item.id]
  );

  const manualPlay = (e) => {
    e.stopPropagation();
    startedRef.current = true;
    setNeedsTap(false);
    // Manual play is explicit intent — claim playback from whoever has it.
    forcePlaybackOwner(item.id);
    const el = videoRef.current;
    if (el) {
      const p = el.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    }
  };

  return (
    <>
      <video
        ref={videoRef}
        // #t=0.1 makes iOS Safari seek to and RENDER that frame as the poster
        // (it shows nothing without a poster). With preload="metadata" it fetches
        // only metadata + that frame, NOT the whole video — the full download
        // still waits for play() (autoplay-on-visible). The fragment is
        // client-side, so it never breaks a presigned (query-string) URL.
        src={src ? `${src}#t=0.1` : undefined}
        className={`${styles.img} ${loaded ? styles.loaded : ""} ${
          revealed ? "" : styles.blurred
        }`}
        muted
        loop
        playsInline
        webkit-playsinline="true"
        preload="metadata"
        draggable={false}
        aria-label={t("media.video")}
        onLoadedMetadata={(e) => {
          const v = e.currentTarget;
          if (v.videoWidth && v.videoHeight) onNaturalSize?.(v.videoWidth, v.videoHeight);
        }}
        onLoadedData={() => setLoaded(true)}
        onCanPlay={tryPlay}
      />
      {revealed && needsTap && (
        <button
          type="button"
          data-control=""
          className={styles.playBtn}
          aria-label={t("media.playVideo")}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={manualPlay}
        >
          <PlayIcon />
        </button>
      )}
      {revealed && !needsTap && (
        <button
          type="button"
          data-control=""
          className={styles.soundBtn}
          aria-label={muted ? t("media.unmute") : t("media.mute")}
          // Bounce the whole card-item (the existing spring) as touch feedback,
          // reusing pressEl/bounceEl on the frame. stopPropagation keeps the
          // carousel/single from also handling it (no drag, no viewer open).
          onPointerDown={(e) => {
            e.stopPropagation();
            pressEl(e.currentTarget.closest("[data-frame]"));
          }}
          onPointerUp={(e) => bounceEl(e.currentTarget.closest("[data-frame]"))}
          onPointerCancel={(e) => cancelEl(e.currentTarget.closest("[data-frame]"))}
          onClick={toggleMute}
        >
          {/* Threads' two-layer structure: an invisible middle layer (16px
              padding = the enlarged ~60×60 touch area) wraps the visible pill
              (blur + dark fill + circular + 8px padding → 28×28). The button
              itself carries no fill/size — interaction only. */}
          <span className={styles.soundHit}>
            <span className={styles.soundPill}>
              <SpeakerIcon muted={muted} />
            </span>
          </span>
        </button>
      )}
    </>
  );
}

/**
 * One media item (image or video) plus the sensitive-content blur overlay.
 * `className` sizes/positions it (single / carousel item). `onNaturalSize(w,h)`
 * reports the real dimensions so the frame can use the true aspect-ratio.
 */
function MediaFrame({
  item,
  className = "",
  style,
  frameRef,
  frameProps = {},
  onNaturalSize,
  eager,
}) {
  const { t } = useTranslation();
  const [revealed, setRevealed] = useState(!item.isNsfw);
  const isVideo = item.type === "video";

  return (
    <div
      ref={frameRef}
      data-frame=""
      className={`${styles.frame} ${className}`}
      style={style}
      {...frameProps}
    >
      {isVideo ? (
        <VideoMedia item={item} revealed={revealed} onNaturalSize={onNaturalSize} eager={eager} />
      ) : (
        <ImageMedia item={item} revealed={revealed} onNaturalSize={onNaturalSize} eager={eager} />
      )}
      {!revealed && (
        <button
          type="button"
          data-reveal=""
          className={styles.reveal}
          aria-label={t("media.viewSensitive")}
          onClick={(e) => {
            // Don't let the reveal bubble to the card's navigation.
            e.stopPropagation();
            setRevealed(true);
          }}
        >
          <span className={styles.revealBadge} aria-hidden="true">
            <EyeIcon />
          </span>
        </button>
      )}
    </div>
  );
}

// 1 media item — natural proportion, clamped, with a height ceiling. The width
// adapts to the ratio (narrow when tall, wide when short). aspect-ratio reserves
// space to avoid layout shift; without backend dimensions we start from a
// sensible default and refine once the real size is known.
function SingleMedia({ item, onOpen }) {
  // Start from the REAL aspect-ratio when the backend carries the stored
  // dimensions (confirm-time width/height) — the frame reserves its final size
  // from the FIRST paint and never jumps when the media loads (the scroll-shift
  // bug). Old records without dims fall back to the 0.8 guess and refine on
  // load, as before.
  const [ratio, setRatio] = useState(() =>
    item.width && item.height ? clampRatio(item.width / item.height) : 0.8
  );
  const frameRef = useRef(null);
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;
  const onNaturalSize = (w, h) => {
    if (w && h) setRatio(clampRatio(w / h));
  };

  // Tap spring + open the viewer on tap. No carousel/capture here, so the frame
  // gets its own pointer events. A press shrinks; if the pointer moves past the
  // threshold (or the gesture is cancelled/leaves) it's not a tap → cancel
  // without bounce. A tap (not on the reveal button) opens the viewer; the
  // resulting click is swallowed by the wrapper so it can't navigate the card.
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return undefined;
    const s = { pressing: false, x: 0, y: 0 };
    const onDown = (e) => {
      // Let the in-frame controls (sound/play) and the reveal button handle
      // their own taps — no spring, no viewer-open, no capture.
      if (e.target.closest("[data-control],[data-reveal]")) return;
      s.pressing = true;
      s.x = e.clientX;
      s.y = e.clientY;
      pressEl(el);
    };
    const onMove = (e) => {
      if (!s.pressing) return;
      if (Math.hypot(e.clientX - s.x, e.clientY - s.y) > TAP_MOVE_THRESHOLD) {
        s.pressing = false;
        cancelEl(el);
      }
    };
    const onUp = () => {
      if (!s.pressing) return;
      s.pressing = false;
      bounceEl(el);
      onOpenRef.current?.();
    };
    const onCancel = () => {
      if (!s.pressing) return;
      s.pressing = false;
      cancelEl(el);
    };
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onCancel);
    el.addEventListener("pointerleave", onCancel);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onCancel);
      el.removeEventListener("pointerleave", onCancel);
    };
  }, []);

  return (
    <MediaFrame
      item={item}
      frameRef={frameRef}
      className={styles.single}
      style={{
        "--ratio": ratio,
        maxWidth: `min(100%, calc(${MAX_HEIGHT}px * ${ratio}))`,
      }}
      onNaturalSize={onNaturalSize}
    />
  );
}

// 2+ images — horizontal carousel.
// - Touch + trackpad use NATIVE scroll (with momentum); the JS drag is MOUSE
//   ONLY (Pointer Events, pointerType === 'mouse'), so it never interferes.
// - Grab-to-drag is smooth: pointermove only records the target; the actual
//   scrollLeft write is coalesced into ONE requestAnimationFrame per frame.
// - Snap is disabled while dragging (so the drag is free) and re-enabled on
//   release (soft proximity snap). Listeners + rAF are cleaned up on unmount.
function Carousel({ images, onOpen }) {
  const { t } = useTranslation();
  const ref = useRef(null);
  // Inner track that carries the cells — the elastic overscroll stretches it
  // with a transform (the scroller's scrollLeft clamps at the ends).
  const innerRef = useRef(null);
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;
  // Panorama mode (Threads): clicking the invisible seam button between two
  // cells collapses every gap (animated) so the images join into one panorama.
  // While joined, a tap ANYWHERE (a seam or an image) separates them again —
  // the viewer only opens from normal mode (Threads' exact behavior). The ref
  // mirrors the state for the pointer handlers (bound once in the effect).
  const [pano, setPano] = useState(false);
  const panoRef = useRef(false);
  panoRef.current = pano;
  // Load the carousel's items as soon as the CARD/container is visible (not when
  // each item scrolls into HORIZONTAL view) — the IntersectionObserver only
  // measures vertical viewport proximity, so an off-screen-right item (e.g. the
  // last video) would otherwise never load and stay an empty hole. Feed-level
  // lazy is preserved: off-screen cards never become eager.
  const [eager, setEager] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || eager) return undefined;
    if (typeof IntersectionObserver === "undefined") {
      setEager(true);
      return undefined;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setEager(true);
          io.disconnect();
        }
      },
      { rootMargin: "200px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [eager]);
  const drag = useRef({
    active: false,
    startX: 0,
    startY: 0,
    startScroll: 0,
    target: 0,
    moved: false,
    raf: 0,
    pressedEl: null,
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const d = drag.current;
    const inner = innerRef.current;

    // Elastic overscroll on the MOUSE drag (Threads desktop): past the ends the
    // strip keeps following the pointer with rubber-band resistance (transform
    // on the inner track — scrollLeft clamps and can't stretch) and springs
    // back on release. Asymptotic damping: approaches but never exceeds RUBBER.
    const RUBBER = 110;
    const reduceMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const rubber = (over) => (1 - 1 / (over / RUBBER + 1)) * RUBBER;
    let stretched = 0;

    const apply = () => {
      const max = el.scrollWidth - el.clientWidth;
      const clamped = Math.max(0, Math.min(max, d.target));
      el.scrollLeft = clamped;
      const over = d.target - clamped; // <0 past the start, >0 past the end
      const px =
        over === 0 || reduceMotion || !inner
          ? 0
          : over > 0
          ? -rubber(over)
          : rubber(-over);
      if (px !== stretched && inner) {
        stretched = px;
        inner.style.transform = px ? `translateX(${px}px)` : "";
      }
      d.raf = 0;
    };
    const onDown = (e) => {
      // Reset the drag flag FIRST — before any bail — so a tap on a control
      // after a previous drag doesn't inherit a stale moved=true (which the
      // click-suppressor below would treat as a drag and eat the button's click).
      d.moved = false;
      // Let the in-frame controls (sound/play) and the reveal button handle
      // their own taps — don't press, track, or capture (capture would steal the
      // button's click and make it navigate the card).
      if (e.target.closest("[data-control],[data-reveal]")) return;
      // Tap spring (all pointer types): press the frame under the pointer.
      d.pressedEl = e.target.closest("[data-frame]");
      d.startX = e.clientX;
      d.startY = e.clientY;
      pressEl(d.pressedEl);
      // Scroll-drag is mouse only — touch/pen/trackpad keep native scroll + inertia.
      if (e.pointerType !== "mouse") return;
      d.active = true;
      d.startScroll = el.scrollLeft;
      d.target = el.scrollLeft;
      el.classList.add(styles.dragging);
      // The stretch must track the pointer 1:1 while dragging — no easing.
      if (inner) inner.style.transition = "none";
      // Capture so move/up keep firing even if the cursor leaves the element.
      if (el.setPointerCapture) el.setPointerCapture(e.pointerId);
    };
    const onMove = (e) => {
      // Once the pointer moves past the threshold it's a drag/swipe, not a tap:
      // cancel the spring (no shrink/bounce while dragging).
      if (!d.moved) {
        const dist = Math.hypot(e.clientX - d.startX, e.clientY - d.startY);
        if (dist > TAP_MOVE_THRESHOLD) {
          d.moved = true;
          cancelEl(d.pressedEl);
        }
      }
      if (!d.active) return;
      d.target = d.startScroll - (e.clientX - d.startX);
      // Coalesce writes to the frame (no direct scrollLeft per event → no jank).
      if (!d.raf) d.raf = requestAnimationFrame(apply);
    };
    const onUp = (e) => {
      // A tap (no significant move) springs back with the overshoot bounce.
      // In panorama mode the tap SEPARATES the strip back to normal (Threads);
      // otherwise it opens the viewer at that image.
      if (d.pressedEl) {
        if (!d.moved) {
          bounceEl(d.pressedEl);
          if (panoRef.current) {
            setPano(false);
          } else {
            const i = Number(d.pressedEl.dataset.index);
            if (!Number.isNaN(i)) onOpenRef.current?.(i);
          }
        }
        d.pressedEl = null;
      }
      if (!d.active) return;
      d.active = false;
      el.classList.remove(styles.dragging);
      // Release past the edge: spring the stretched track back to rest.
      if (stretched && inner) {
        inner.style.transition =
          "transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)";
        inner.style.transform = "";
        stretched = 0;
        d.target = el.scrollLeft; // drop the out-of-bounds remainder
      }
      if (el.releasePointerCapture && e.pointerId != null) {
        try {
          el.releasePointerCapture(e.pointerId);
        } catch (err) {
          /* capture already released */
        }
      }
    };
    // Cancel (e.g. touch turned into a native scroll): drop the press, no bounce.
    const onCancel = (e) => {
      if (d.pressedEl) {
        cancelEl(d.pressedEl);
        d.pressedEl = null;
      }
      onUp(e);
    };
    // Swallow the click that ends a drag so it doesn't navigate the card.
    // (A tap that opens the viewer is swallowed by the wrapper's onClickCapture.)
    // Never eat a click that lands on a control (sound/play) or the reveal button.
    const onClick = (e) => {
      if (d.moved && !e.target.closest("[data-control],[data-reveal]")) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onCancel);
    el.addEventListener("click", onClick, true);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onCancel);
      el.removeEventListener("click", onClick, true);
      if (d.raf) cancelAnimationFrame(d.raf);
    };
  }, []);

  return (
    // data-media-zone: the whole track (cells AND the gaps/empty end space) is
    // drag surface — clickable ancestors (feed card row navigation) skip it.
    <div
      ref={ref}
      className={`${styles.carousel} ${pano ? styles.panorama : ""}`}
      data-media-zone=""
    >
      <div ref={innerRef} className={styles.track}>
        {images.map((item, i) => (
          <div key={item.id} className={styles.cell}>
            <CarouselItem item={item} index={i} eager={eager} />
            {/* Threads' "Combine media into panorama" seam button — one per gap
                (none after the last cell). data-control: the track's pointer
                logic leaves it alone (no press/capture), like the sound button. */}
            {i < images.length - 1 && (
              <button
                type="button"
                data-control=""
                className={styles.panoToggle}
                aria-label={t("media.combinePanorama")}
                aria-pressed={pano}
                onClick={(e) => {
                  e.stopPropagation();
                  setPano((p) => !p);
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Carousel cell: a fixed 3/4 box (Threads-style); the media fills it with
// object-fit: cover. No per-item aspect-ratio — every cell is identical.
function CarouselItem({ item, index, eager }) {
  return (
    <MediaFrame
      item={item}
      className={styles.carouselItem}
      frameProps={{ "data-index": index }}
      eager={eager}
    />
  );
}

/**
 * Centralized thread media (feed, thread head and replies). Picks the layout by
 * count: 1 = natural (proportion, capped height), 2+ = swipe carousel (no
 * grid/mosaic). Renders images AND videos (videos autoplay muted while visible).
 * Sensitive media blurs until tapped. Tapping an image opens the fullscreen
 * viewer (images only); videos play inline.
 */
function ThreadMedia({ items }) {
  const media = (items || []).filter((m) => m && m.url);
  // Index (in the media array) of the item open in the viewer (null = closed).
  const [viewerIndex, setViewerIndex] = useState(null);
  // Set when a tap opens the viewer so the resulting click is swallowed here
  // (capture phase) and never reaches the surrounding clickable card.
  // Images AND videos open in the fullscreen viewer (it renders both).
  // NOTE: no click-suppression here. The card is no longer a button (navigation
  // moved to navZone, a sibling of the media), so a tap on the media never
  // reaches a navigation handler — and a stale suppress flag used to eat the
  // first tap on the sound button after closing the viewer (the "double click").
  const open = (mediaIndex) => {
    if (!media[mediaIndex]) return;
    setViewerIndex(mediaIndex);
  };
  const close = () => setViewerIndex(null);

  if (media.length === 0) return null;

  return (
    // NOTE: no exclusion attribute on this wrapper — it spans the full column
    // width, so the blank space beside a narrow single image must still
    // navigate (feed card whole-row click). The opt-out hooks live on the
    // actual media surfaces: [data-frame] (single frame + carousel cells) and
    // [data-media-zone] on the carousel track (its empty track is drag area).
    <div className={styles.wrapper}>
      {media.length === 1 ? (
        <SingleMedia item={media[0]} onOpen={() => open(0)} />
      ) : (
        <Carousel images={media} onOpen={open} />
      )}
      {viewerIndex !== null && (
        <MediaViewer images={media} index={viewerIndex} onClose={close} />
      )}
    </div>
  );
}

export default ThreadMedia;

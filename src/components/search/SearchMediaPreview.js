import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import MaskAvatar from "../MaskAvatar";
import ReactionStack from "../post/ReactionStack";
import { renderTextWithHashtags } from "../home/homeHelpers";
import VideoPlayer from "../media/VideoPlayer";
import {
  setAudioOwner,
  VIEWER_AUDIO_ID,
} from "../../services/media/audioOwner";
import { useScrollLock } from "../../utils/scrollLock";
import styles from "../../styles/components/search/SearchMediaPreview.module.css";

/**
 * Instagram-explore-style POST PREVIEW for the search Media tab: clicking a
 * grid tile opens a centered dialog with the tapped media on the left and the
 * parent thread's panel on the right (identity header · text · reply/reaction
 * counts · "View thread"). Everything renders from the search result itself —
 * the backend ships each media item with its parent thread card, so the
 * preview needs NO extra request; "View thread" seeds /p/:uid with that card
 * (instant OP, like a feed card click). Follows the app's modal spec (portal,
 * #fdfcf8 surface, radius 18, warm backdrop + blur) with IG's media stage:
 * the media pane is SOLID BLACK (#000, their _aatk), borderless — the
 * dominant color is a grid-tile device only, never the modal's letterbox.
 *
 * Props: item = { id, type, url, isNsfw, thread } (the mapped media search
 * result; its dominantColor is ignored here), onClose, onViewThread(thread),
 * onHashtag(tag) — a hashtag tapped in the text closes the preview and pivots
 * the search to that tag.
 */
function SearchMediaPreview({ item, onClose, onViewThread, onHashtag }) {
  const { t } = useTranslation();
  const thread = item?.thread || null;

  // Graceful close: every close path (X, Escape, backdrop) routes through a
  // short fade-out of the whole modal before unmounting — the media itself
  // never moves (a flying shared-element clone was tried and looked wrong).
  // Direct close under reduced motion.
  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [closing, setClosing] = useState(false);
  const closeTimerRef = useRef(null);
  const requestClose = () => {
    if (reducedMotion) {
      onClose();
      return;
    }
    if (closing) return;
    setClosing(true);
    closeTimerRef.current = setTimeout(onClose, 220);
  };
  useEffect(() => () => clearTimeout(closeTimerRef.current), []);

  // IG's in-modal carousel: the thread card ships its FULL media list, so a
  // multi-media thread slides here (arrows + dots) with no extra request.
  // Starts on the tapped file.
  const mediaList =
    thread?.media && thread.media.length > 0 ? thread.media : item ? [item] : [];
  const [index, setIndex] = useState(() => {
    const i = mediaList.findIndex(
      (m) => m.id === item?.id || m.url === item?.url
    );
    return i >= 0 ? i : 0;
  });
  const current = mediaList[index] || item;

  // IG's DYNAMIC stage width: the media pane's aspect ratio matches the lead
  // media (the backend ships intrinsic width/height), clamped to the app's
  // media bounds (0.7–2.0, same as ThreadMedia) — so an in-bounds photo or
  // video FILLS the stage with no black side bars, and the whole dialog
  // grows/shrinks with it (IG post modal behavior: their pane carries the
  // post's ratio + a max-width cap). Unknown dims fall back to square.
  const STAGE_RATIO_MIN = 0.7;
  const STAGE_RATIO_MAX = 2.0;
  const lead = mediaList[0] || item;
  const stageRatio =
    lead && lead.width && lead.height
      ? Math.min(
          STAGE_RATIO_MAX,
          Math.max(STAGE_RATIO_MIN, lead.width / lead.height)
        )
      : 1;
  // Navigate by SCROLLING the native track (arrows/keys) — the scroll-snap
  // settles it and the scroll listener keeps `index` in sync.
  const goTo = (i) => {
    const target = Math.max(0, Math.min(mediaList.length - 1, i));
    const el = trackRef.current;
    if (!el) {
      setIndex(target);
      return;
    }
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({
      left: target * el.clientWidth,
      behavior: reduced ? "auto" : "smooth",
    });
  };

  // Sensitive media stays blurred until explicitly revealed (same contract as
  // the feed's ThreadMedia) — tracked PER FILE, so revealing one slide never
  // reveals its siblings.
  const [revealedIds, setRevealedIds] = useState(() => new Set());
  const revealCurrent = () =>
    setRevealedIds((s) => {
      const next = new Set(s);
      next.add(current.id);
      return next;
    });

  // Escape closes (through the shared-element flight); ←/→ slide (the app
  // modal + IG carousel behavior). The video scrub bar stops its own arrow
  // keys from bubbling, so scrubbing never changes the slide.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") requestClose();
      else if (e.key === "ArrowRight") goTo(index + 1);
      else if (e.key === "ArrowLeft") goTo(index - 1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose, index, mediaList.length]);

  // Background scroll lock while open — the CENTRALIZED lock (same as
  // BottomSheet): it measures the desktop scrollbar and pads the body by
  // exactly that width, so hiding it never widens the page (the sideways
  // jump on open/close); ref-counted, so overlapping lockers can't clobber
  // each other's saved styles.
  useScrollLock(true);

  // Audio contract (same as the fullscreen viewer): while the CURRENT slide
  // is a video it OWNS the global audio (any sounding feed video goes muted;
  // this one starts with sound). Released on slide-away/close — the feed
  // stays muted.
  useEffect(() => {
    if (current?.type !== "video") return undefined;
    setAudioOwner(VIEWER_AUDIO_ID);
    return () => setAudioOwner(null);
  }, [current]);

  // === The track is a NATIVE horizontal scroller with per-slide snap —
  // Threads/IG's real mechanism. The browser owns the physics, so the
  // trackpad two-finger swipe, touch flicks and their momentum are fluid and
  // CHAINABLE (swipe-swipe-swipe without waiting — the old JS wheel
  // accumulator needed a quiet gap between gestures, which is what felt
  // stuck). scroll-snap-stop: always keeps it paged (a hard flick moves ONE
  // slide, IG-style); the scroll listener keeps `index` (dots, player,
  // audio) in sync live. Only the MOUSE needs JS (a mouse can't pan a
  // scroller): drag writes scrollLeft with snap suspended, release re-snaps.
  const trackRef = useRef(null);
  const dragRef = useRef(null);
  const suppressClickRef = useRef(false);
  const indexRef = useRef(index);
  indexRef.current = index;
  const DRAG_SLOP = 8;

  // Open on the tapped file: position the scroller BEFORE first paint.
  useLayoutEffect(() => {
    const el = trackRef.current;
    if (el) el.scrollLeft = indexRef.current * el.clientWidth;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live index sync (dots flip at the midpoint, like IG).
  const onTrackScroll = () => {
    const el = trackRef.current;
    if (!el || el.clientWidth === 0) return;
    const i = Math.max(
      0,
      Math.min(mediaList.length - 1, Math.round(el.scrollLeft / el.clientWidth))
    );
    if (i !== indexRef.current) setIndex(i);
  };

  // Mouse-only drag (touch/trackpad are native): 1:1 scrollLeft under the
  // pointer with the snap suspended (it would fight the drag), then a smooth
  // re-snap to the nearest slide on release. Controls (buttons, the video
  // scrub/mute) are exempt; the click after a real drag is swallowed so
  // releasing over the video never toggles play/pause.
  const onStagePointerDown = (e) => {
    if (mediaList.length < 2 || e.pointerType !== "mouse") return;
    if (e.target.closest("button, [data-video-control]")) return;
    const el = trackRef.current;
    if (!el) return;
    dragRef.current = {
      x: e.clientX,
      y: e.clientY,
      id: e.pointerId,
      startLeft: el.scrollLeft,
      active: false,
    };
  };

  const onStagePointerMove = (e) => {
    const g = dragRef.current;
    if (!g) return;
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    const el = trackRef.current;
    if (!el) return;
    if (!g.active) {
      if (Math.abs(dx) < DRAG_SLOP) return;
      if (Math.abs(dx) < Math.abs(dy)) {
        dragRef.current = null;
        return;
      }
      g.active = true;
      el.classList.add(styles.trackDragging);
      if (e.currentTarget.setPointerCapture) {
        try {
          e.currentTarget.setPointerCapture(g.id);
        } catch (err) {
          /* capture unavailable */
        }
      }
    }
    el.scrollLeft = g.startLeft - dx;
  };

  const endMouseDrag = () => {
    const g = dragRef.current;
    dragRef.current = null;
    if (!g || !g.active) return;
    suppressClickRef.current = true;
    const el = trackRef.current;
    if (!el) return;
    // Re-enable the snap and glide to the nearest slide.
    el.classList.remove(styles.trackDragging);
    const w = el.clientWidth || 1;
    const target = Math.max(
      0,
      Math.min(mediaList.length - 1, Math.round(el.scrollLeft / w))
    );
    el.scrollTo({ left: target * w, behavior: "smooth" });
  };

  const onStageClickCapture = (e) => {
    if (!suppressClickRef.current) return;
    suppressClickRef.current = false;
    e.preventDefault();
    e.stopPropagation();
  };


  return createPortal(
    <div
      className={`${styles.backdrop} ${closing ? styles.backdropClosing : ""}`}
      onClick={requestClose}
    >
      <div
        className={`${styles.dialog} ${closing ? styles.dialogClosing : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={t("search.mediaPreview.label")}
        onClick={(e) => e.stopPropagation()}
      >
        {/* === Left: the tapped media — IG's black stage (the dominant-color
            tint stays a GRID-only device; here the letterbox is #000). The
            stage owns the mouse drag; touch/trackpad scroll natively. === */}
        <div
          className={styles.mediaPane}
          style={{ "--stage-ratio": stageRatio }}
          onPointerDown={onStagePointerDown}
          onPointerMove={onStagePointerMove}
          onPointerUp={endMouseDrag}
          onPointerCancel={endMouseDrag}
          onClickCapture={onStageClickCapture}
        >
          {/* Native snap scroller (Threads/IG's real carousel mechanism):
              every slide side by side, the browser owns the swipe physics. */}
          <div
            className={styles.track}
            ref={trackRef}
            onScroll={onTrackScroll}
          >
            {mediaList.map((m, i) => {
              const mRevealed = !m.isNsfw || revealedIds.has(m.id);
              const isCurrent = i === index;
              return (
                <div
                  key={m.id}
                  className={styles.slide}
                  aria-hidden={isCurrent ? undefined : "true"}
                >
                  {m.type === "video" ? (
                    isCurrent && mRevealed ? (
                      /* The app's OWN player (the fullscreen viewer's): mute
                         toggle, scrubbable bar, tap play/pause — never the
                         native controls. Only the CURRENT slide plays. */
                      <VideoPlayer item={m} fill />
                    ) : (
                      /* Adjacent/NSFW video: a bare muted frame (no player). */
                      <video
                        className={`${styles.media} ${
                          mRevealed ? "" : styles.mediaBlurred
                        }`}
                        src={m.url}
                        muted
                        playsInline
                        preload="metadata"
                      />
                    )
                  ) : (
                    <img
                      className={`${styles.media} ${
                        mRevealed ? "" : styles.mediaBlurred
                      }`}
                      src={m.url}
                      alt=""
                      draggable={false}
                      loading={isCurrent ? undefined : "lazy"}
                    />
                  )}
                  {!mRevealed && isCurrent && (
                    <button
                      type="button"
                      className={styles.revealButton}
                      onClick={revealCurrent}
                    >
                      {t("media.viewSensitive")}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          {/* === IG's in-modal carousel chrome (multi-media threads only):
              side arrows (hidden at the ends, IG-style) + the dots. Dark-glass
              discs — the app's over-media control family. === */}
          {mediaList.length > 1 && (
            <>
              {index > 0 && (
                <button
                  type="button"
                  className={`${styles.navArrow} ${styles.navPrev}`}
                  onClick={() => goTo(index - 1)}
                  aria-label={t("media.viewer.previous")}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>
              )}
              {index < mediaList.length - 1 && (
                <button
                  type="button"
                  className={`${styles.navArrow} ${styles.navNext}`}
                  onClick={() => goTo(index + 1)}
                  aria-label={t("media.viewer.next")}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              )}
              <div className={styles.dots} aria-hidden="true">
                {mediaList.map((m, i) => (
                  <span
                    key={m.id}
                    className={`${styles.dot} ${
                      i === index ? styles.dotActive : ""
                    }`}
                  />
                ))}
              </div>
              {/* Screen-reader position ("Image 2 of 5"). */}
              <span className={styles.srPosition} aria-live="polite">
                {t("media.viewer.position", {
                  current: index + 1,
                  total: mediaList.length,
                })}
              </span>
            </>
          )}
          {/* Mobile-only close, floating on the stage (dark-glass over-media
              control family): on the full-screen sheet the panel-header X
              sits below the fold of attention — the exit belongs on top. */}
          <button
            type="button"
            className={styles.stageClose}
            onClick={requestClose}
            aria-label={t("media.viewer.close")}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* === Right: the parent thread panel (IG's side column, Thiup
            anatomy) === */}
        <div className={styles.panel}>
          <header className={styles.panelHeader}>
            {thread && (
              <>
                <MaskAvatar
                  seed={thread.mask.id}
                  size={36}
                  online={thread.mask.isOnline}
                />
                {/* Canonical identity row (Threads spec, same as the feed
                    card): mask + time INLINE, hierarchy by weight/color. */}
                <span className={styles.identity}>
                  <span className={styles.maskId}>{thread.mask.id}</span>
                  <span className={styles.time}>{thread.time}</span>
                </span>
              </>
            )}
            <button
              type="button"
              className={styles.closeButton}
              onClick={requestClose}
              aria-label={t("media.viewer.close")}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </header>

          {/* Thread text (scrolls if long) with LIVE hashtags — tapping one
              closes the preview and pivots the search to that tag. The feed
              card's own stats language sits below the text (real reaction
              emojis via ReactionStack, then the replies bubble), instead of
              the old generic smiley+counts row. */}
          <div className={styles.panelBody}>
            {thread?.text && (
              <p className={styles.threadText}>
                {renderTextWithHashtags(
                  thread.text,
                  styles.hashtag,
                  onHashtag ? (tag) => onHashtag(tag) : undefined
                )}
              </p>
            )}
            {thread && (
              <div className={styles.stats}>
                <ReactionStack reactions={thread.reactions || []} />
                <span className={styles.statWithIcon}>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                  </svg>
                  {thread.repliesCount}
                </span>
              </div>
            )}
          </div>

          <footer className={styles.panelFooter}>
            <button
              type="button"
              className={styles.viewThreadButton}
              onClick={() => thread && onViewThread(thread)}
              disabled={!thread}
            >
              {t("search.mediaPreview.viewThread")}
            </button>
          </footer>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default SearchMediaPreview;

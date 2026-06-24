import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import styles from "../../styles/components/media/VideoPlayer.module.css";

const HIDE_DELAY = 2800; // ms of inactivity before controls fade (while playing)
const SEEK_STEP = 5; // s per arrow key

const fmt = (s) => {
  const v = Number.isFinite(s) && s > 0 ? s : 0;
  const m = Math.floor(v / 60);
  const sec = Math.floor(v % 60);
  return `${m}:${sec < 10 ? "0" : ""}${sec}`;
};

function PlayIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5.5v13a1 1 0 0 0 1.54.84l10-6.5a1 1 0 0 0 0-1.68l-10-6.5A1 1 0 0 0 8 5.5Z" />
    </svg>
  );
}
function PauseIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  );
}
function SpeakerIcon({ muted }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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

/**
 * Custom video player for the fullscreen viewer ONLY (the feed keeps its own
 * minimal controls). Own icons/palette (no native controls): play/pause, a
 * scrubbable progress slider (with buffered range, keyboard, aria), a sound
 * toggle, and auto-hide on inactivity with a legibility scrim.
 *
 * Lives inside a [data-video-player] root so the viewer's swipe gesture bails on
 * it — scrubbing and button taps never trigger swipe/close/navigation.
 */
function VideoPlayer({ item }) {
  const { t } = useTranslation();
  const videoRef = useRef(null);
  const trackRef = useRef(null);
  const hideTimer = useRef(0);
  const scrubbingRef = useRef(false);
  const playingRef = useRef(false);

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);

  const scheduleHide = useCallback(() => {
    clearTimeout(hideTimer.current);
    if (playingRef.current && !scrubbingRef.current) {
      hideTimer.current = window.setTimeout(
        () => setControlsVisible(false),
        HIDE_DELAY
      );
    }
  }, []);
  const showControls = useCallback(() => {
    setControlsVisible(true);
    scheduleHide();
  }, [scheduleHide]);

  // Keep the element's muted state in sync.
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  // Try to play with sound (the open tap is a recent user gesture); if the
  // browser blocks it, fall back to a muted autoplay so it always plays.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return undefined;
    const p = v.play();
    if (p && typeof p.catch === "function") {
      p.catch(() => {
        v.muted = true;
        setMuted(true);
        const p2 = v.play();
        if (p2 && typeof p2.catch === "function") p2.catch(() => {});
      });
    }
    return () => clearTimeout(hideTimer.current);
  }, []);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      const p = v.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    } else {
      v.pause();
    }
  }, []);

  const seekToClientX = useCallback((clientX) => {
    const el = trackRef.current;
    const v = videoRef.current;
    if (!el || !v || !v.duration) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    v.currentTime = ratio * v.duration;
    setCurrent(v.currentTime);
  }, []);

  const onTrackDown = (e) => {
    e.stopPropagation();
    scrubbingRef.current = true;
    setControlsVisible(true);
    clearTimeout(hideTimer.current);
    if (trackRef.current?.setPointerCapture) {
      trackRef.current.setPointerCapture(e.pointerId);
    }
    seekToClientX(e.clientX);
  };
  const onTrackMove = (e) => {
    if (!scrubbingRef.current) return;
    e.stopPropagation();
    seekToClientX(e.clientX);
  };
  const onTrackUp = (e) => {
    if (!scrubbingRef.current) return;
    e.stopPropagation();
    scrubbingRef.current = false;
    if (trackRef.current?.releasePointerCapture && e.pointerId != null) {
      try {
        trackRef.current.releasePointerCapture(e.pointerId);
      } catch (err) {
        /* already released */
      }
    }
    scheduleHide();
  };
  const onTrackKey = (e) => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    let handled = true;
    if (e.key === "ArrowRight") v.currentTime = Math.min(v.duration, v.currentTime + SEEK_STEP);
    else if (e.key === "ArrowLeft") v.currentTime = Math.max(0, v.currentTime - SEEK_STEP);
    else if (e.key === "Home") v.currentTime = 0;
    else if (e.key === "End") v.currentTime = v.duration;
    else handled = false;
    if (handled) {
      // Don't let ←/→ bubble to the viewer (which would change media).
      e.preventDefault();
      e.stopPropagation();
      setCurrent(v.currentTime);
      showControls();
    }
  };

  const onProgress = () => {
    const v = videoRef.current;
    if (!v || !v.buffered || v.buffered.length === 0) return;
    try {
      setBuffered(v.buffered.end(v.buffered.length - 1));
    } catch (err) {
      /* buffered range not ready */
    }
  };

  const pctCur = duration ? (current / duration) * 100 : 0;
  const pctBuf = duration ? Math.min(100, (buffered / duration) * 100) : 0;

  return (
    <div className={styles.player} data-video-player="" onPointerMove={showControls}>
      <video
        ref={videoRef}
        src={item.url}
        className={styles.video}
        loop
        playsInline
        onClick={(e) => {
          e.stopPropagation();
          togglePlay();
          showControls();
        }}
        onPlay={() => {
          playingRef.current = true;
          setPlaying(true);
          scheduleHide();
        }}
        onPause={() => {
          playingRef.current = false;
          setPlaying(false);
          clearTimeout(hideTimer.current);
          setControlsVisible(true);
        }}
        onTimeUpdate={() => {
          const v = videoRef.current;
          if (v && !scrubbingRef.current) setCurrent(v.currentTime);
        }}
        onLoadedMetadata={() => {
          const v = videoRef.current;
          if (v) setDuration(v.duration || 0);
        }}
        onProgress={onProgress}
      />

      {!playing && (
        <button
          type="button"
          className={styles.bigPlay}
          aria-label={t("media.play")}
          onClick={(e) => {
            e.stopPropagation();
            togglePlay();
          }}
        >
          <PlayIcon size={30} />
        </button>
      )}

      <div
        className={`${styles.scrim} ${controlsVisible ? "" : styles.hidden}`}
        aria-hidden="true"
      />

      <div className={`${styles.controls} ${controlsVisible ? "" : styles.hidden}`}>
        <button
          type="button"
          className={styles.iconBtn}
          aria-label={playing ? t("media.pause") : t("media.play")}
          onClick={(e) => {
            e.stopPropagation();
            togglePlay();
            showControls();
          }}
        >
          {playing ? <PauseIcon /> : <PlayIcon />}
        </button>

        <span className={styles.time}>{fmt(current)}</span>

        <div
          ref={trackRef}
          className={styles.track}
          role="slider"
          tabIndex={0}
          aria-label={t("media.seek")}
          aria-valuemin={0}
          aria-valuemax={Math.floor(duration) || 0}
          aria-valuenow={Math.floor(current) || 0}
          onPointerDown={onTrackDown}
          onPointerMove={onTrackMove}
          onPointerUp={onTrackUp}
          onPointerCancel={onTrackUp}
          onKeyDown={onTrackKey}
        >
          <div className={styles.bar}>
            <div className={styles.buffer} style={{ width: `${pctBuf}%` }} />
            <div className={styles.fill} style={{ width: `${pctCur}%` }} />
          </div>
          <div className={styles.thumb} style={{ left: `${pctCur}%` }} />
        </div>

        <span className={styles.time}>{fmt(duration)}</span>

        <button
          type="button"
          className={styles.iconBtn}
          aria-label={muted ? t("media.unmute") : t("media.mute")}
          onClick={(e) => {
            e.stopPropagation();
            setMuted((m) => !m);
            showControls();
          }}
        >
          <SpeakerIcon muted={muted} />
        </button>
      </div>
    </div>
  );
}

export default VideoPlayer;

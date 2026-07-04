import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useTranslation } from "react-i18next";
import {
  getAudioOwner,
  setAudioOwner,
  subscribeAudioOwner,
  VIEWER_AUDIO_ID,
} from "../../services/media/audioOwner";
import styles from "../../styles/components/media/VideoPlayer.module.css";

const SEEK_STEP = 5; // s per arrow key

function PlayIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5.5v13a1 1 0 0 0 1.54.84l10-6.5a1 1 0 0 0 0-1.68l-10-6.5A1 1 0 0 0 8 5.5Z" />
    </svg>
  );
}
function SpeakerIcon({ muted, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
 * Custom video player for the fullscreen viewer. Threads-style MINIMAL controls:
 * a mute toggle in the top-right corner + a thin, scrubbable progress bar pinned
 * to the bottom edge — nothing else. Tapping the video toggles play/pause; a big
 * centered play button shows while paused. No play/pause button, no time labels,
 * no auto-hide (the two controls stay put, like Threads).
 *
 * Lives inside a [data-video-player] root so the viewer's swipe gesture bails on
 * it — scrubbing and the mute tap never trigger swipe/close/navigation.
 */
function VideoPlayer({ item, onReady, onError }) {
  const { t } = useTranslation();
  const videoRef = useRef(null);
  const trackRef = useRef(null);
  const scrubbingRef = useRef(false);

  const [playing, setPlaying] = useState(false);
  // Whether playback has started at least once. Gates the big-play so it only
  // shows when the USER paused — never during the initial autoplay startup (that
  // was the play-button flash).
  const [hasStarted, setHasStarted] = useState(false);
  // Reveals the video + controls and clears the viewer's spinner. Flips on the
  // first decoded frame (loadeddata) → the spinner shows ONLY while the video is
  // still loading from the CDN, and the controls never appear over an empty box.
  const [ready, setReady] = useState(false);
  // Audio is GLOBAL (one player at a time). This player owns audio when the
  // store owner is the viewer sentinel (shares the rule with the feed preview).
  const audioOwner = useSyncExternalStore(subscribeAudioOwner, getAudioOwner);
  const muted = audioOwner !== VIEWER_AUDIO_ID;
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);

  // Keep the element's muted state in sync.
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  // Play if paused; safe to call repeatedly. Swallows the async rejection so a
  // not-yet-ready play() never throws.
  const playSafe = useCallback(() => {
    const v = videoRef.current;
    if (!v || !v.paused) return;
    const p = v.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
  }, []);

  // Autoplay on mount AND again on canplay (the mount play() can race a still-
  // loading src and reject → it would stay paused). Retrying on canplay
  // guarantees it plays.
  useEffect(() => {
    playSafe();
  }, [playSafe]);

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
    <div className={styles.player} data-video-player="">
      <video
        ref={videoRef}
        src={item.url}
        className={`${styles.video} ${ready ? styles.ready : ""}`}
        loop
        playsInline
        onClick={(e) => {
          e.stopPropagation();
          togglePlay();
        }}
        onPlay={() => {
          setPlaying(true);
          setHasStarted(true);
        }}
        onPause={() => setPlaying(false)}
        onTimeUpdate={() => {
          const v = videoRef.current;
          if (v && !scrubbingRef.current) setCurrent(v.currentTime);
        }}
        onLoadedMetadata={() => {
          const v = videoRef.current;
          if (v) setDuration(v.duration || 0);
        }}
        onLoadedData={() => {
          // First frame decoded → reveal the video + controls and clear the
          // viewer's spinner (so the spinner only shows during the CDN load).
          setReady(true);
          onReady?.();
        }}
        onError={() => onError?.()}
        onCanPlay={playSafe}
        onProgress={onProgress}
      />

      {ready && !playing && hasStarted && (
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

      {ready && (
        <>
          {/* Mute toggle — top-right corner (Threads-style). */}
          <button
            type="button"
            className={styles.muteBtn}
            aria-label={muted ? t("media.unmute") : t("media.mute")}
            // data-video-control → the viewer's (native) pointerdown handler
            // bails on controls, so the swipe gesture never starts here.
            data-video-control=""
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              // Toggle via the global store (one audio at a time).
              setAudioOwner(muted ? VIEWER_AUDIO_ID : null);
            }}
          >
            <SpeakerIcon muted={muted} size={16} />
          </button>

          {/* Thin scrubbable progress bar pinned to the bottom edge. */}
          <div
            ref={trackRef}
            className={styles.progress}
            // data-video-control → the viewer's (native) pointerdown handler
            // bails on controls, so scrubbing never triggers the swipe/close.
            data-video-control=""
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
          </div>
        </>
      )}
    </div>
  );
}

export default VideoPlayer;

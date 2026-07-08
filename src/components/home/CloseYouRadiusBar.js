import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import styles from "../../styles/components/home/CloseYouRadiusBar.module.css";

// Expandable radius for Close You — bounded presets (the backend adapts the
// geohash precision to the radius; >25 km switches to coarse cells).
const RADIUS_PRESETS = [15, 30, 50, 100];

const pctOf = (i) => (i / (RADIUS_PRESETS.length - 1)) * 100;
const nearestIdx = (pct) =>
  Math.round((pct / 100) * (RADIUS_PRESETS.length - 1));

/**
 * Radius control for Close You, drawn as a MAP-SCALE RULER (the same paper-
 * map language as the compose privacy note): compass, a ruled track with a
 * tick per preset, and a terracotta dot that GLIDES (spring overshoot) to the
 * chosen distance, filling the travelled span.
 *
 * Interaction (Android-volume-slider style):
 *   • tap a number (or its whole column)      → select that preset
 *   • tap anywhere on the ruler               → jump to the nearest preset
 *   • DRAG the ruler/dot — it follows 1:1, the nearest label previews live,
 *     and on release it SNAPS (spring) to the closest preset.
 *
 * Default 15 km; the choice persists across sessions (just the number —
 * the reader's location stays ephemeral).
 */
function CloseYouRadiusBar({ radius, onChange, isLoading }) {
  const { t } = useTranslation();
  const trackRef = useRef(null);
  // Gesture bookkeeping (refs: no re-render per pointer event beyond dragPct).
  const gestureRef = useRef({ active: false, moved: false, startX: 0 });
  // Live position while dragging (null = at rest on the active preset).
  const [dragPct, setDragPct] = useState(null);
  const isDragging = dragPct != null;

  const activeIdx = Math.max(0, RADIUS_PRESETS.indexOf(radius));
  const displayPct = dragPct ?? pctOf(activeIdx);
  // While dragging, the nearest preset previews as active (live feedback).
  const previewIdx = isDragging ? nearestIdx(dragPct) : activeIdx;

  const pctFromEvent = (e) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return 0;
    return Math.max(
      0,
      Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)
    );
  };

  const commitIdx = (idx) => {
    const km = RADIUS_PRESETS[idx];
    if (!isLoading && km !== radius) onChange(km);
  };

  const handlePointerDown = (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    gestureRef.current = { active: true, moved: false, startX: e.clientX };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e) => {
    const g = gestureRef.current;
    if (!g.active) return;
    // 4px slop before it becomes a drag — plain taps/clicks stay clicks.
    if (!g.moved && Math.abs(e.clientX - g.startX) < 4) return;
    g.moved = true;
    setDragPct(pctFromEvent(e));
  };

  const handlePointerUp = (e) => {
    const g = gestureRef.current;
    if (!g.active) return;
    g.active = false;
    if (g.moved) {
      // Drag release → snap to the nearest preset (the transition springs
      // the dot from the release point to the snapped tick).
      commitIdx(nearestIdx(pctFromEvent(e)));
    } else if (!e.target.closest("button")) {
      // Plain tap on the ruler itself → jump to the nearest preset
      // (taps on the number buttons are handled by their own click).
      commitIdx(nearestIdx(pctFromEvent(e)));
    }
    setDragPct(null);
  };

  const handlePointerCancel = () => {
    gestureRef.current.active = false;
    setDragPct(null);
  };

  // After a real drag, swallow the click that lands on a stop button so the
  // release doesn't ALSO trigger that button's own selection.
  const handleClickCapture = (e) => {
    if (gestureRef.current.moved) {
      gestureRef.current.moved = false;
      e.preventDefault();
      e.stopPropagation();
    }
  };

  return (
    <div
      className={styles.bar}
      role="radiogroup"
      aria-label={t("closeYou.within")}
    >
      {/* Compass — cartographic, like the ruler itself (and deliberately NOT
          a pin: the app never suggests an exact point). Ring + 45° needle.
          The needle SWINGS and settles whenever the radius changes (the key
          remount retriggers the keyframe) — a compass finding its bearing. */}
      <span className={styles.compass} aria-hidden="true">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <circle cx="12" cy="12" r="9" />
          <g key={radius} className={styles.needle}>
            <path
              d="M15.8 8.2 L13.3 13.3 L8.2 15.8 L10.7 10.7 Z"
              fill="currentColor"
              stroke="none"
            />
          </g>
        </svg>
      </span>

      <div
        className={`${styles.scale} ${isDragging ? styles.dragging : ""}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onClickCapture={handleClickCapture}
      >
        {/* The ruler: hairline + a tick per preset + the travelled fill and
            the sliding dot (visual only — the buttons below carry semantics). */}
        {/* The end marks (15 / 100) are NOT ticks: they are the baseline's own
            legs — the ruler is a rounded bracket (⊓) whose corners curve down
            at both extremes (no sharp 90° junctions). The travelled span is
            the track's ::after — an identical warm-gradient bracket revealed
            to --fill-pct — so line, curves and legs warm up as ONE continuous
            stroke (no cuts, no color seams). */}
        <div
          className={styles.track}
          ref={trackRef}
          aria-hidden="true"
          style={{ "--fill-pct": `${displayPct}%` }}
        >
          {RADIUS_PRESETS.map((km, i) =>
            i === 0 || i === RADIUS_PRESETS.length - 1 ? null : (
              <span
                key={km}
                className={`${styles.tick} ${
                  i <= previewIdx ? styles.tickPassed : ""
                }`}
                style={{ left: `${pctOf(i)}%` }}
              />
            )
          )}
          <span className={styles.thumb} style={{ left: `${displayPct}%` }} />
        </div>

        <div className={styles.stops}>
          {RADIUS_PRESETS.map((km, i) => (
            <button
              key={km}
              type="button"
              role="radio"
              aria-checked={radius === km}
              className={`${styles.stop} ${
                i === previewIdx ? styles.stopActive : ""
              }`}
              style={{ left: `${pctOf(i)}%` }}
              onClick={() => {
                if (!isLoading && radius !== km) onChange(km);
              }}
              disabled={isLoading}
            >
              {t("closeYou.radiusChip", { km })}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default CloseYouRadiusBar;

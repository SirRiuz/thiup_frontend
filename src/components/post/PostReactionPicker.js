import { useEffect, useLayoutEffect, useRef, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import ReactionEmoji from "./ReactionEmoji";
import styles from "../../styles/components/post/PostReactionPicker.module.css";
import cx from "../../utils/cx";

// Single source of truth for the reaction set (order = display order in the bar,
// and the canonical TIE-BREAK order for ReactionStack's top-3). `id`/`label`
// are the STABLE internal ids — they match the backend catalog `name`, which is
// how the reaction is resolved/posted. `emoji` is presentation (changing one
// here never touches the DB); `labelKey` is the translated tooltip.
export const REACTIONS = [
  { id: "love", emoji: "❤️", label: "love", labelKey: "reactions.love" },
  { id: "laugh", emoji: "😂", label: "laugh", labelKey: "reactions.laugh" },
  { id: "wow", emoji: "😮", label: "wow", labelKey: "reactions.wow" },
  { id: "sad", emoji: "😢", label: "sad", labelKey: "reactions.sad" },
  { id: "angry", emoji: "😡", label: "angry", labelKey: "reactions.angry" },
  { id: "applause", emoji: "👏", label: "applause", labelKey: "reactions.applause" },
];

// Minimum margin from the popover to the viewport edges.
const VIEWPORT_MARGIN = 8;
// The base offset from the CSS (.popover { left: -8px }).
const BASE_LEFT_OFFSET = -8;
// Clamp the tail: so it doesn't fall over the rounded corners (radius 28px).
const TAIL_MIN_X = 24;

function PostReactionPicker({
  onSelect,
  contextId,
  currentReactionEmoji,
  variant = "default",
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  // Threads-style action button instead of the dashed "+" chip. When the user
  // already has a reaction, the trigger shows that emoji + its name in the warm
  // accent (Facebook-style "your reaction"); otherwise a neutral smiley + label.
  const isAction = variant === "action";
  const activeReaction = currentReactionEmoji
    ? REACTIONS.find((r) => r.emoji === currentReactionEmoji)
    : null;
  // Horizontal shift so the popover ALWAYS fits in the viewport, and X
  // position of the tail (relative to the popover) so the little tail keeps
  // pointing at the '+' even if the popover has shifted.
  const [shiftX, setShiftX] = useState(0);
  const [tailX, setTailX] = useState(TAIL_MIN_X);
  const ref = useRef(null);
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);

  // Deterministic calculation, immune to the transform of the entry
  // animation (offsetWidth = layout width; rects of the wrapper/trigger, not
  // of the scaled popover).
  const recalcShift = useCallback(() => {
    const wrapper = ref.current;
    const trigger = triggerRef.current;
    const popover = popoverRef.current;
    if (!wrapper || !trigger || !popover) return;

    const baseLeft = wrapper.getBoundingClientRect().left + BASE_LEFT_OFFSET;
    const width = popover.offsetWidth;
    const maxLeft = window.innerWidth - VIEWPORT_MARGIN - width;

    let shift = 0;
    if (baseLeft > maxLeft) shift = maxLeft - baseLeft; // it was going off the right
    if (baseLeft + shift < VIEWPORT_MARGIN) {
      shift = VIEWPORT_MARGIN - baseLeft; // never off the left
    }
    setShiftX(shift);

    // Tail pointing at the CENTER of the '+': its X is relative to the
    // already-shifted popover (not fixed-centered). Clamp so it doesn't
    // overlap the popover's rounded corners.
    const triggerRect = trigger.getBoundingClientRect();
    const triggerCenter = triggerRect.left + triggerRect.width / 2;
    const rawTailX = triggerCenter - (baseLeft + shift);
    setTailX(Math.max(TAIL_MIN_X, Math.min(width - TAIL_MIN_X, rawTailX)));
  }, []);

  // Pre-paint: measure and reposition BEFORE painting (no flash). Recalculate
  // on resize while open.
  useLayoutEffect(() => {
    if (!open) return undefined;
    recalcShift();
    window.addEventListener("resize", recalcShift);
    return () => window.removeEventListener("resize", recalcShift);
  }, [open, recalcShift]);

  // Close on SCROLL: an anchored popover shouldn't be left floating
  // misaligned when the content moves. capture:true because scroll does NOT
  // bubble — with capture it also catches that of inner containers.
  useEffect(() => {
    if (!open) return undefined;
    const close = () => setOpen(false);
    document.addEventListener("scroll", close, { capture: true, passive: true });
    return () =>
      document.removeEventListener("scroll", close, { capture: true });
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const handleKeydown = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKeydown);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKeydown);
    };
  }, [open]);

  const handleSelect = (reaction) => {
    onSelect?.(reaction);
    setOpen(false);
  };

  return (
    <div className={styles.wrapper} ref={ref}>
      <button
        ref={triggerRef}
        type="button"
        className={
          isAction
            ? `${styles.trigger} ${styles.triggerAction} ${
                activeReaction ? styles.triggerActionActive : ""
              }`
            : `${styles.trigger} ${open ? styles.triggerOpen : ""}`
        }
        onClick={() => setOpen(!open)}
        aria-label={t("post.addReaction")}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {isAction ? (
          activeReaction ? (
            <>
              <span className={styles.triggerEmoji}>
                <ReactionEmoji name={activeReaction.id} size={16} />
              </span>
              <span className={styles.triggerLabel}>
                {t(activeReaction.labelKey)}
              </span>
            </>
          ) : (
            <>
              <svg
                className={styles.triggerIcon}
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                <line x1="9" y1="9" x2="9.01" y2="9" />
                <line x1="15" y1="9" x2="15.01" y2="9" />
              </svg>
              <span className={styles.triggerLabel}>{t("post.react")}</span>
            </>
          )
        ) : (
          "+"
        )}
      </button>

      {open && (
        <div
          className={styles.popover}
          role="menu"
          ref={popoverRef}
          style={{ left: BASE_LEFT_OFFSET + shiftX }}
        >
          {REACTIONS.map((r) => (
            <button
              key={r.id}
              type="button"
              className={cx(styles.option, currentReactionEmoji === r.emoji ? styles.optionActive : "")}
              onClick={() => handleSelect(r)}
              role="menuitem"
              aria-label={t(r.labelKey)}
            >
              <span className={styles.tooltip}>{t(r.labelKey)}</span>
              {/* Animated (FB-style loop) while the popover is open. */}
              <span className={styles.emoji}>
                <ReactionEmoji name={r.id} size={26} animated />
              </span>
            </button>
          ))}
          {/* Chat-bubble-style little tail, pointing toward the '+' (below —
              the popover opens above the button). Its left is computed
              against the trigger's center, so it keeps pointing even with a
              shift. */}
          <span
            className={styles.tail}
            style={{ left: tailX }}
            aria-hidden="true"
          />
        </div>
      )}
    </div>
  );
}

export default PostReactionPicker;

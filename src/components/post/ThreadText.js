import { useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import styles from "../../styles/components/post/ThreadText.module.css";

// Lines shown before truncating (Twitter-style "show more"). ~7 reads well
// across feed/search/thread without dominating the card.
const DEFAULT_LINES = 7;

/**
 * Thread text with a line-clamp "show more / show less" (expands in place).
 * Centralized so feed, search and the thread view (head + replies) behave the
 * same. The clamp is purely visual — the rendered content (hashtags/mentions)
 * is untouched. The toggle only appears when the text actually overflows.
 *
 * Props:
 *   - text:      raw string (used as the measure dependency on change)
 *   - className: the caller's text style (font/color/line-height); the clamp is
 *                layered on top
 *   - lines:     clamp line count (default 7)
 *   - children:  the rendered text (e.g. renderTextWithHashtags(...))
 */
function ThreadText({ text, className = "", lines = DEFAULT_LINES, children }) {
  const { t } = useTranslation();
  const ref = useRef(null);
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    // Overflow is only measurable while clamped (collapsed). Once we know it
    // overflows, the toggle stays so "show less" can collapse it again.
    const measure = () => {
      if (!expanded) setOverflowing(el.scrollHeight > el.clientHeight + 1);
    };
    measure();
    let observer;
    if (typeof ResizeObserver !== "undefined") {
      // Re-measure on width changes / font load (cheap; fires only on resize).
      observer = new ResizeObserver(measure);
      observer.observe(el);
    }
    return () => {
      if (observer) observer.disconnect();
    };
  }, [text, expanded]);

  return (
    <>
      <p
        ref={ref}
        className={`${className} ${expanded ? "" : styles.clamp}`}
        style={expanded ? undefined : { "--clamp-lines": lines }}
      >
        {children}
      </p>
      {overflowing && (
        <button
          type="button"
          className={styles.toggle}
          aria-expanded={expanded}
          onClick={(e) => {
            // Don't trigger the card's navigation when toggling inside a feed card.
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
        >
          {expanded ? t("common.showLess") : t("common.showMore")}
        </button>
      )}
    </>
  );
}

export default ThreadText;

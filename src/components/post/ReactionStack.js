import { useTranslation } from "react-i18next";
import ReactionEmoji from "./ReactionEmoji";
import { REACTIONS } from "./PostReactionPicker";
import { formatCount } from "../home/homeHelpers";
import styles from "../../styles/components/post/ReactionStack.module.css";
import cx from "../../utils/cx";

// How many distinct reaction emojis to show in the overlapping cluster before
// the total takes over (Facebook-style summary). The rest still count toward
// the number.
const MAX_EMOJIS = 3;

// Canonical rank per reaction name (the picker's display order) — the
// deterministic TIE-BREAK. Unknown names sink to the end (still shown).
const CATALOG_RANK = new Map(REACTIONS.map((r, i) => [r.id, i]));
const catalogRank = (r) =>
  CATALOG_RANK.has(r.name) ? CATALOG_RANK.get(r.name) : REACTIONS.length;

/**
 * Facebook-style reaction summary: a small cluster of the most-used reaction
 * emojis (overlapping bubbles) + the total reaction count. Display-only — the
 * reacting itself happens through PostReactionPicker. Reused by the feed card,
 * the OP head and each reply, so the cluster looks identical everywhere.
 *
 * Renders nothing when there are no reactions.
 */
function ReactionStack({ reactions = [], className = "" }) {
  const { t } = useTranslation();

  const present = reactions.filter((r) => (r.count ?? 0) > 0);
  if (present.length === 0) return null;

  const total = present.reduce((sum, r) => sum + (r.count || 0), 0);
  // Most-used first → the cluster leads with the dominant reaction (FB-style).
  // Ties break by the CANONICAL catalog order, never by payload order: the
  // feed and the thread view ship the same reactions in different orders, so
  // a stable sort alone made the cluster's last bubble flip between screens.
  const ordered = [...present].sort(
    (a, b) => (b.count || 0) - (a.count || 0) || catalogRank(a) - catalogRank(b)
  );
  const top = ordered.slice(0, MAX_EMOJIS);

  // Accessible / hover summary: "Laugh 2 · Angry 2 · Applause 1" — the same
  // deterministic order as the bubbles.
  const summary = ordered
    .map((r) => `${t(`reactions.${r.name}`, { defaultValue: r.name })} ${r.count}`)
    .join(" · ");

  return (
    <span
      className={cx(styles.stack, className)}
      title={summary}
      aria-label={summary}
    >
      <span className={styles.emojis} aria-hidden="true">
        {top.map((r, i) => (
          <span
            key={r.emoji}
            className={styles.bubble}
            // Leftmost (dominant) bubble paints on top of the ones behind it.
            style={{ zIndex: top.length - i }}
          >
            {/* Thiup's own drawn reaction (falls back to the raw char for
                unknown names, so new backend reactions never break). */}
            <ReactionEmoji name={r.name} emoji={r.emoji} size={16} />
          </span>
        ))}
      </span>
      <span className={styles.total}>{formatCount(total)}</span>
    </span>
  );
}

export default ReactionStack;

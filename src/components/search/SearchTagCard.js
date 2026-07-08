import React from "react";
import { useTranslation } from "react-i18next";
import TagSparkline from "./TagSparkline";
import { splitByMatch } from "../../utils/matchText";
import styles from "../../styles/components/search/SearchTagCard.module.css";

/**
 * Card for a tag in the 'Tags' tab of SearchNew query mode.
 * `activityMax` = global maximum across the visible tags → shared scale of
 * the sparklines (heights comparable across tags).
 */
/**
 * variant:
 *   "result"     (default) — Tags tab row: sparkline + full-bleed divider.
 *   "suggestion" — search-landing trending row (Threads' suggestion anatomy):
 *                  INSET divider starting after the tile, NO sparkline (the
 *                  landing has no comparable series — the mock would read as
 *                  real data).
 */
function SearchTagCard({
  tag,
  activityMax,
  highlightQuery,
  onClick,
  variant = "result",
  rank,
}) {
  const { t } = useTranslation();
  const isSuggestion = variant === "suggestion";
  return (
    <button
      type="button"
      className={`${styles.card} ${isSuggestion ? styles.cardSuggestion : ""}`}
      onClick={onClick}
    >
      {/* Trending rank — the list IS ordered, so the numeral carries real
          information (not decoration). Top 3 in the brand accent. */}
      {rank != null && (
        <span
          className={`${styles.rank} ${rank <= 3 ? styles.rankTop : ""}`}
          aria-hidden="true"
        >
          {rank}
        </span>
      )}
      {/* Leading tile — the tag's "avatar": warm-tint squircle with a
          terracotta # (the app's chip/tag family), sized like the 36px
          identity lane so tag rows rhyme with user/post rows. */}
      <span className={styles.tagTile} aria-hidden="true">
        #
      </span>
      <span className={styles.info}>
        <span className={styles.tagName}>
          {/* NO leading '#' here — the tile already carries it (a doubled
              "# #tag" read broken). The query arrives without its leading '#'
              too (stripped in SearchNew — tag-intent syntax), so highlighting
              runs over the bare name: 'tor' marks 'tor' inside 'historia'. */}
          {renderHighlighted(tag.name, highlightQuery, styles.highlight)}
        </span>
        <span className={styles.count}>
          {tag.postsCount} {t("profile.posts")}
        </span>
      </span>
      {!isSuggestion && (
        <span className={styles.spark}>
          {/* data = real series (posts/day); seed = mock fallback if absent */}
          <TagSparkline
            data={tag.activity}
            maxValue={activityMax}
            seed={tag.name}
          />
        </span>
      )}
      {isSuggestion && (
        /* Quiet launch affordance: tapping a trend RUNS that search. */
        <span className={styles.launchArrow} aria-hidden="true">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M7 17 17 7" />
            <path d="M9 7h8v8" />
          </svg>
        </span>
      )}
    </button>
  );
}

// Accent- and case-insensitive (mirror of the backend's unaccent): searching
// 'peru' highlights 'perú'. Always shows the original text.
function renderHighlighted(text, query, className) {
  if (!query || !text) return text;
  return splitByMatch(text, query).map((segment, idx) =>
    segment.match ? (
      <mark key={idx} className={className}>
        {segment.text}
      </mark>
    ) : (
      <React.Fragment key={idx}>{segment.text}</React.Fragment>
    )
  );
}

export default SearchTagCard;

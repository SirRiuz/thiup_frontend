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
function SearchTagCard({ tag, activityMax, highlightQuery, onClick }) {
  const { t } = useTranslation();
  return (
    <button type="button" className={styles.card} onClick={onClick}>
      <span className={styles.tagChip}>
        {/* Highlight over the FULL '#name' so splitByMatch handles the '#'
            offset. The query arrives without its leading '#' (stripped in
            SearchNew — tag-intent syntax, not part of the term), so 'tor' and
            '#tor' both mark 'tor' inside '#tor' AND inside '#historia'. */}
        {renderHighlighted(`#${tag.name}`, highlightQuery, styles.highlight)}
      </span>
      <span className={styles.count}>
        {tag.postsCount} {t("profile.posts")}
      </span>
      <span className={styles.spark}>
        {/* data = real series (posts/day); seed = mock fallback if absent */}
        <TagSparkline
          data={tag.activity}
          maxValue={activityMax}
          seed={tag.name}
        />
      </span>
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

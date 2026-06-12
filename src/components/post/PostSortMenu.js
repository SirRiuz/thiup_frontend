import { useTranslation } from "react-i18next";
import styles from "../../styles/components/post/PostSortMenu.module.css";

const OPTIONS = ["trending", "newest", "oldest"];
const OPTION_I18N = {
  trending: "post.sortTrending",
  newest: "post.sortNewest",
  oldest: "post.sortOldest",
};

function PostSortMenu({ value, onChange, isLoading = false }) {
  const { t } = useTranslation();
  const handleClick = (option) => {
    if (isLoading) return;
    // Re-clicking the active option DOES refetch (selectSort always fires),
    // same as HomeFilterBar/FeedContext — it's not a no-op.
    onChange?.(option);
  };

  return (
    <div className={styles.menu} role="tablist">
      <span className={styles.label}>{t("post.sort")}</span>
      {OPTIONS.map((option) => {
        const isActive = value === option;
        const isDisabled = isLoading && !isActive;
        const tabClass = `${styles.tab} ${isActive ? styles.tabActive : ""} ${
          isDisabled ? styles.tabDisabled : ""
        }`;
        return (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-disabled={isDisabled}
            className={tabClass}
            onClick={() => handleClick(option)}
          >
            <span>{t(OPTION_I18N[option])}</span>
            {isLoading && isActive && (
              <span className={styles.tabSpinner} aria-hidden="true" />
            )}
          </button>
        );
      })}
    </div>
  );
}

export default PostSortMenu;

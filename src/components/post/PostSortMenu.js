import styles from "../../styles/components/post/PostSortMenu.module.css";

const OPTIONS = ["trending", "newest", "oldest"];

function PostSortMenu({ value, onChange, isLoading = false }) {
  const handleClick = (option) => {
    if (isLoading) return;
    // Re-clickear la opción activa SÍ refetchea (selectSort siempre dispara),
    // igual que HomeFilterBar/FeedContext — no es no-op.
    onChange?.(option);
  };

  return (
    <div className={styles.menu} role="tablist">
      <span className={styles.label}>sort</span>
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
            <span>{option}</span>
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

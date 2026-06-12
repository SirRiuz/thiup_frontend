import { useTranslation } from "react-i18next";
import styles from "../../styles/components/post/PostLoadMoreButton.module.css";

/**
 * Pagination trigger for the replies list. Stateless on purpose — the parent
 * owns the loading flag and swaps this button for skeletons while a fetch is
 * in flight, then re-renders the button when there is still more to load.
 *
 * Props:
 *   - onClick: handler that kicks off the next batch fetch
 *   - label: optional override (default: el "load more replies" traducido)
 */
function PostLoadMoreButton({ onClick, label }) {
  const { t } = useTranslation();
  return (
    <div className={styles.wrapper}>
      <button type="button" className={styles.button} onClick={onClick}>
        <span>{label || t("post.loadMoreReplies")}</span>
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={styles.icon}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
    </div>
  );
}

export default PostLoadMoreButton;

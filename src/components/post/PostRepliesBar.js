import { useTranslation } from "react-i18next";
import PostSortMenu from "./PostSortMenu";
import styles from "../../styles/components/post/PostRepliesBar.module.css";

// Threads' EXACT left chevron (filled path lifted verbatim, 12px), pointed
// right by the same rotate(180deg) Threads uses on this control.
const ActivityChevron = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M14.293 3.29297C14.6835 2.90245 15.3165 2.90245 15.707 3.29297C16.0976 3.68349 16.0976 4.31651 15.707 4.70703L8.41406 12L15.707 19.293C16.0976 19.6835 16.0976 20.3165 15.707 20.707C15.3165 21.0976 14.6835 21.0976 14.293 20.707L6.29297 12.707C5.90245 12.3165 5.90245 11.6835 6.29297 11.293L14.293 3.29297Z" />
  </svg>
);

// Threads' exact bar between the parent thread and its replies: the sort
// dropdown (Top / Recent) on the left, "View activity" on the right. The
// activity view is a PLACEHOLDER (same policy as the nav's Create +): visual
// only, no behavior until the backend ships reaction/reply activity.
function PostRepliesBar({ sortValue, onSortChange, isLoading = false }) {
  const { t } = useTranslation();

  return (
    <div className={styles.bar}>
      <PostSortMenu
        value={sortValue}
        onChange={onSortChange}
        isLoading={isLoading}
      />
      <button type="button" className={styles.activity}>
        {t("post.viewActivity")}
        <span className={styles.activityChevron}>
          <ActivityChevron />
        </span>
      </button>
    </div>
  );
}

export default PostRepliesBar;

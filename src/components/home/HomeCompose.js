import { useTranslation } from "react-i18next";
import MaskAvatar from "../MaskAvatar";
import { useCompose } from "../../contexts/ComposeContext";
import styles from "../../styles/components/home/HomeCompose.module.css";

/**
 * HomeCompose — Threads' exact quiet compose row (desktop-only, top of the
 * home feed): avatar (36) · "What's new?" prompt · bordered Post button.
 *
 * The row is ONLY an entry point now: both the prompt and the Post button
 * open the global ComposeModal (same dialog as the nav "+"). The old inline
 * expanded composer moved into that modal.
 */
function HomeCompose({ currentUserMask }) {
  const { t } = useTranslation();
  const { openCompose } = useCompose();

  return (
    <div className={styles.collapsedRow}>
      <span className={styles.collapsedAvatar} aria-hidden="true">
        {currentUserMask ? (
          <MaskAvatar seed={currentUserMask.id} size={36} />
        ) : (
          <span className={styles.avatarGhost} />
        )}
      </span>
      <button
        type="button"
        className={styles.collapsedPrompt}
        onClick={openCompose}
      >
        {t("compose.placeholder")}
      </button>
      <button
        type="button"
        className={styles.collapsedPost}
        onClick={openCompose}
      >
        {t("compose.post")}
      </button>
    </div>
  );
}

export default HomeCompose;

import { useTranslation } from "react-i18next";
import MaskAvatar from "../MaskAvatar";
import DropZoneOverlay from "../media/DropZoneOverlay";
import useFileDrop from "../../hooks/useFileDrop";
import { useCompose } from "../../contexts/ComposeContext";
import styles from "../../styles/components/home/HomeCompose.module.css";

/**
 * HomeCompose — Threads' exact quiet compose row (desktop-only, top of the
 * home feed): avatar (36) · "What's new?" prompt · bordered Post button.
 *
 * The row is ONLY an entry point now: both the prompt and the Post button
 * open the global ComposeModal (same dialog as the nav "+"). The old inline
 * expanded composer moved into that modal.
 *
 * Also a drop target: dragging a file straight onto this row opens
 * ComposeModal with it already attached (staged via ComposeContext's
 * pendingFiles — see ComposeModal's own consume-on-open effect), reusing
 * the exact same drag-highlight (DropZoneOverlay) and validated attach
 * pipeline the modal's own drop zone already uses. No validation happens
 * here — the raw FileList is handed off as-is; ComposeModal's attachFiles
 * rejects anything unsupported the same way it does for the picker/paste.
 */
function HomeCompose({ currentUserMask }) {
  const { t } = useTranslation();
  const { openCompose } = useCompose();
  const { isDragging, dropProps } = useFileDrop({
    onFiles: (files) => openCompose(files),
  });

  return (
    <div className={styles.collapsedRow} {...dropProps}>
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
        onClick={() => openCompose()}
      >
        {t("compose.placeholder")}
      </button>
      <button
        type="button"
        className={styles.collapsedPost}
        onClick={() => openCompose()}
      >
        {t("compose.post")}
      </button>
      <DropZoneOverlay active={isDragging} />
    </div>
  );
}

export default HomeCompose;

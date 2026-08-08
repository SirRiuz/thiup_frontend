import { useState } from "react";
import { useTranslation } from "react-i18next";
import EditHistoryModal from "./EditHistoryModal";
import { fullDateTitle } from "../../utils/formatDate";
import cx from "../../utils/cx";
import styles from "../../styles/components/post/EditedTag.module.css";

/**
 * The "· Edited" meta tag, shared by every surface that shows it (OP,
 * replies, ancestor chain, feed cards + the topReply preview). It IS the
 * entry point to the edit-history modal now — no separate "Edit history"
 * menu item exists anymore. A plain button (hover gets the app's usual
 * link-style underline via each caller's own CSS, same as .maskId:hover)
 * so it reads as clickable without a new visual language.
 *
 * `post` is whatever EditHistoryModal needs (post.uid + post.mask) — each
 * caller already has the right shape at hand (the OP/reply post object, an
 * ancestor node, or the feed card's post/topReply).
 */
function EditedTag({ post, editedAt, language, className, dividerClassName }) {
  const { t } = useTranslation();
  const [historyOpen, setHistoryOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={cx(className, styles.trigger)}
        onClick={(e) => {
          e.stopPropagation();
          setHistoryOpen(true);
        }}
        title={fullDateTitle(editedAt, language)}
      >
        <span className={dividerClassName} aria-hidden="true">
          ·
        </span>
        {/* Own span so the hover underline (see .trigger:hover .label)
            decorates ONLY this word, never the divider glyph above. */}
        <span className={styles.label}>{t("post.edited")}</span>
      </button>

      {historyOpen && (
        <EditHistoryModal post={post} onClose={() => setHistoryOpen(false)} />
      )}
    </>
  );
}

export default EditedTag;

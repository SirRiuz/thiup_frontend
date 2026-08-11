import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import BottomSheet from "../BottomSheet";
import MenuSurface, { menuStyles } from "../menu/MenuSurface";
import useMenuVerticalFlip from "../../hooks/useMenuVerticalFlip";
import { useIsMobile } from "../../hooks/useIsMobile";
import styles from "../../styles/components/compose/PostOptionsPanel.module.css";
import cx from "../../utils/cx";

/* Outline "lock" (Feather-style, matches the app's 1.5-stroke icon set). */
const LockIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
);
/* Outline clock w/ a small burst mark — reads as "ephemeral / timed". */
const SnapIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="13" r="8" />
    <path d="M12 9v4l3 2" />
    <path d="M9 2h6" />
  </svg>
);
/* Speech bubble with a slash — "comments off". */
const RepliesOffIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h5" />
    <path d="M16 2v6" />
    <path d="M13 5h6" />
    <line x1="4" y1="20" x2="20" y2="4" />
  </svg>
);
/* Threads' EXACT "Checkmark: selected" glyph (see PostSortMenu). */
const Check = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
    <path d="M20.293 5.29297C20.6835 4.90245 21.3165 4.90245 21.707 5.29297C22.0975 5.68349 22.0975 6.31651 21.707 6.70703L9.70702 18.707C9.31649 19.0976 8.68348 19.0976 8.29295 18.707L2.29295 12.707C1.90243 12.3165 1.90243 11.6835 2.29295 11.293C2.65907 10.9269 3.23807 10.9043 3.63084 11.2246L3.70702 11.293L8.99999 16.5859L20.293 5.29297Z" />
  </svg>
);

/**
 * PostOptionsPanel — the shared dropdown for the three creation/edit-time
 * thread controls (Private / Snap / Disable replies), opened from a "Post
 * options" toolbar button in ComposeModal and PostEditModal. Same anchored-
 * popover (desktop) / bottom-sheet (mobile) dual presentation as
 * PostOptionsMenu, same checkbox-row convention as PostSortMenu (a
 * `menuStyles.item` row + Threads' trailing check, kept in layout via
 * `visibility` so rows never shift) — but `role="menuitemcheckbox"` since
 * every row here toggles independently instead of selecting one of a set.
 *
 * `anchorRef` is the CALLER's own toolbar button (so this panel only owns
 * the floating surface, not the trigger — the trigger matches the other
 * footer tool buttons visually). `showSnap=false` hides the Snap row
 * entirely (PostEditModal) rather than disabling it — the flag is
 * immutable once set, so there is no "editable but greyed out" state, it
 * simply isn't offered there at all.
 */
function PostOptionsPanel({
  open,
  onClose,
  anchorRef,
  isPrivate,
  onIsPrivateChange,
  isSnap,
  onIsSnapChange,
  showSnap = true,
  repliesDisabled,
  onRepliesDisabledChange,
}) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [pos, setPos] = useState(null);
  const menuRef = useRef(null);
  const openUpTop = useMenuVerticalFlip({
    open: open && !isMobile,
    triggerRef: anchorRef,
    menuRef,
  });

  // Measure the trigger the moment the panel opens (desktop only — the
  // mobile sheet needs no anchoring).
  useEffect(() => {
    if (!open || isMobile) {
      setPos(null);
      return;
    }
    const r = anchorRef.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 6, right: window.innerWidth - r.right });
  }, [open, isMobile, anchorRef]);

  const close = () => {
    onClose();
    anchorRef.current?.focus();
  };

  // Desktop: click-outside / Escape / close-on-scroll. Escape is eaten in
  // CAPTURE phase (same pattern as MediaViewer/DiscardDialog) so it closes
  // ONLY this panel, never bubbling into the host dialog's own Escape
  // handler (which would otherwise also fire the discard-confirm flow).
  useEffect(() => {
    if (!open || isMobile) return undefined;
    const onDown = (e) => {
      if (anchorRef.current?.contains(e.target)) return;
      if (menuRef.current?.contains(e.target)) return;
      onClose();
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        close();
      }
    };
    const closeScroll = () => onClose();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey, { capture: true });
    document.addEventListener("scroll", closeScroll, { capture: true, passive: true });
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey, { capture: true });
      document.removeEventListener("scroll", closeScroll, { capture: true });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isMobile]);

  useEffect(() => {
    if (open && !isMobile) {
      menuRef.current?.querySelector("[role='menuitemcheckbox']")?.focus();
    }
  }, [open, isMobile]);

  if (!open) return null;

  const rows = (itemClass, iconClass) => (
    <>
      <button
        type="button"
        role="menuitemcheckbox"
        aria-checked={isPrivate}
        className={itemClass}
        onClick={() => onIsPrivateChange(!isPrivate)}
      >
        <span className={iconClass}>
          <LockIcon />
        </span>
        {t("postOptions.private")}
        <span
          className={cx(menuStyles.itemIcon, menuStyles.itemIconRight, styles.check, isPrivate ? styles.checkVisible : "")}
          aria-hidden="true"
        >
          <Check />
        </span>
      </button>
      {isPrivate && <p className={styles.warning}>{t("post.privateBadgeHint")}</p>}

      {showSnap && (
        <>
          <button
            type="button"
            role="menuitemcheckbox"
            aria-checked={isSnap}
            className={itemClass}
            onClick={() => onIsSnapChange(!isSnap)}
          >
            <span className={iconClass}>
              <SnapIcon />
            </span>
            {t("postOptions.snap")}
            <span
              className={cx(menuStyles.itemIcon, menuStyles.itemIconRight, styles.check, isSnap ? styles.checkVisible : "")}
              aria-hidden="true"
            >
              <Check />
            </span>
          </button>
          {isSnap && <p className={styles.warning}>{t("postOptions.snapHint")}</p>}
        </>
      )}

      <button
        type="button"
        role="menuitemcheckbox"
        aria-checked={repliesDisabled}
        className={itemClass}
        onClick={() => onRepliesDisabledChange(!repliesDisabled)}
      >
        <span className={iconClass}>
          <RepliesOffIcon />
        </span>
        {t("postOptions.disableReplies")}
        <span
          className={cx(menuStyles.itemIcon, menuStyles.itemIconRight, styles.check, repliesDisabled ? styles.checkVisible : "")}
          aria-hidden="true"
        >
          <Check />
        </span>
      </button>
    </>
  );

  if (isMobile) {
    return (
      <BottomSheet onClose={onClose} ariaLabel={t("postOptions.title")}>
        <div className={styles.sheetTitle}>{t("postOptions.title")}</div>
        <div className={styles.sheetMenu} role="menu" aria-label={t("postOptions.title")}>
          {rows(styles.sheetItem, styles.sheetItemIcon)}
        </div>
      </BottomSheet>
    );
  }

  if (!pos) return null;

  return createPortal(
    <MenuSurface
      ref={menuRef}
      className={styles.desktopMenu}
      style={{
        position: "fixed",
        top: openUpTop ?? pos.top,
        right: pos.right,
        transformOrigin: openUpTop ? "bottom right" : "top right",
        // Both ComposeModal and PostEditModal (the two hosts) sit at
        // z-index 1100 — MenuSurface's own base (1000) would render this
        // panel BEHIND them. Inline so it always wins regardless of CSS
        // bundle order (see DiscardDialog's 1150 tier — same "floats above
        // its host modal" precedent).
        zIndex: 1150,
      }}
    >
      {rows(menuStyles.item, menuStyles.itemIcon)}
    </MenuSurface>,
    document.body
  );
}

export default PostOptionsPanel;

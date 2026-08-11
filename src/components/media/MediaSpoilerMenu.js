import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import MenuSurface, { menuStyles } from "../menu/MenuSurface";
import cx from "../../utils/cx";
import styles from "../../styles/components/media/MediaSpoilerMenu.module.css";

/* Threads' "More" three-dots (see PostOptionsMenu), at the tile's 14px. */
const DotsIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path
      clipRule="evenodd"
      fillRule="evenodd"
      d="M4 14C5.10457 14 6 13.1046 6 12C6 10.8954 5.10457 10 4 10C2.89543 10 2 10.8954 2 12C2 13.1046 2.89543 14 4 14ZM14 12C14 13.1046 13.1046 14 12 14C10.8954 14 10 13.1046 10 12C10 10.8954 10.8954 10 12 10C13.1046 10 14 10.8954 14 12ZM22 12C22 13.1046 21.1046 14 20 14C18.8954 14 18 13.1046 18 12C18 10.8954 18.8954 10 20 10C21.1046 10 22 10.8954 22 12Z"
    />
  </svg>
);
/* Threads' "Checkmark: selected" (see PostSortMenu/PostOptionsPanel). */
const Check = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
    <path d="M20.293 5.29297C20.6835 4.90245 21.3165 4.90245 21.707 5.29297C22.0975 5.68349 22.0975 6.31651 21.707 6.70703L9.70702 18.707C9.31649 19.0976 8.68348 19.0976 8.29295 18.707L2.29295 12.707C1.90243 12.3165 1.90243 11.6835 2.29295 11.293C2.65907 10.9269 3.23807 10.9043 3.63084 11.2246L3.70702 11.293L8.99999 16.5859L20.293 5.29297Z" />
  </svg>
);

/**
 * The tile-corner 3-dot menu (composer's PostScanResult / edit form's
 * ExistingMediaTile) with a single "Mark as spoiler" checkbox row — reuses
 * MenuSurface directly, never a bespoke popover. Portaled + fixed-positioned
 * from the trigger's own rect (like PostOptionsMenu): the tile has
 * `overflow:hidden` (it clips its own thumbnail), so an anchored
 * `position:absolute` panel would be clipped along with it.
 */
function MediaSpoilerMenu({ isSpoiler, onToggle, className }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const toggleOpen = (e) => {
    e.stopPropagation();
    if (open) {
      setOpen(false);
      return;
    }
    const r = triggerRef.current?.getBoundingClientRect();
    if (r) {
      // A single-row panel is short (~50px) — open below unless there's
      // clearly not enough room, then flip above.
      const openUp = window.innerHeight - r.bottom < 80;
      setPos(
        openUp
          ? { bottom: window.innerHeight - r.top + 4, left: r.left }
          : { top: r.bottom + 4, left: r.left }
      );
    }
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (triggerRef.current?.contains(e.target)) return;
      if (menuRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        close();
      }
    };
    const closeScroll = () => setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey, { capture: true });
    document.addEventListener("scroll", closeScroll, { capture: true, passive: true });
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey, { capture: true });
      document.removeEventListener("scroll", closeScroll, { capture: true });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={cx(styles.trigger, className)}
        onClick={toggleOpen}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("media.tileOptions")}
        title={t("media.tileOptions")}
      >
        <DotsIcon />
      </button>

      {open &&
        pos &&
        createPortal(
          <MenuSurface
            ref={menuRef}
            className={styles.menu}
            style={{
              position: "fixed",
              ...pos,
              // Opened from a tile inside ComposeModal/PostEditModal
              // (z-index 1100) — inline so it always floats above its host
              // regardless of CSS bundle order (see PostOptionsPanel).
              zIndex: 1150,
            }}
          >
            <button
              type="button"
              role="menuitemcheckbox"
              aria-checked={isSpoiler}
              className={menuStyles.item}
              onClick={(e) => {
                e.stopPropagation();
                onToggle(!isSpoiler);
                close();
              }}
            >
              {isSpoiler ? t("media.unmarkSpoiler") : t("media.markSpoiler")}
              <span
                className={cx(menuStyles.itemIcon, menuStyles.itemIconRight, styles.check, isSpoiler ? styles.checkVisible : "")}
                aria-hidden="true"
              >
                <Check />
              </span>
            </button>
          </MenuSurface>,
          document.body
        )}
    </>
  );
}

export default MediaSpoilerMenu;

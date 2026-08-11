import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import MenuSurface, { menuStyles } from "../menu/MenuSurface";
import styles from "../../styles/components/media/MediaContextMenu.module.css";

// Minimum gap between the menu and the viewport edges — same margin as
// PostSortMenu's viewport-fit clamp.
const VIEWPORT_MARGIN = 8;

// The viewer's own download glyph (lifted verbatim from MediaViewer's top
// button, so the menu row reads as the same action).
const DownloadIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3v12" />
    <path d="M7 10l5 5 5-5" />
    <path d="M5 21h14" />
  </svg>
);
// The app's canonical "copy" glyph (lifted verbatim from ThreadDetailsModal's
// copy-id pill, so every copy affordance in the app reads as the same icon).
const CopyIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V5a2 2 0 0 1 2-2h10" />
  </svg>
);
// The app's canonical "info" glyph (lifted verbatim from PostOptionsMenu's
// "View details" row).
const InfoIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9.5" />
    <path d="M12 11v5" />
    <path d="M12 7.5h.01" />
  </svg>
);
// Threads' EXACT "Copy link" glyph (lifted verbatim from PostOptionsMenu, so
// every "copy link" affordance in the app reads as the same icon), scaled to
// this menu's 18px rows.
const LinkIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M4.21806 9.21699C4.6086 8.82701 5.24177 8.82671 5.63212 9.21699C6.02227 9.60735 6.02206 10.2406 5.63212 10.6311L4.60282 11.6603C2.53307 13.7303 2.46839 17.0452 4.40849 19.1926L4.60282 19.3967L4.80693 19.591C6.95427 21.5317 10.2696 21.4666 12.3392 19.3967L13.3684 18.3674C13.7591 17.9773 14.3932 17.9779 14.7835 18.3684C15.1735 18.7589 15.1727 19.3921 14.7825 19.7824L13.7532 20.8117L13.7522 20.8107C10.8349 23.7283 6.10597 23.7285 3.18876 20.8107C0.270964 17.8934 0.271164 13.1641 3.18876 10.2463L4.21806 9.21699Z" />
    <path d="M15.2933 7.29316C15.6838 6.90272 16.3168 6.90269 16.7073 7.29316C17.0976 7.68368 17.0977 8.31678 16.7073 8.70722L8.70732 16.7072C8.31688 17.0976 7.68379 17.0975 7.29325 16.7072C6.90274 16.3167 6.90276 15.6837 7.29325 15.2932L15.2933 7.29316Z" />
    <path d="M10.5247 2.92402C13.4571 0.273656 17.9845 0.362116 20.8108 3.18867L21.0765 3.46699C23.6409 6.30485 23.6406 10.6365 21.0765 13.4748L20.8108 13.7541L19.7825 14.7824C19.392 15.1726 18.7589 15.1728 18.3685 14.7824C17.9782 14.392 17.9783 13.7589 18.3685 13.3684L19.3968 12.34L19.5911 12.1359C21.4693 10.0573 21.4691 6.88499 19.5911 4.80683L19.3968 4.60273C17.3272 2.53299 14.0118 2.46786 11.8645 4.4084L11.6604 4.60273L10.6311 5.63203C10.2406 6.02207 9.60744 6.02225 9.21708 5.63203C8.82685 5.24151 8.82682 4.60742 9.21708 4.21699L10.2464 3.18867L10.5247 2.92402Z" />
  </svg>
);

/**
 * Custom right-click / long-press menu for the fullscreen media viewer —
 * replaces the browser's NATIVE context menu (which exposes "Inspect" and
 * other dev-tools entries) with just the actions relevant here: download
 * (both — same action as the viewer's own top button, offered here too so
 * it's reachable without reaching for it), copy the image itself (images
 * only), copy the file's direct link (both), and view details (both). The
 * canonical MenuSurface panel,
 * anchored at the (x, y) the contextmenu event fired at instead of a fixed
 * trigger — clamped on BOTH axes (a context menu can open near any screen
 * edge, unlike a button-anchored dropdown that only ever needs to clamp
 * horizontally).
 *
 * Escape is owned by MediaViewer's own document-capture keydown handler
 * (it already needs to shield the viewer itself from closing underneath any
 * open sub-layer) — this component only handles click-outside and scroll.
 */
function MediaContextMenu({
  x,
  y,
  canCopy,
  onDownload,
  onCopy,
  onCopyLink,
  onDetails,
  onClose,
}) {
  const { t } = useTranslation();
  const menuRef = useRef(null);
  const [pos, setPos] = useState({ top: y, left: x, ready: false });

  // Measure vs the viewport BEFORE paint (no flash) and clamp both axes.
  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;
    const maxLeft = window.innerWidth - VIEWPORT_MARGIN - menu.offsetWidth;
    const maxTop = window.innerHeight - VIEWPORT_MARGIN - menu.offsetHeight;
    setPos({
      left: Math.max(VIEWPORT_MARGIN, Math.min(x, maxLeft)),
      top: Math.max(VIEWPORT_MARGIN, Math.min(y, maxTop)),
      ready: true,
    });
    // Re-measures only when a NEW menu opens (a fresh x/y) — not on every
    // parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [x, y]);

  useEffect(() => {
    menuRef.current?.querySelector("[role='menuitem']")?.focus();
  }, []);

  // Click-outside and scroll dismiss (same rules as PostSortMenu's anchored
  // dropdown — an anchored menu must not float misaligned once content moves).
  useEffect(() => {
    const onDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) onClose();
    };
    const onScroll = () => onClose();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("scroll", onScroll, { capture: true });
    };
  }, [onClose]);

  return createPortal(
    <MenuSurface
      ref={menuRef}
      className={styles.menu}
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        visibility: pos.ready ? "visible" : "hidden",
      }}
    >
      <button
        type="button"
        role="menuitem"
        className={menuStyles.item}
        onClick={onDownload}
      >
        <span className={menuStyles.itemIcon}>
          <DownloadIcon />
        </span>
        {t("media.viewer.download")}
      </button>
      {canCopy && (
        <button
          type="button"
          role="menuitem"
          className={menuStyles.item}
          onClick={onCopy}
        >
          <span className={menuStyles.itemIcon}>
            <CopyIcon />
          </span>
          {t("media.contextMenu.copyImage")}
        </button>
      )}
      <button
        type="button"
        role="menuitem"
        className={menuStyles.item}
        onClick={onCopyLink}
      >
        <span className={menuStyles.itemIcon}>
          <LinkIcon />
        </span>
        {t("media.contextMenu.copyLink")}
      </button>
      <button
        type="button"
        role="menuitem"
        className={menuStyles.item}
        onClick={onDetails}
      >
        <span className={menuStyles.itemIcon}>
          <InfoIcon />
        </span>
        {t("media.contextMenu.viewDetails")}
      </button>
    </MenuSurface>,
    document.body
  );
}

export default MediaContextMenu;

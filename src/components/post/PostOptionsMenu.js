import { Fragment, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import BottomSheet from "../BottomSheet";
import ThreadDetailsModal from "./ThreadDetailsModal";
import ReportModal from "./ReportModal";
import { useIsMobile } from "../../hooks/useIsMobile";
import { useToast } from "../../contexts/ToastContext";
import MenuSurface, { menuStyles } from "../menu/MenuSurface";
import styles from "../../styles/components/post/PostOptionsMenu.module.css";
import cx from "../../utils/cx";

/**
 * Three-dots options menu for a post card (feed + search) AND for replies in
 * the thread view. Responsive: an anchored popover on desktop, a bottom sheet
 * on mobile — SAME content, two presentations. Touch-friendly trigger (≥44px).
 * "Copy link" copies the node's own permalink `/p/<id>` — for a reply that
 * URL opens the Threads-style comment permalink (ancestor chain + the reply
 * as head + its replies).
 */

// Threads' exact "More" glyph (20×20, r=2 dots at cx 4/12/20 — bigger and wider
// spread than the old r=1.7 at cx 5/12/19).
const MoreIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path
      clipRule="evenodd"
      fillRule="evenodd"
      d="M4 14C5.10457 14 6 13.1046 6 12C6 10.8954 5.10457 10 4 10C2.89543 10 2 10.8954 2 12C2 13.1046 2.89543 14 4 14ZM14 12C14 13.1046 13.1046 14 12 14C10.8954 14 10 13.1046 10 12C10 10.8954 10.8954 10 12 10C13.1046 10 14 10.8954 14 12ZM22 12C22 13.1046 21.1046 14 20 14C18.8954 14 18 13.1046 18 12C18 10.8954 18.8954 10 20 10C21.1046 10 22 10.8954 22 12Z"
    />
  </svg>
);
const InfoIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9.5" />
    <path d="M12 11v5" />
    <path d="M12 7.5h.01" />
  </svg>
);
/* Threads' EXACT "Copy link" glyph (their 20px filled chain, lifted verbatim). */
const LinkIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M4.21806 9.21699C4.6086 8.82701 5.24177 8.82671 5.63212 9.21699C6.02227 9.60735 6.02206 10.2406 5.63212 10.6311L4.60282 11.6603C2.53307 13.7303 2.46839 17.0452 4.40849 19.1926L4.60282 19.3967L4.80693 19.591C6.95427 21.5317 10.2696 21.4666 12.3392 19.3967L13.3684 18.3674C13.7591 17.9773 14.3932 17.9779 14.7835 18.3684C15.1735 18.7589 15.1727 19.3921 14.7825 19.7824L13.7532 20.8117L13.7522 20.8107C10.8349 23.7283 6.10597 23.7285 3.18876 20.8107C0.270964 17.8934 0.271164 13.1641 3.18876 10.2463L4.21806 9.21699Z" />
    <path d="M15.2933 7.29316C15.6838 6.90272 16.3168 6.90269 16.7073 7.29316C17.0976 7.68368 17.0977 8.31678 16.7073 8.70722L8.70732 16.7072C8.31688 17.0976 7.68379 17.0975 7.29325 16.7072C6.90274 16.3167 6.90276 15.6837 7.29325 15.2932L15.2933 7.29316Z" />
    <path d="M10.5247 2.92402C13.4571 0.273656 17.9845 0.362116 20.8108 3.18867L21.0765 3.46699C23.6409 6.30485 23.6406 10.6365 21.0765 13.4748L20.8108 13.7541L19.7825 14.7824C19.392 15.1726 18.7589 15.1728 18.3685 14.7824C17.9782 14.392 17.9783 13.7589 18.3685 13.3684L19.3968 12.34L19.5911 12.1359C21.4693 10.0573 21.4691 6.88499 19.5911 4.80683L19.3968 4.60273C17.3272 2.53299 14.0118 2.46786 11.8645 4.4084L11.6604 4.60273L10.6311 5.63203C10.2406 6.02207 9.60744 6.02225 9.21708 5.63203C8.82685 5.24151 8.82682 4.60742 9.21708 4.21699L10.2464 3.18867L10.5247 2.92402Z" />
  </svg>
);
/* Threads' EXACT "Report" glyph (their 20px circle-! — lifted verbatim). */
const FlagIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12.001 15.0625C12.6223 15.0625 13.126 15.5662 13.126 16.1875C13.126 16.8088 12.6223 17.3125 12.001 17.3125C11.3798 17.3123 10.876 16.8087 10.876 16.1875C10.876 15.5663 11.3798 15.0627 12.001 15.0625Z" />
    <path d="M12.001 6.6875C12.5533 6.6875 13.001 7.13522 13.001 7.6875V12.4375C13.001 12.9898 12.5533 13.4375 12.001 13.4375C11.4489 13.4373 11.001 12.9897 11.001 12.4375V7.6875C11.001 7.13534 11.4489 6.6877 12.001 6.6875Z" />
    <path
      clipRule="evenodd"
      fillRule="evenodd"
      d="M12 1C18.0751 1 23 5.92488 23 12C23 13.6202 22.6483 15.1606 22.0176 16.5479L22.9834 21.8193C23.0425 22.1418 22.9403 22.4737 22.709 22.7061C22.4777 22.9383 22.1469 23.042 21.8242 22.9844L16.5117 22.0342C15.1338 22.6547 13.606 23 12 23C5.92488 23 1 18.0752 1 12C1 5.92481 5.92488 1 12 1ZM12 3C7.02944 3 3 7.02939 3 12C3 16.9706 7.02944 21 12 21C13.414 21 14.7495 20.6748 15.9375 20.0957L16.084 20.0381C16.2347 19.9922 16.3952 19.9818 16.5518 20.0098L20.7559 20.7617L19.9922 16.5928C19.9535 16.3815 19.9842 16.1634 20.0791 15.9707C20.6684 14.7742 21 13.4272 21 12C21 7.02944 16.9706 3 12 3Z"
    />
  </svg>
);

const SortIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M7 4v16M7 4 4 7M7 4l3 3" />
    <path d="M17 20V4M17 20l3-3M17 20l-3-3" />
  </svg>
);
const BackIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M15 18l-6-6 6-6" />
  </svg>
);
/* Threads' EXACT chevron (their 16px "Next" glyph, rotated to point right). */
const ChevronRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path
      transform="rotate(-90 12 12)"
      d="M20.70703 8.29297C21.09755 8.68349 21.09755 9.31651 20.70703 9.70703L12.707 17.707C12.3165 18.0976 11.6835 18.0976 11.293 17.707L3.293 9.70703C2.9024 9.31651 2.9024 8.68349 3.293 8.29297C3.6835 7.90245 4.3165 7.90245 4.707 8.29297L12 15.5859L19.29297 8.29297C19.68349 7.90245 20.31651 7.90245 20.70703 8.29297Z"
    />
  </svg>
);
const CheckIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m5 12 4.5 4.5L19 7" />
  </svg>
);

const ITEMS = [
  { key: "viewDetails", icon: <InfoIcon />, labelKey: "threadOptions.viewDetails" },
  { key: "copyLink", icon: <LinkIcon />, labelKey: "threadOptions.copyLink" },
  { key: "report", icon: <FlagIcon />, labelKey: "threadOptions.report", danger: true },
];

// Sort sub-menu options — same backend keys as the old PostSortMenu so the
// ordering logic (useThread.buildReplyOrdering) stays untouched.
const SORT_OPTIONS = [
  { value: "trending", labelKey: "post.sortTop" },
  { value: "newest", labelKey: "post.sortRecent" },
];

function PostOptionsMenu({
  post,
  variant = "card",
  className = "",
  sortValue,
  onSortChange,
}) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const showToast = useToast();
  const [open, setOpen] = useState(false);
  // Which sub-panel is showing inside the menu (Threads-style): null = root.
  const [submenu, setSubmenu] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const canSort = typeof onSortChange === "function";
  // Fixed coords for the (desktop) portaled popover, right-aligned to trigger.
  const [pos, setPos] = useState(null);
  const wrapperRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const toggle = (e) => {
    e.stopPropagation();
    if (open) {
      setOpen(false);
      return;
    }
    if (!isMobile) {
      const r = triggerRef.current?.getBoundingClientRect();
      if (r) setPos({ top: r.bottom + 6, right: window.innerWidth - r.right });
    }
    setOpen(true);
  };

  // Desktop popover only: click-outside / Escape / close-on-scroll. On mobile
  // the BottomSheet manages its own Escape, scrim and scroll lock.
  useEffect(() => {
    if (!open || isMobile) return undefined;
    const onDown = (e) => {
      // Popover is portaled to body — allow clicks in the trigger or the menu.
      if (wrapperRef.current?.contains(e.target)) return;
      if (menuRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") close();
    };
    const closeScroll = () => setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    document.addEventListener("scroll", closeScroll, { capture: true, passive: true });
    window.addEventListener("resize", closeScroll);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("scroll", closeScroll, { capture: true });
      window.removeEventListener("resize", closeScroll);
    };
  }, [open, isMobile]);

  // Focus the first item when the desktop popover opens (keyboard users).
  useEffect(() => {
    if (open && !isMobile) {
      menuRef.current?.querySelector("[role='menuitem']")?.focus();
    }
  }, [open, isMobile]);

  // Always return to the root panel when the menu closes.
  useEffect(() => {
    if (!open) setSubmenu(null);
  }, [open]);

  const handle = async (key) => {
    setOpen(false);
    if (key === "viewDetails") {
      setDetailsOpen(true);
      return;
    }
    if (key === "copyLink") {
      // Public thread URL — the canonical SHORT form (/p/:id; the legacy
      // /post/:id still redirects). The toast shows only a confirmation.
      const url = `${window.location.origin}/p/${post?.id || post?.uid || ""}`;
      try {
        await navigator.clipboard.writeText(url);
        // Copy confirmation: text only, no icon (cleaner, Threads-like).
        showToast({ type: "success", message: t("toast.linkCopied"), icon: "none" });
      } catch (e) {
        showToast({ type: "error", message: t("toast.linkCopyFailed") });
      }
      return;
    }
    if (key === "report") {
      setReportOpen(true);
    }
  };

  // Single source of the menu content; rendered in both presentations.
  // Shows the root items, or the Sort sub-panel when submenu === "sort"
  // (Threads-style: a ">" item opens it, a back row returns).
  // iconRight (desktop menu only): Threads' row anatomy — label on the left,
  // the glyph riding the right edge (their Save/Report/Copy-link rows). The
  // mobile sheet keeps the icon-first layout untouched.
  const renderItems = (
    itemClass,
    iconClass,
    dangerClass,
    dividerClass,
    iconRight = false
  ) => {
    if (submenu === "sort") {
      return (
        <>
          <button
            type="button"
            role="menuitem"
            className={itemClass}
            onClick={() => setSubmenu(null)}
          >
            <span className={iconClass}>
              <BackIcon />
            </span>
            {t("post.sort")}
          </button>
          {dividerClass && (
            <div className={dividerClass} role="separator" aria-hidden="true" />
          )}
          {SORT_OPTIONS.map((o) => {
            const active = o.value === sortValue;
            return (
              <button
                key={o.value}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                className={itemClass}
                onClick={() => {
                  onSortChange?.(o.value);
                  close();
                }}
              >
                <span className={iconClass}>{active ? <CheckIcon /> : null}</span>
                {t(o.labelKey)}
              </button>
            );
          })}
        </>
      );
    }

    // Root: optional "Sort" entry (only when sorting is wired) + the base items.
    const items = canSort
      ? [
          { key: "sort", icon: <SortIcon />, labelKey: "post.sort", submenu: true },
          ...ITEMS,
        ]
      : ITEMS;
    return items.map((it) => (
      <Fragment key={it.key}>
        {dividerClass && it.key === "report" && (
          <div className={dividerClass} role="separator" aria-hidden="true" />
        )}
        <button
          type="button"
          role="menuitem"
          aria-haspopup={it.submenu ? "menu" : undefined}
          className={cx(itemClass, it.danger ? dangerClass : "")}
          onClick={() => (it.submenu ? setSubmenu("sort") : handle(it.key))}
        >
          {!iconRight && <span className={iconClass}>{it.icon}</span>}
          {t(it.labelKey)}
          {it.submenu ? (
            /* Submenu rows always trail the chevron (Threads' Add-to-feed
               row) — on desktop it IS the row's right glyph. */
            <span style={{ marginLeft: "auto", display: "inline-flex", color: "#9b9591" }}>
              <ChevronRight />
            </span>
          ) : (
            iconRight && (
              <span className={cx(iconClass, menuStyles.itemIconRight)}>
                {it.icon}
              </span>
            )
          )}
        </button>
      </Fragment>
    ));
  };

  return (
    <div
      className={cx(styles.wrapper, variant === "card" ? styles.wrapperCard : styles.wrapperInline, className)}
      ref={wrapperRef}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        ref={triggerRef}
        type="button"
        className={cx(styles.trigger, "springPressIcon", open ? styles.triggerOpen : "")}
        onClick={toggle}
        aria-label={t("threadOptions.more")}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MoreIcon />
      </button>

      {/* Desktop: anchored popover (portaled, fixed-positioned). */}
      {open &&
        !isMobile &&
        pos &&
        createPortal(
          <MenuSurface
            ref={menuRef}
            style={{ position: "fixed", top: pos.top, right: pos.right }}
          >
            {renderItems(
              menuStyles.item,
              menuStyles.itemIcon,
              menuStyles.itemDanger,
              menuStyles.divider,
              true // desktop: Threads' label-left · icon-right rows
            )}
          </MenuSurface>,
          document.body
        )}

      {/* Mobile: bottom sheet (same content). */}
      {open && isMobile && (
        <BottomSheet onClose={close} ariaLabel={t("threadOptions.more")}>
          <div className={styles.sheetMenu} role="menu" aria-label={t("threadOptions.more")}>
            {renderItems(styles.sheetItem, styles.sheetItemIcon, styles.sheetItemDanger)}
          </div>
        </BottomSheet>
      )}

      {detailsOpen && (
        <ThreadDetailsModal post={post} onClose={() => setDetailsOpen(false)} />
      )}

      {reportOpen && (
        <ReportModal post={post} onClose={() => setReportOpen(false)} />
      )}
    </div>
  );
}

export default PostOptionsMenu;

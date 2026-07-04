import { Fragment, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import BottomSheet from "../BottomSheet";
import ThreadDetailsModal from "./ThreadDetailsModal";
import ReportModal from "./ReportModal";
import { useIsMobile } from "../../hooks/useIsMobile";
import { useToast } from "../../contexts/ToastContext";
import styles from "../../styles/components/post/PostOptionsMenu.module.css";

/**
 * Three-dots options menu for a post card (feed + search). Responsive: an
 * anchored popover on desktop, a bottom sheet on mobile — SAME content, two
 * presentations. Touch-friendly trigger (≥44px). Only "View details" is wired;
 * "Copy link" / "Report" are visible placeholders (no logic yet).
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
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9.5" />
    <path d="M12 11v5" />
    <path d="M12 7.5h.01" />
  </svg>
);
const LinkIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M10 13a5 5 0 0 0 7.07 0l3-3A5 5 0 0 0 13 3l-1 1" />
    <path d="M14 11a5 5 0 0 0-7.07 0l-3 3A5 5 0 0 0 11 21l1-1" />
  </svg>
);
const FlagIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
    <line x1="4" x2="4" y1="22" y2="15" />
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
const ChevronRight = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m9 6 6 6-6 6" />
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
  const renderItems = (itemClass, iconClass, dangerClass, dividerClass) => {
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
          className={`${itemClass} ${it.danger ? dangerClass : ""}`}
          onClick={() => (it.submenu ? setSubmenu("sort") : handle(it.key))}
        >
          <span className={iconClass}>{it.icon}</span>
          {t(it.labelKey)}
          {it.submenu && (
            <span style={{ marginLeft: "auto", display: "inline-flex", color: "#9b9591" }}>
              <ChevronRight />
            </span>
          )}
        </button>
      </Fragment>
    ));
  };

  return (
    <div
      className={`${styles.wrapper} ${
        variant === "card" ? styles.wrapperCard : styles.wrapperInline
      } ${className}`}
      ref={wrapperRef}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        ref={triggerRef}
        type="button"
        className={`${styles.trigger} springPressIcon ${
          open ? styles.triggerOpen : ""
        }`}
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
          <div
            className={styles.menu}
            role="menu"
            ref={menuRef}
            style={{ position: "fixed", top: pos.top, right: pos.right }}
          >
            {renderItems(styles.item, styles.itemIcon, styles.itemDanger, styles.divider)}
          </div>,
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

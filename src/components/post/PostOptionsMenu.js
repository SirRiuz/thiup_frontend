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

const MoreIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <circle cx="5" cy="12" r="1.7" />
    <circle cx="12" cy="12" r="1.7" />
    <circle cx="19" cy="12" r="1.7" />
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

const ITEMS = [
  { key: "viewDetails", icon: <InfoIcon />, labelKey: "threadOptions.viewDetails" },
  { key: "copyLink", icon: <LinkIcon />, labelKey: "threadOptions.copyLink" },
  { key: "report", icon: <FlagIcon />, labelKey: "threadOptions.report", danger: true },
];

function PostOptionsMenu({ post, variant = "card", className = "" }) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const showToast = useToast();
  const [open, setOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
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

  const handle = async (key) => {
    setOpen(false);
    if (key === "viewDetails") {
      setDetailsOpen(true);
      return;
    }
    if (key === "copyLink") {
      // Public thread URL. The toast shows only a confirmation — never the URL.
      const url = `${window.location.origin}/post/${post?.id || post?.uid || ""}/`;
      try {
        await navigator.clipboard.writeText(url);
        showToast({ type: "success", message: t("toast.linkCopied") });
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
  const renderItems = (itemClass, iconClass, dangerClass, dividerClass) =>
    ITEMS.map((it) => (
      <Fragment key={it.key}>
        {dividerClass && it.key === "report" && (
          <div className={dividerClass} role="separator" aria-hidden="true" />
        )}
        <button
          type="button"
          role="menuitem"
          className={`${itemClass} ${it.danger ? dangerClass : ""}`}
          onClick={() => handle(it.key)}
        >
          <span className={iconClass}>{it.icon}</span>
          {t(it.labelKey)}
        </button>
      </Fragment>
    ));

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
        className={`${styles.trigger} ${open ? styles.triggerOpen : ""}`}
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

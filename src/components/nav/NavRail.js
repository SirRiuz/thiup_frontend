import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LanguageModal from "./LanguageModal";
import WelcomeModal from "../WelcomeModal";
import BrandLogo from "../BrandLogo";
import { useKeyboardOpen } from "../../hooks/useKeyboardOpen";
import styles from "../../styles/components/nav/NavRail.module.css";

/**
 * Floating navigation rail (Threads style): capsule on the left on desktop,
 * bottom bar on mobile. Purely ADDITIVE — does not touch the screen content.
 *
 *  - Logo: dotted placeholder (same pattern as the splash), awaiting the new
 *    icon.
 *  - Icon-only items (Home/Search/My threads) with aria-label + CSS tooltip;
 *    the active one is marked with a warm blob (#f3e3d3 / #a85432) based on
 *    the route.
 *  - ⌘K / Ctrl+K (global shortcut, formerly for the home search bar, now
 *    removed) navigates to /search.
 *  - ☰ opens a PLACEHOLDER options menu (anchored popover, no libraries) just
 *    to see the placement.
 */

const NAV_ITEMS = [
  {
    to: "/home",
    labelKey: "nav.home",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5 9.5V21h5v-6h4v6h5V9.5" />
      </svg>
    ),
  },
  {
    to: "/search",
    labelKey: "nav.search",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <circle cx="11" cy="11" r="7.5" />
        <line x1="21" y1="21" x2="16.4" y2="16.4" />
      </svg>
    ),
  },
  {
    to: "/me",
    labelKey: "nav.myThreads",
    icon: (
      // Stack of layers — "my threads" as an own collection.
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3.5 20.5 8 12 12.5 3.5 8 12 3.5Z" />
        <path d="M3.5 12.5 12 17l8.5-4.5" />
        <path d="M3.5 17 12 21.5 20.5 17" />
      </svg>
    ),
  },
];

// Mobile bottom bar shows only Home + My threads (icon-only, no labels). Search
// lives in the mobile header (magnifier) and the ☰ menu also lives there — so
// the bottom bar stays to two primary destinations, Threads-style.
const BOTTOM_NAV_ITEMS = NAV_ITEMS.filter((item) => item.to !== "/search");
// Reused magnifier glyph for the mobile header search button.
const SEARCH_ICON = NAV_ITEMS.find((item) => item.to === "/search").icon;

// Last FULL URL visited for each rail screen (at module level: survives
// unmount). The item navigates to it instead of to the bare route → it
// returns to the SAME view (?q=/?tag= in Search, ?tab= in Home) and the
// scroll manager restores the position by exact URL match.
const lastUrlByItem = new Map();

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Active tab → scroll to top (Threads-style). INSTANT jump, never animated:
// smooth-scrolling the whole travelled distance causes motion sickness
// (vestibular) when the user is far down the feed. The page scrolls on the
// window (no shell scroll container); ScrollToTop's passive tracking picks
// up the resulting scroll event, so its saved positions stay correct.
const scrollPageToTop = () => window.scrollTo(0, 0);

// ☰ options menu (Languages / About). The SAME menu is used by the desktop
// rail and the mobile header — `variant` only changes the TRIGGER (rail item +
// tooltip vs. header icon button) and the menu's anchor direction. The dropdown
// markup, options and modals are identical (no duplication).
function MenuButton({ menuUp = false, variant = "rail" }) {
  const { t } = useTranslation();
  const isHeader = variant === "header";
  const [open, setOpen] = useState(false);
  // Language modal (opens from the "Languages" item of the menu).
  const [languageOpen, setLanguageOpen] = useState(false);
  // Welcome modal (re-opened from the "About" item of the menu).
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  // ANIMATED close: the exit class is applied first and the unmount happens
  // on animationend (not all at once). With reduced-motion the animation is
  // none (animationend never fires) → unmount directly.
  const [closing, setClosing] = useState(false);
  // Tooltip suppressed after the click, until the next mouseenter.
  const [tipOff, setTipOff] = useState(false);
  const wrapperRef = useRef(null);

  const closeMenu = () => {
    if (prefersReducedMotion()) {
      setOpen(false);
      setClosing(false);
      return;
    }
    setClosing(true);
  };

  const toggleMenu = () => {
    setTipOff(true);
    if (!open) {
      setOpen(true);
      setClosing(false);
    } else if (closing) {
      // Re-click during the close: reopen (cancels the exit).
      setClosing(false);
    } else {
      closeMenu();
    }
  };

  useEffect(() => {
    if (!open) return undefined;
    const handleClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        closeMenu();
      }
    };
    const handleKey = (e) => {
      if (e.key === "Escape") closeMenu();
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
    // closeMenu is stable in practice (only setters); deps by state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const isExpanded = open && !closing;

  return (
    <div className={styles.menuWrapper} ref={wrapperRef}>
      <button
        type="button"
        className={
          isHeader
            ? `${styles.appBarButton} springPressIcon`
            : `${styles.item} springPressIcon ${tipOff ? styles.tipOff : ""}`
        }
        aria-label={t("nav.menu")}
        aria-haspopup="menu"
        aria-expanded={isExpanded}
        onClick={toggleMenu}
        onMouseEnter={() => setTipOff(false)}
      >
        {isHeader ? (
          // Mobile header: refined ASYMMETRIC mark (Threads-style) — two thin
          // rounded bars, the bottom one shorter. Lighter than the rail's
          // 3-bar glyph; matches the search icon's 1.8 stroke + round caps.
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <line x1="4" y1="8" x2="20" y2="8" />
            <line x1="4" y1="16" x2="14" y2="16" />
          </svg>
        ) : (
          // Desktop rail: unchanged 3-bar glyph.
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="18" x2="20" y2="18" />
          </svg>
        )}
        {!isHeader && <span className={styles.tooltip}>{t("nav.menu")}</span>}
      </button>

      {open && (
        <div
          className={`${styles.menu} ${
            isHeader ? styles.menuDown : menuUp ? styles.menuUp : ""
          } ${closing ? styles.menuClosing : ""}`}
          role="menu"
          onAnimationEnd={() => {
            // Only the end of the EXIT animation unmounts (the entry one
            // also fires animationend).
            if (closing) {
              setOpen(false);
              setClosing(false);
            }
          }}
        >
          {/* REAL option: opens the UI language selection modal. */}
          <button
            type="button"
            role="menuitem"
            className={styles.menuItem}
            onClick={() => {
              closeMenu();
              setLanguageOpen(true);
            }}
          >
            {t("nav.languages")}
          </button>
          {/* REAL option: re-opens the welcome modal (greeting + rules). */}
          <button
            type="button"
            role="menuitem"
            className={styles.menuItem}
            onClick={() => {
              closeMenu();
              setWelcomeOpen(true);
            }}
          >
            {t("nav.about")}
          </button>
        </div>
      )}

      {languageOpen && (
        <LanguageModal onClose={() => setLanguageOpen(false)} />
      )}

      {welcomeOpen && (
        <WelcomeModal onClose={() => setWelcomeOpen(false)} />
      )}
    </div>
  );
}

function NavRail() {
  const { t } = useTranslation();
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  // On iOS the keyboard pushes a fixed bottom bar up on top of itself; hide it
  // while typing (it isn't usable then) and bring it back when the keyboard closes.
  const keyboardOpen = useKeyboardOpen();
  // Item whose tooltip is SUPPRESSED after a click (the pointer is still
  // over it → :hover would leave it stuck). It clears on the next mouseenter
  // — normal hover is not affected.
  const [tipOffItem, setTipOffItem] = useState(null);

  // Remember the last URL of the active rail screen (includes the query
  // params — the exact "view" to return to).
  useEffect(() => {
    const current = NAV_ITEMS.find((item) => pathname.startsWith(item.to));
    if (current) lastUrlByItem.set(current.to, pathname + search);
  }, [pathname, search]);

  // ⌘K / Ctrl+K: now that the home search bar no longer exists, the shortcut
  // navigates directly to /search (the input there auto-focuses). It lives in
  // the rail because it is mounted on ALL the shell screens — the shortcut
  // is never dead.
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        navigate("/search");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate]);

  // The mobile header (☰ + logo + search) only appears on the feed-like screens
  // that have NO top bar of their own. Search and the thread view keep their own
  // contextual bars (SearchAppBar / back bar), so we don't stack a second one.
  const showMobileHeader =
    pathname.startsWith("/home") || pathname.startsWith("/me");
  const searchTarget = lastUrlByItem.get("/search") || "/search";

  const renderItems = (items) =>
    items.map((item) => {
      const isActive = pathname.startsWith(item.to);
      // Inactive → return to the last view of that screen (or the base
      // route if never visited). Active → the current URL as href (valid for
      // cmd/middle-click and copy-link), but the plain click is intercepted
      // below: no redundant navigation, just scroll to top.
      const target = isActive
        ? pathname + search
        : lastUrlByItem.get(item.to) || item.to;
      const label = t(item.labelKey);
      return (
        <Link
          key={item.to}
          to={target}
          className={`${styles.item} springPressIcon ${
            isActive ? styles.itemActive : ""
          } ${tipOffItem === item.to ? styles.tipOff : ""}`}
          aria-label={label}
          aria-current={isActive ? "page" : undefined}
          onClick={(e) => {
            setTipOffItem(item.to);
            if (!isActive) return;
            // Modified clicks keep their browser behavior (new tab, etc.) —
            // same condition under which Link would client-navigate.
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0)
              return;
            // Active tab: no history entry (back keeps working as before),
            // only the Meta-style scroll to top. Focus stays on the icon.
            e.preventDefault();
            scrollPageToTop();
          }}
          onMouseEnter={() =>
            setTipOffItem((v) => (v === item.to ? null : v))
          }
        >
          {item.icon}
          <span className={styles.tooltip}>{label}</span>
        </Link>
      );
    });

  return (
    <>
      {/* Desktop: floating capsule on the left */}
      <nav className={styles.rail} aria-label={t("nav.primary")}>
        {/* Brand icon (thread + dot) — plain variant (no terracotta tile):
            subtle, so it doesn't compete with the nav icons / active blob.
            The short divider below gives it its own zone without boxing it
            in; the SAME divider separates the ☰ at the bottom, so both
            breathe identically (shared class = guaranteed consistency). */}
        <BrandLogo size={44} variant="plain" />
        <div className={styles.divider} aria-hidden="true" />
        <div className={styles.items}>{renderItems(NAV_ITEMS)}</div>
        <div className={styles.divider} aria-hidden="true" />
        <MenuButton menuUp={false} />
      </nav>

      {/* Mobile: top app bar — [☰] · [logo] · [search]. Sticky, so it offsets
          the content naturally (no manual padding). Only on the feed screens
          (see showMobileHeader); CSS also hides it on desktop. */}
      {showMobileHeader && (
        <header className={styles.appBar}>
          {/* ☰ reuses the SAME menu (Languages / About) as the rail. */}
          <MenuButton variant="header" />
          {/* Brand mark, centered (plain thread + dot, no background). A touch
              larger than the side icons so it reads as the header's focal
              point (Threads-style), with ~8px of air in the 52px bar. */}
          <span className={styles.appBarBrand} aria-hidden="true">
            <BrandLogo size={36} variant="plain" />
          </span>
          {/* Magnifier → /search (returns to the last search view if any). */}
          <Link
            to={searchTarget}
            className={`${styles.appBarButton} springPressIcon`}
            aria-label={t("nav.search")}
          >
            {SEARCH_ICON}
          </Link>
        </header>
      )}

      {/* Mobile: fixed bottom bar — Home + My threads only (icon-only). */}
      <nav
        className={`${styles.bottomBar} ${
          keyboardOpen ? styles.bottomBarHidden : ""
        }`}
        aria-label={t("nav.primary")}
      >
        {renderItems(BOTTOM_NAV_ITEMS)}
      </nav>
    </>
  );
}

export default NavRail;

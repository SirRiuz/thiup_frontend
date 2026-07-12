import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LanguageModal from "./LanguageModal";
import WelcomeModal from "../WelcomeModal";
import BrandLogo from "../BrandLogo";
import MenuSurface, { menuStyles } from "../menu/MenuSurface";
import { useKeyboardOpen } from "../../hooks/useKeyboardOpen";
import styles from "../../styles/components/nav/NavRail.module.css";
import cx from "../../utils/cx";

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

// Each item carries TWO glyphs: `icon` = the original stroke set (MOBILE bars,
// untouched) and `railIcon` = Threads' EXACT desktop sidebar icon (24×24,
// filled paths lifted verbatim from their markup — Home / Search / Profile).
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
    railIcon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          clipRule="evenodd"
          fillRule="evenodd"
          fill="currentColor"
          d="M13.4056 3.72522C12.5838 3.06783 11.4162 3.06783 10.5944 3.72522L4.28209 8.7751C3.62975 9.29697 3.25 10.0871 3.25 10.9225V18C3.25 19.5188 4.48122 20.75 6 20.75H18C19.5188 20.75 20.75 19.5188 20.75 18V10.9225C20.75 10.0871 20.3703 9.29697 19.7179 8.7751L13.4056 3.72522ZM9.0327 1.77305C10.7675 0.385221 13.2325 0.38522 14.9673 1.77305L21.2796 6.82293C22.525 7.81923 23.25 9.32762 23.25 10.9225V18C23.25 20.8995 20.8995 23.25 18 23.25H6C3.1005 23.25 0.75 20.8995 0.75 18V10.9225C0.75 9.32763 1.47497 7.81923 2.72035 6.82293L9.0327 1.77305Z"
        />
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
    railIcon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          clipRule="evenodd"
          fillRule="evenodd"
          fill="currentColor"
          d="M11.2607 1.01074C5.59982 1.01074 1.01074 5.59982 1.01074 11.2607C1.01074 16.9217 5.59982 21.5107 11.2607 21.5107C13.6407 21.5107 15.8312 20.6996 17.5709 19.3387L20.8554 22.6231C21.3435 23.1113 22.135 23.1113 22.6231 22.6231C23.1113 22.135 23.1113 21.3435 22.6231 20.8554L19.3387 17.5709C20.6996 15.8312 21.5107 13.6407 21.5107 11.2607C21.5107 5.59982 16.9217 1.01074 11.2607 1.01074ZM3.51074 11.2607C3.51074 6.98053 6.98054 3.51074 11.2607 3.51074C15.5409 3.51074 19.0107 6.98053 19.0107 11.2607C19.0107 15.541 15.5409 19.0107 11.2607 19.0107C6.98054 19.0107 3.51074 15.541 3.51074 11.2607Z"
        />
      </svg>
    ),
  },
  {
    // Threads' Notifications slot (the heart), in their exact order: right
    // after Search, before the profile item. DESKTOP-ONLY for now (excluded
    // from the mobile bars below).
    to: "/notifications",
    labelKey: "nav.notifications",
    desktopOnly: true,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
    railIcon: (
      // Threads' EXACT Notifications heart (24×24 filled path, verbatim).
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          fill="currentColor"
          d="M16.4045 1.50879C14.785 1.50879 13.2185 2.16259 12 3.30764C10.7815 2.16259 9.215 1.50879 7.5955 1.50879C3.41766 1.50879 0.5 4.62796 0.5 9.09411C0.5 13.7857 4.70617 18.9703 11.2153 22.3022C11.4605 22.428 11.7298 22.4912 11.9995 22.4912C11.9993 22.4912 11.9997 22.4912 11.9995 22.4912C12.2692 22.4912 12.5395 22.428 12.7847 22.3022C19.2938 18.9703 23.5 13.7857 23.5 9.09411C23.5 4.62796 20.5823 1.50879 16.4045 1.50879ZM12 19.9518C6.65166 17.1137 2.94684 12.6864 2.94684 9.09411C2.94684 5.97251 4.77133 3.95556 7.5955 3.95556C9.825 3.95556 11.0773 5.80961 12 7.26504C12.9227 5.80961 14.175 3.95556 16.4045 3.95556C19.2287 3.95556 21.0532 5.97251 21.0532 9.09411C21.0532 12.6864 17.3483 17.1137 12 19.9518Z"
        />
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
    railIcon: (
      // Threads' Profile glyph — their sidebar equivalent of the own-space tab.
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          clipRule="evenodd"
          fillRule="evenodd"
          fill="currentColor"
          d="M12 0.75C8.82431 0.75 6.25 3.32437 6.25 6.5C6.25 9.67563 8.82431 12.25 12 12.25C15.1757 12.25 17.75 9.67563 17.75 6.5C17.75 3.32437 15.1757 0.75 12 0.75ZM8.75 6.5C8.75 4.70507 10.205 3.25 12 3.25C13.795 3.25 15.25 4.70507 15.25 6.5C15.25 8.29493 13.795 9.75 12 9.75C10.205 9.75 8.75 8.29493 8.75 6.5Z"
        />
        <path
          fill="currentColor"
          d="M12.0003 13.75C6.97423 13.75 2.73384 17.086 1.30779 21.6254C1.10089 22.284 1.46707 22.9856 2.1257 23.1925C2.78432 23.3994 3.48596 23.0333 3.69287 22.3746C4.80482 18.835 8.10976 16.25 12.0003 16.25C15.8909 16.25 19.1958 18.835 20.3078 22.3746C20.5147 23.0333 21.2163 23.3994 21.8749 23.1925C22.5336 22.9856 22.8997 22.284 22.6928 21.6254C21.2668 17.086 17.0264 13.75 12.0003 13.75Z"
        />
      </svg>
    ),
  },
];

// Mobile bottom bar shows only Home + My threads (icon-only, no labels). Search
// lives in the mobile header (magnifier), the ☰ menu also lives there, and
// Notifications is desktop-only for now — so the bottom bar stays to two
// primary destinations, Threads-style.
const BOTTOM_NAV_ITEMS = NAV_ITEMS.filter(
  (item) => item.to !== "/search" && !item.desktopOnly
);
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
          // Desktop rail: Threads' EXACT "More" glyph — two rounded bars
          // (21px top / 14px bottom, 2.5px tall, rx 1.25) in a 24×24 box.
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <rect x="3" y="7" width="21" height="2.5" rx="1.25" />
            <rect x="3" y="15" width="14" height="2.5" rx="1.25" />
          </svg>
        )}
        {!isHeader && <span className={styles.tooltip}>{t("nav.menu")}</span>}
      </button>

      {open && (
        /* THE shared menu panel (MenuSurface — same surface/rows as the
           thread options menu); NavRail only adds the anchor position and
           its animated close. */
        <MenuSurface
          className={cx(isHeader ? styles.menuDown : menuUp ? styles.menuUp : styles.menuSide, closing ? styles.menuClosing : "")}
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
            className={menuStyles.item}
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
            className={menuStyles.item}
            onClick={() => {
              closeMenu();
              setWelcomeOpen(true);
            }}
          >
            {t("nav.about")}
          </button>
        </MenuSurface>
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
  // contextual bars (the "Search" masthead / back bar), so we don't stack a
  // second one.
  const showMobileHeader =
    pathname.startsWith("/home") || pathname.startsWith("/me");
  const searchTarget = lastUrlByItem.get("/search") || "/search";

  // useRailIcons: the desktop sidebar renders Threads' exact 24px glyphs
  // (railIcon); the mobile bottom bar keeps the original stroke set (icon).
  const renderItems = (items, useRailIcons = false) =>
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
          className={cx(styles.item, "springPressIcon", isActive ? styles.itemActive : "", tipOffItem === item.to ? styles.tipOff : "")}
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
          {useRailIcons ? item.railIcon : item.icon}
          <span className={styles.tooltip}>{label}</span>
        </Link>
      );
    });

  return (
    <>
      {/* Desktop: Threads' fixed full-height side navigation — logo at the
          top, nav items vertically centered (.items margin auto), ☰ at the
          bottom. No dividers (Threads' sidebar has none). */}
      <nav className={styles.rail} aria-label={t("nav.primary")}>
        {/* Brand icon (thread + dot) — plain variant (no terracotta tile):
            subtle, so it doesn't compete with the nav icons / active blob.
            Threads' exact logo slot: a 34×34 mark that's a LINK home, with
            their hover grow (scale 1.07) / press (0.98) animation. */}
        <button
          type="button"
          className={styles.railLogo}
          onClick={() => navigate("/home")}
          aria-label={t("nav.home")}
        >
          {/* fit="glyph": the drawn mark fills the 34px slot (the master's
              68-box carries tile air that shrank it next to Threads'). */}
          <BrandLogo size={34} variant="plain" fit="glyph" />
        </button>
        <div className={styles.items}>
          {/* Threads' sidebar order: Home / Search / CREATE / ♥ / Profile. */}
          {renderItems(NAV_ITEMS.slice(0, 2), true)}
          {/* Create (+) — Threads' exact plated button (always-visible rounded
              plate + their + glyph). PLACEHOLDER: no functionality yet — it
              will open the composer once that flow exists. */}
          <button
            type="button"
            className={cx(styles.item, styles.createItem, "springPressIcon")}
            aria-label={t("nav.create")}
          >
            <span className={styles.createPlate} aria-hidden="true" />
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              className={styles.createGlyph}
            >
              <path
                fill="currentColor"
                d="M13.25 3.00001C13.25 2.30965 12.6904 1.75001 12 1.75001C11.3096 1.75001 10.75 2.30965 10.75 3.00001V10.75H3C2.30964 10.75 1.75 11.3097 1.75 12C1.75 12.6904 2.30964 13.25 3 13.25H10.75V21C10.75 21.6904 11.3096 22.25 12 22.25C12.6904 22.25 13.25 21.6904 13.25 21V13.25H21C21.6904 13.25 22.25 12.6904 22.25 12C22.25 11.3097 21.6904 10.75 21 10.75H13.25V3.00001Z"
              />
            </svg>
            <span className={styles.tooltip}>{t("nav.create")}</span>
          </button>
          {renderItems(NAV_ITEMS.slice(2), true)}
        </div>
        <MenuButton menuUp={true} />
      </nav>

      {/* Mobile: top app bar — [☰] · [logo] · [search]. Sticky, so it offsets
          the content naturally (no manual padding). Only on the feed screens
          (see showMobileHeader); CSS also hides it on desktop. */}
      {showMobileHeader && (
        <header className={styles.appBar}>
          {/* ☰ reuses the SAME menu (Languages / About) as the rail. */}
          <MenuButton variant="header" />
          {/* Brand mark, centered — Threads' exact mobile-header logo slot:
              a 32×32 box the drawn glyph FILLS (fit="glyph"; the master
              68-box's air shrank the visible mark to ~20px), tappable home
              like theirs. */}
          <button
            type="button"
            className={styles.appBarBrand}
            onClick={() => navigate("/home")}
            aria-label={t("nav.home")}
          >
            <BrandLogo size={32} variant="plain" fit="glyph" />
          </button>
          {/* Magnifier → /search (returns to the last search view if any). */}
          <Link
            to={searchTarget}
            className={cx(styles.appBarButton, "springPressIcon")}
            aria-label={t("nav.search")}
          >
            {SEARCH_ICON}
          </Link>
        </header>
      )}

      {/* Mobile: fixed bottom bar — Home + My threads only (icon-only). */}
      <nav
        className={cx(styles.bottomBar, keyboardOpen ? styles.bottomBarHidden : "")}
        aria-label={t("nav.primary")}
      >
        {renderItems(BOTTOM_NAV_ITEMS)}
      </nav>
    </>
  );
}

export default NavRail;

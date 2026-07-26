import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LanguageModal from "./LanguageModal";
import WelcomeModal from "../WelcomeModal";
import BrandLogo from "../BrandLogo";
import MenuSurface, { menuStyles } from "../menu/MenuSurface";
import { useCompose } from "../../contexts/ComposeContext";
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

// Glyphs per item (all Threads' EXACT 24×24 paths, lifted verbatim):
//  - `railIcon` — the DESKTOP sidebar set (unchanged: one filled set + the
//    warm active blob). Hidden on the mobile bottom bar.
//  - `barIconIdle` / `barIconActive` — the MOBILE bottom bar pair (Threads'
//    mobile anatomy: the STATE lives in the glyph — outline at rest, solid
//    when active — with NO persistent background behind it; their plate is
//    hover/press feedback only, opacity 0 at rest). CSS swaps them.
const NAV_ITEMS = [
  {
    to: "/home",
    labelKey: "nav.home",
    railIcon: (
      <svg className={styles.railGlyph} width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          clipRule="evenodd"
          fillRule="evenodd"
          fill="currentColor"
          d="M13.4056 3.72522C12.5838 3.06783 11.4162 3.06783 10.5944 3.72522L4.28209 8.7751C3.62975 9.29697 3.25 10.0871 3.25 10.9225V18C3.25 19.5188 4.48122 20.75 6 20.75H18C19.5188 20.75 20.75 19.5188 20.75 18V10.9225C20.75 10.0871 20.3703 9.29697 19.7179 8.7751L13.4056 3.72522ZM9.0327 1.77305C10.7675 0.385221 13.2325 0.38522 14.9673 1.77305L21.2796 6.82293C22.525 7.81923 23.25 9.32762 23.25 10.9225V18C23.25 20.8995 20.8995 23.25 18 23.25H6C3.1005 23.25 0.75 20.8995 0.75 18V10.9225C0.75 9.32763 1.47497 7.81923 2.72035 6.82293L9.0327 1.77305Z"
        />
      </svg>
    ),
    // Threads' outline house (their idle mobile Home, verbatim).
    barIconIdle: (
      <svg className={styles.barGlyphIdle} width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          fill="currentColor"
          d="M21 10.9229C21 10.0115 20.5856 9.1494 19.874 8.58008L13.5615 3.53028C12.6485 2.79985 11.3515 2.79985 10.4385 3.53028L4.12598 8.58008C3.41436 9.1494 3 10.0115 3 10.9229V18C3 19.6569 4.34315 21 6 21H18C19.6569 21 21 19.6569 21 18V10.9229ZM23 18C23 20.7614 20.7614 23 18 23H6C3.23858 23 1 20.7614 1 18V10.9229C1 9.40394 1.69088 7.96742 2.87695 7.01856L9.18848 1.96876C10.832 0.65397 13.168 0.653969 14.8115 1.96876L21.123 7.01856C22.3091 7.96742 23 9.40394 23 10.9229V18Z"
        />
      </svg>
    ),
    // Threads' solid house (their aria-current mobile Home, verbatim).
    barIconActive: (
      <svg className={styles.barGlyphActive} width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          fill="currentColor"
          d="M9.0327 1.77305C10.7675 0.385221 13.2325 0.38522 14.9673 1.77305L21.2796 6.82293C22.525 7.81923 23.25 9.32762 23.25 10.9225V18C23.25 20.8995 20.8995 23.25 18 23.25H6C3.1005 23.25 0.75 20.8995 0.75 18V10.9225C0.75 9.32763 1.47497 7.81923 2.72035 6.82293L9.0327 1.77305Z"
        />
      </svg>
    ),
  },
  {
    to: "/search",
    labelKey: "nav.search",
    railIcon: (
      <svg className={styles.railGlyph} width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          clipRule="evenodd"
          fillRule="evenodd"
          fill="currentColor"
          d="M11.2607 1.01074C5.59982 1.01074 1.01074 5.59982 1.01074 11.2607C1.01074 16.9217 5.59982 21.5107 11.2607 21.5107C13.6407 21.5107 15.8312 20.6996 17.5709 19.3387L20.8554 22.6231C21.3435 23.1113 22.135 23.1113 22.6231 22.6231C23.1113 22.135 23.1113 21.3435 22.6231 20.8554L19.3387 17.5709C20.6996 15.8312 21.5107 13.6407 21.5107 11.2607C21.5107 5.59982 16.9217 1.01074 11.2607 1.01074ZM3.51074 11.2607C3.51074 6.98053 6.98054 3.51074 11.2607 3.51074C15.5409 3.51074 19.0107 6.98053 19.0107 11.2607C19.0107 15.541 15.5409 19.0107 11.2607 19.0107C6.98054 19.0107 3.51074 15.541 3.51074 11.2607Z"
        />
      </svg>
    ),
    // Threads' THIN magnifier (their idle mobile Search — 2px ring, verbatim).
    barIconIdle: (
      <svg className={styles.barGlyphIdle} width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          fill="currentColor"
          d="M11 1C16.5228 1 21 5.47715 21 11C21 13.4013 20.1529 15.6043 18.7422 17.3281L22.707 21.293C23.0976 21.6835 23.0976 22.3165 22.707 22.707C22.3165 23.0976 21.6835 23.0976 21.293 22.707L17.3281 18.7422C15.6043 20.1529 13.4013 21 11 21C5.47715 21 1 16.5228 1 11C1 5.47715 5.47715 1 11 1ZM11 3C6.58172 3 3 6.58172 3 11C3 15.4183 6.58172 19 11 19C15.4183 19 19 15.4183 19 11C19 6.58172 15.4183 3 11 3Z"
        />
      </svg>
    ),
    // Threads' BOLD magnifier (their aria-current mobile Search, verbatim).
    barIconActive: (
      <svg className={styles.barGlyphActive} width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          fill="currentColor"
          d="M11 1C16.5228 1 21 5.47715 21 11C21 13.2202 20.275 15.2704 19.0508 16.9297L22.5605 20.4395C23.1463 21.0252 23.1463 21.9748 22.5605 22.5605C21.9748 23.1463 21.0252 23.1463 20.4395 22.5605L16.9297 19.0508C15.2704 20.275 13.2202 21 11 21C5.47715 21 1 16.5228 1 11C1 5.47715 5.47715 1 11 1ZM11 4C7.13401 4 4 7.13401 4 11C4 14.866 7.13401 18 11 18C14.866 18 18 14.866 18 11C18 7.13401 14.866 4 11 4Z"
        />
      </svg>
    ),
  },
  {
    // Threads' Notifications slot (the heart), in their exact order: right
    // after Search (+ the Create button rendered between them), before the
    // profile item.
    to: "/notifications",
    labelKey: "nav.notifications",
    railIcon: (
      // Threads' EXACT Notifications heart (24×24 filled path, verbatim).
      <svg className={styles.railGlyph} width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          fill="currentColor"
          d="M16.4045 1.50879C14.785 1.50879 13.2185 2.16259 12 3.30764C10.7815 2.16259 9.215 1.50879 7.5955 1.50879C3.41766 1.50879 0.5 4.62796 0.5 9.09411C0.5 13.7857 4.70617 18.9703 11.2153 22.3022C11.4605 22.428 11.7298 22.4912 11.9995 22.4912C11.9993 22.4912 11.9997 22.4912 11.9995 22.4912C12.2692 22.4912 12.5395 22.428 12.7847 22.3022C19.2938 18.9703 23.5 13.7857 23.5 9.09411C23.5 4.62796 20.5823 1.50879 16.4045 1.50879ZM12 19.9518C6.65166 17.1137 2.94684 12.6864 2.94684 9.09411C2.94684 5.97251 4.77133 3.95556 7.5955 3.95556C9.825 3.95556 11.0773 5.80961 12 7.26504C12.9227 5.80961 14.175 3.95556 16.4045 3.95556C19.2287 3.95556 21.0532 5.97251 21.0532 9.09411C21.0532 12.6864 17.3483 17.1137 12 19.9518Z"
        />
      </svg>
    ),
    // Threads' outline heart (their idle mobile Notifications, verbatim).
    barIconIdle: (
      <svg className={styles.barGlyphIdle} width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          fill="currentColor"
          d="M16.5 2C14.8335 2 13.2217 2.70703 12 3.93652C10.7783 2.70704 9.1665 2 7.5 2C3.3785 2 0.5 5.08423 0.5 9.5C0.5 14.1284 4.84516 19.4619 11.311 22.7719C11.5267 22.8827 11.7633 22.9379 12 22.9379C12.2367 22.9379 12.4733 22.8827 12.689 22.7719C19.1548 19.4619 23.5 14.1284 23.5 9.5C23.5 5.08423 20.6217 2 16.5 2ZM12 20.8764C6.30767 17.8962 2.5 13.3467 2.5 9.5C2.5 6.15893 4.4625 4 7.5 4C9.5 4 11.25 5.75 12 7.5C12.75 5.75 14.5 4 16.5 4C19.5377 4 21.5 6.15893 21.5 9.5C21.5 13.3467 17.6923 17.8962 12 20.8764Z"
        />
      </svg>
    ),
    // Threads' SOLID heart (their aria-current /activity glyph, verbatim).
    barIconActive: (
      <svg className={styles.barGlyphActive} width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          fill="currentColor"
          d="M16.5 2C14.8335 2 13.2217 2.70703 12 3.93652C10.7783 2.70704 9.1665 2 7.5 2C3.3785 2 0.5 5.08423 0.5 9.5C0.5 14.1284 4.84516 19.4619 11.311 22.7719C11.5267 22.8827 11.7633 22.9379 12 22.9379C12.2367 22.9379 12.4733 22.8827 12.689 22.7719C19.1548 19.4619 23.5 14.1284 23.5 9.5C23.5 5.08423 20.6217 2 16.5 2Z"
        />
      </svg>
    ),
  },
  {
    to: "/profile",
    labelKey: "nav.myThreads",
    railIcon: (
      // Threads' Profile glyph — their sidebar equivalent of the own-space tab.
      <svg className={styles.railGlyph} width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
    // Threads' outline person (their idle mobile Profile, verbatim).
    barIconIdle: (
      <svg className={styles.barGlyphIdle} width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          fill="currentColor"
          d="M11.9997 1C15.0373 1 17.4997 3.46244 17.4997 6.5C17.4997 9.53756 15.0373 12 11.9997 12C8.9622 11.9998 6.49967 9.53745 6.49967 6.5C6.49967 3.46255 8.9622 1.00018 11.9997 1ZM11.9997 3C10.0668 3.00018 8.49967 4.56711 8.49967 6.5C8.49967 8.43289 10.0668 9.99982 11.9997 10C13.9327 10 15.4997 8.433 15.4997 6.5C15.4997 4.567 13.9327 3 11.9997 3Z"
        />
        <path
          fill="currentColor"
          d="M11.9997 14C16.9121 14 21.0591 17.2609 22.4538 21.7002C22.6193 22.2271 22.3263 22.7886 21.7995 22.9541C21.2727 23.1194 20.7111 22.8266 20.5456 22.2998C19.4022 18.6603 16.0038 16 11.9997 16C7.99569 16.0001 4.5971 18.6603 3.45377 22.2998C3.28818 22.8266 2.72671 23.1196 2.19986 22.9541C1.67323 22.7884 1.38015 22.2269 1.54557 21.7002C2.94019 17.2609 7.0873 14.0001 11.9997 14Z"
        />
      </svg>
    ),
    // Threads' SOLID person (their aria-current profile glyph, verbatim).
    barIconActive: (
      <svg className={styles.barGlyphActive} width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          fill="currentColor"
          d="M11.9999 1C15.0375 1 17.4999 3.46243 17.4999 6.5C17.4999 9.53757 15.0375 12 11.9999 12C8.96239 12 6.49992 9.53754 6.49992 6.5C6.49992 3.46246 8.96239 1.00005 11.9999 1Z"
        />
        <path
          fill="currentColor"
          d="M11.9999 14C16.3825 14 20.1557 16.5961 21.9081 20.3047C22.5576 21.6792 21.432 23 20.1376 23H3.86223C2.56787 22.9999 1.44225 21.6792 2.09172 20.3047C3.84408 16.5961 7.61734 14 11.9999 14Z"
        />
      </svg>
    ),
  },
];

// The mobile bottom bar mirrors Threads' five-slot bar exactly: Home /
// Search / Create (+) / Notifications / Profile — the SAME items and glyphs
// as the desktop rail (Search left the top app bar's magnifier for the bar,
// like Threads; their mobile header carries only the logo + our ☰ menu).

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
          // Mobile header: Threads' EXACT header "More" glyph (24×24, lifted
          // verbatim) — two EQUAL filled rounded bars (2.5 tall, rx 1.25).
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              fill="currentColor"
              d="M19.25 16C19.9404 16 20.5 16.5596 20.5 17.25C20.5 17.9404 19.9404 18.5 19.25 18.5H4.25C3.55964 18.5 3 17.9404 3 17.25C3 16.5596 3.55964 16 4.25 16H19.25Z"
            />
            <path
              fill="currentColor"
              d="M19.25 6C19.9404 6 20.5 6.55964 20.5 7.25C20.5 7.94036 19.9404 8.5 19.25 8.5H4.25C3.55964 8.5 3 7.94036 3 7.25C3 6.55964 3.55964 6 4.25 6H19.25Z"
            />
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
  const { openCompose } = useCompose();
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

  // The mobile header (☰ + centered logo) appears on the top-level feed-like
  // screens: home AND search (search's own "Search" masthead is desktop-only —
  // on mobile this bar replaces it). The thread view and the profile keep
  // their own contextual back bars, so we don't stack a second one there.
  const showMobileHeader =
    pathname.startsWith("/home") || pathname.startsWith("/search");

  // useRailIcons: the desktop sidebar renders Threads' exact 24px glyphs
  // (railIcon); the mobile bottom bar keeps the original stroke set (icon).
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
          {/* Desktop rail glyph + the mobile bar's idle/active pair — CSS
              shows exactly one per context (see .railGlyph/.barGlyph*). */}
          {item.railIcon}
          {item.barIconIdle}
          {item.barIconActive}
          <span className={styles.tooltip}>{label}</span>
        </Link>
      );
    });

  // Create (+) — Threads' exact plated button (always-visible rounded plate +
  // their + glyph), rendered between Search and Notifications on BOTH the
  // desktop rail and the mobile bottom bar (their five-slot order).
  // Opens the global ComposeModal (same dialog as home's compose row).
  const createButton = (
    <button
      type="button"
      className={cx(styles.item, styles.createItem, "springPressIcon")}
      aria-label={t("nav.create")}
      onClick={openCompose}
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
  );

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
          {renderItems(NAV_ITEMS.slice(0, 2))}
          {createButton}
          {renderItems(NAV_ITEMS.slice(2))}
        </div>
        <MenuButton menuUp={true} />
      </nav>

      {/* Mobile: top app bar — [☰] · [logo] · [balance]. Threads' mobile
          header carries no search (it lives in the bottom bar now); the empty
          end cell keeps the logo grid-centered. Only on the feed screens
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
          <span aria-hidden="true" />
        </header>
      )}

      {/* Mobile: fixed bottom bar — Threads' five-slot bar (Home / Search /
          Create / Notifications / Profile), icon-only, same glyphs as the
          desktop rail. */}
      <nav
        className={cx(styles.bottomBar, keyboardOpen ? styles.bottomBarHidden : "")}
        aria-label={t("nav.primary")}
      >
        {renderItems(NAV_ITEMS.slice(0, 2))}
        {createButton}
        {renderItems(NAV_ITEMS.slice(2))}
      </nav>
    </>
  );
}

// The ☰ menu button is reused OUTSIDE the NavRail too (the profile app bars
// render it in their right slot on mobile) — same button, same MenuSurface
// panel, same Languages/About options and modals, zero duplication.
export { MenuButton };

export default NavRail;

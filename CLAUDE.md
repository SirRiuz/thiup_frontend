# CLAUDE.md — Thiup Frontend (Design System)

Source of truth for AI models and contributors building UI in this repo. It documents the
**real** visual language (verified against the CSS/components, not idealized). It is the design
companion to the backend's `CLAUDE.md` (architecture). If you change the design system, update
this file.

> **No centralized tokens.** There are **no CSS custom properties** (`:root` / `var()`) and no
> theme object — every value below is **hardcoded per CSS Module**. This document IS the token
> reference. When you need a color/size, copy the exact value from here; do not invent new ones.

## Stack

- React 18, **CRA** (no eject), **JavaScript (no TypeScript)**.
- **CSS Modules** (`*.module.css`), one per component/screen, under `src/styles/`.
- Global reset + `@font-face` in `src/styles/index.css`.
- react-router v6; i18n via i18next/react-i18next (`en`/`es`).
- Icons: **inline SVG** (see Iconography — there is **no icon library**).
- No CSS-in-JS, no UI kit (Emotion/MUI were removed to slim the bundle).
- **PWA / system chrome:** installable (`public/manifest.json`, `display: standalone`). The system
  status bar / browser chrome takes the warm app color via `<meta name="theme-color" content="#f7f5f0">`
  + `mobile-web-app-capable` / `apple-mobile-web-app-capable` + `apple-mobile-web-app-status-bar-style:
  default` (legible dark icons on the light bar); manifest `theme_color`/`background_color` match
  (`#f7f5f0`). Honest caveat: reliable on Android Chrome / installed PWA; iOS **Safari while browsing**
  has limited support (full effect when installed). `#f7f5f0` is near-white, so the tint is subtle by
  design (it fuses with the header).

## Design philosophy

Thiup is an **anonymous, privacy-first** social app for sensitive topics. The visual language is
**warm, sober, handcrafted, human** — paper-like, never flashy. The aesthetic is part of the
safety promise: a calm, low-arousal interface respects people discussing hard things and avoids
the dopamine-loud patterns of mainstream social media.

Principles:
- **Warm paper, not white.** Cream surfaces, soft warm borders, terracotta as the single brand
  accent. Pure `#FFFFFF` is forbidden.
- **Quiet hierarchy.** Small type, generous line-height, subtle dividers instead of heavy boxes.
- **Restraint over decoration.** One accent color, gentle shadows, short dividers, no gradients
  beyond functional map/blur cues.
- **Privacy in the chrome.** Never leak user content into titles, link previews, or metadata.

## Color palette

Pure `#FFFFFF` is **FORBIDDEN** — use `#fdfcf8` for elevated/white-feeling surfaces.

### Core tokens (use these)

| Hex | Role | Usage |
|---|---|---|
| `#f7f5f0` | Page background | App/body background, shell, splash curtain; also the hover wash on `#fdfcf8` surfaces (e.g. dropdown options) |
| `#fdfcf8` | Surface / elevated | Cards, rails, modals, inputs, dropdown menus — the "white" of Thiup |
| `#f0ece3` | Hover / neutral selection | Hover wash on transparent controls (nav items, back button, dropdown trigger) and the **selected** state of neutral menu options (non-accent — selection shown by a check, not by terracotta) |
| `#1a1a1a` | Text primary | Body text, headings, **dark buttons** (115 uses — canonical) |
| `#6b6b6b` | Text secondary | Timestamps, captions, muted labels |
| `#9b9591` | Text tertiary / muted | De-emphasized meta, placeholder-ish text; timestamps + "· Author" meta (≈ Threads' light `--text-secondary` #999) |
| `#424242` | Charcoal action | Thread action bars ONLY (React/Reply icon + label) — Threads' exact `--barcelona-charcoal-text/icon` (light theme) |
| `#a3a3a3` | Text quaternary | Hints (e.g. char counters) |
| `#ebe7dd` | Border (default) | Card bottom-borders, dividers between rows |
| `#e5e0d3` | Border (surface) | Modal/rail/input outlines |
| `#c4bfb1` | Separator glyph | Inline "·" dividers, faint marks |
| `#d5cfc0` | Dashed / ghost | Dashed placeholders & empty-state illustrations only |

### Brand & warm accents

| Hex | Role | Usage |
|---|---|---|
| `#a85432` | **Terracotta — brand accent** | Logo, active nav state, primary brand moments |
| `#b8845f` | Warm accent | Secondary icons, warm highlights |
| `#c5a572` | Warm accent (light) | Focus ring (`inset 0 0 0 2px #c5a572`), illustration fills |
| `#8b6f47` | Brown accent | OG tagline, deep warm text |
| `#f3e3d3` | Warm tint | Tag/chip backgrounds, active-blob fill |
| `#c53030` | Danger | Errors, destructive, "trending" badge text (used on tints like `rgba(197,48,48,0.08)`) |
| `#ff3040` | Danger (menu rows) | Destructive rows in the three-dots options menu/sheet ONLY — Threads' exact `--barcelona-error-text` |

### Translucent overlays (common)

- Shadows: warm-tinted black `rgba(26, 26, 26, α)` — α ≈ `0.04`→`0.08` (cards), `0.18` (modals).
- Modal backdrop: `rgba(31, 26, 20, 0.42)` + `backdrop-filter: blur(8px)`.
- Brand wash: `rgba(168, 84, 50, 0.1)`. (Feed cards have NO hover wash — Threads-style quiet rows.)

> **Inconsistencies to fix when touched (do not propagate):**
> - `src/styles/components/SearchBar.module.css` uses `background: #ffffff` — the only real
>   `#FFFFFF` violation. `SearchBar.js` appears to be **dead code** (not imported anywhere);
>   prefer deleting it over "fixing" it.
> - `src/styles/index.css` sets body `color: #0f0f0f` and uses neutral-gray scrollbar/`::selection`
>   (`#e5e5e5`, `#9b9a97`, `rgba(0,0,0,.1)`). Components use the warm `#1a1a1a`. Treat **`#1a1a1a`**
>   as the canonical text color.
> - Other one-off warm grays exist (`#e8e5dd`, `#ddd8c8`…). Reuse the Core tokens above before
>   adding a new shade.

## Typography

- **Family:** `Inter` (self-hosted variable woff2, weights 100–900, `font-display: swap`).
  Stack: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, Roboto, …`.
- **Monospace** (technical chips only): `ui-monospace, "SF Mono", Menlo, Consolas, monospace`.
  Kept for stat counters, trending/momentum badges and the `/me` hash pill — it signals
  "machine/pseudonymous data". **Mask `@id` + timestamp rows are Inter EVERYWHERE** (thread view
  AND feed cards, reconciled) and use **Threads' exact identity-row spec**: the name is the SAME
  SIZE as the body (`clamp(14px, 13.1px + 0.25vw, 15px)` — Threads is 15px for name, time AND
  body; hierarchy comes from weight/color only, never size). Mask `600 #1a1a1a`; time + "· Author"
  meta `400 #9b9591` (≈ Threads' light-theme `--text-secondary` #999 — NOT the darker `#6b6b6b`).
  The time is `inline-block; min-width: 24px; text-align: center` (Threads' `<time>` box — even
  rhythm for short stamps); row is `gap 6px / line-height 21px`. (`Post .opMaskId`,
  `PostReply .maskId`, `HomeFeedCard .maskId`.)
- **Base:** body `14px`, `line-height: 1.55`, antialiased.

### Scale (real, most-used first)

| Size | Typical use |
|---|---|
| `11px` | Captions, timestamps, badges, meta (most common) |
| `13px` / `14px` | Body text, buttons, menu items |
| `10px` / `9px` | Micro-labels, uppercase badges |
| `15px` / `17px` | Emphasis, section titles |
| `20px` / `22px` | Modal/screen titles |
| `40px` | Hero/empty-state numerals (e.g. 404) |

### Weights

`500` (default emphasis, dominant) · `600` (titles, buttons, badges) · `700` (strong headings) ·
`400` (long body). Use `500/600`; avoid going heavier than `700`.

## Spacing, radius, elevation, breakpoints

- **Spacing:** informal multiples of ~2/4px; common paddings `8 / 10 / 12 / 13 / 14 / 18px`.
- **Radius scale:** `2/3/4` (chips, small marks), `6/8` (cards, inputs — most common), `12` (buttons),
  `14` (nav items), `18/22` (modals, rail capsule), `24` (the screen `.surface` cards — Threads'
  column corners), `28` (reaction popover), `50%`/`999px` (pills, avatars).
- **Shadows (elevation):**
  - Surface card (`/post`, `/home`): **NO shadow** — current Threads dropped the column's ambient
    halo (third design iteration); the card is outlined by its `#e5e0d3` border alone.
  - Raised popover/hover card: `0 4px 20px rgba(26,26,26,0.06)` (the nav rail casts none — it's a
    translucent full-height sidebar now).
  - Popover: `0 8px 24px rgba(26,26,26,0.08)` · Modal: `0 18px 50px rgba(26,26,26,0.18)`.
- **Breakpoints:** `700px` is the primary nav breakpoint (`>700` side capsule, `≤700` bottom bar);
  `480px` for fine mobile tweaks. Always honor `@media (prefers-reduced-motion: reduce)` and gate
  hover affordances behind `@media (hover: hover)`.

## Layout & shell

- **Content column:** `max-width: 640px`, centered (`margin: 0 auto`) — Threads-like
  (`--barcelona-column-layout-max-width`). Applies to **every** screen's `.main`
  (`HomeNew`, `SearchNew`, `MyThreads`, `Post`). On the card screens (`Post`, `HomeNew`) the
  column has **NO side gutter** — the `.surface` card is Threads' exact **640px** wide (their
  column is a hard `width: 640px`); the old 8px gutter (card = 624) was removed. The column-aligned sticky app bars
  (`Post .appBarInner`, `SearchNew .appBarInner`, and their hairlines) use the **same** `640px` +
  side-padding inset so the header/hairline line up with the content.
- **Side padding & the `--layout-pad-x` ↔ media-bleed contract:** a container exposes
  `--layout-pad-x` equal to its own side padding, and nested media carousels bleed edge-to-edge by
  cancelling the accumulated padding via `--media-bleed-x` (negative `margin-inline` + positive
  `padding-inline`). Two patterns in use:
  - **Thread view (`Post`)** — the `.surface` card carries the **exact Threads padding `16px`**
    (`--barcelona-post-horizontal-padding`) plus their **`20px` top padding** (the post column's
    breathing room so the OP never touches the card's top edge / app bar), and exposes
    `--layout-pad-x: 16px`; the `.opSection` /
    `.repliesList` add **no** horizontal padding, so the content inset is a single `16px` and
    `--media-bleed-x: var(--layout-pad-x)`. Replies bleed asymmetrically (see `PostReply .contentCell`:
    start cancels avatar-gutter `36` + grid-gap `12` + `--layout-pad-x`; end cancels just
    `--layout-pad-x`) so media aligns with the text on the left and reaches the edge on the right.
    **Reply vertical rhythm (Threads-exact, decoded from their markup):** row `padding: 12px 0`;
    header row `line-height: 21px`; body `margin: 3px 0 -2px` (3px below the header, -2px trim);
    action bar `margin: 6px 0 -4px -8px`, **no gap**, buttons **36px tall / `padding: 0 12px`**
    (their spacing comes from the button paddings, and the 36px height is what gives rows their
    air). Button content (Threads-exact): icon **18px** + label `13px / 400`, both **charcoal
    `#424242`** via `currentColor` (their `--barcelona-charcoal-text/icon`), icon↔label gap
    **4px**; hover = `#f0ece3` wash only (the charcoal stays). Same bar spec on the OP
    (`Post .opActions/.actionActive`) and the reaction picker's action variant
    (`PostReactionPicker .triggerAction`). **Threadlines (Threads-exact weight):** `2px` wide, `#e5e0d3`
    (their `--barcelona-threadline` rgb(229,229,229) warm-adjusted), CENTERED on the lane
    (`left: laneCenter - 1px`). **Threads' floating ends at the avatars:** a trunk is BORN 4px
    below its avatar's bottom edge (`top: 56px`) with their exact `2px 2px 0 0` rounded caps,
    and the elbow's arm STOPS 4px short of the target avatar's left edge (`width: STEP - 21`,
    SQUARE tip — a corner radius on a border-drawn box tapers the stroke into a visible notch) —
    small breathing gaps at every avatar junction, like their `--x-top` offset segments.
    Pass-through guides between rows stay CONNECTED (they're continuations).
  - **Feed screens (`HomeNew`, `SearchNew`, `MyThreads` + `HomeFeedCard`)** — the SAME single-inset
    contract as the thread view, but at Threads' FEED padding **`24px`**
    (`--barcelona-columns-item-horizontal-padding` — their feed columns use 24, unlike the post
    page's 16): the container (the `.surface` of home, search and me) carries the full
    `24px` side padding and exposes `--layout-pad-x: 24px`; **`HomeFeedCard` adds NO horizontal
    padding of its own** (`padding: 12px 0`), so `--media-bleed-x: var(--layout-pad-x)` reaches
    the container edge. **Search is the third canonical surface screen and is ONE responsive
    layout at every breakpoint** (the old mobile `SearchAppBar` + its `SearchSuggestions`/recent-
    searches dropdown were DELETED): a 60px solid masthead with the centered "Search" title
    (Threads' search column header) + corner mask (desktop), and ONE `.surface` card containing
    **Threads' in-card search box** (44px recessed rounded-16 field on `#f7f5f0`, magnifier 16px
    `#b8b8b8`, input 15px; autofocus on landing is desktop-only — never pop the mobile keyboard
    on navigation) with **LIVE results as you type** (the input debounces 350ms into `?q=` with
    `replace` — the URL stays the single source of truth for tabs/cache/deep links), then the
    tabs+results (query mode) or the trending suggestion rows (landing). On mobile the surface
    dissolves into the canonical `#fdfcf8` full-bleed sheet (`useMobileSurfacePage`, same as
    /home and /p/:id) and the masthead becomes the thread app bar's EXACT frosted fixed bar
    (borderless `rgba(253,252,248,0.88)` + blur, `top: var(--kb-top)`, content offset 60px).
  **HARD RULE:** `--layout-pad-x` MUST always equal the real side padding of its container, at
  **every breakpoint** — if you change the padding (incl. inside a media query), change
  `--layout-pad-x` to match, or the carousel over/under-shoots the column edge (last item cut off /
  first item misaligned). The carousel **gap is `6px`** (`--barcelona-carousel-gap`, in `ThreadMedia`).
- **Elevated surface screens (`/p/:id`, `/home`, `/search`, `/me` and `/m/:maskId`) — the
  canonical screen pattern:** the
  content lives inside one `.surface` card (`#fdfcf8`, border `#e5e0d3`, radius `24px` —
  Threads' exact column corners — **no shadow**, current Threads keeps only the hairline
  outline), floating on the `#f7f5f0` page.
  - **Desktop:** a **sticky corner mask** keeps the card's rounded TOP pinned while content scrolls
    under it (Threads' own trick, lifted from their markup): a 0-height sticky row holding a
    page-bg strip (carries the 1px top border) + two "inverted corner" caps — a 24×39
    `overflow:hidden` window with a 48×48 rounded box whose
    `box-shadow: 0 0 0 48px #f7f5f0` paints the page bg OUTSIDE the arc (Threads' exact cap:
    48×48 radius-24 + 48px spread, matching their column's 24px corners; no ambient layer — the
    card casts no halo anymore).
    Geometry is exact so at rest it's pixel-identical to the card's real top (invisible until you
    scroll). Thread view pins it below its 60px app bar (`top: 60px` — SAME height as home's
    masthead, so the card's rounded top sits at the identical viewport position on both screens);
    home pins it flush under its
    **60px desktop masthead** (`.desktopHeader` — Threads' column header: sticky `top: 0`, opaque
    `#f7f5f0`, centered feed title `15px/600`; desktop-only, mobile keeps the NavRail app bar), so
    the mask pins at `top: 60px`. See `Post.module.css` / `HomeNew.module.css` (`.cornerMask*`).
    **The thread app bar is ONE anatomy at every breakpoint (Threads' new post header):** grid
    `1fr · minmax(auto,65%) · 1fr` (gap 16) with the title block truly CENTERED and NO options
    menu in the bar — the three-dots (incl. the sort submenu) lives on the parent thread's
    header row (`Post .opHeader`, like a reply's), mobile included. Only the back button splits:
    desktop = Threads' floating circular button (24px `#fdfcf8` circle, 0.5px `#e5e0d3` hairline,
    shadow `0 2px 8px rgba(0,0,0,0.08)`, their exact 12×12 arrow glyph, hover `scale(1.1)`);
    mobile keeps the plain 20px arrow (via `useIsMobile`).
  - **Mobile (≤700px):** the card goes **full-bleed** (border/radius/shadow removed, `.main` side
    padding 0) and the whole screen becomes one `#fdfcf8` sheet: the page AND `<html>`/`<body>`/the
    AppShell wrapper are painted `#fdfcf8` via the shared **`useMobileSurfacePage(pageRef)`** hook
    (restored on unmount / desktop; reactive to the breakpoint) so the iOS elastic-overscroll
    rubber-band never shows a mismatched warm strip. The corner mask is CSS-hidden.
- **AppShell** (`AppShell.module.css`): page bg `#f7f5f0`. Desktop (`>700px`) reserves the rail lane
  with symmetric `96px` side padding (keeps the column centered). Mobile (`≤700px`) adds
  `padding-bottom: 64px` so the fixed bottom bar never covers content.
- **NavRail** (`NavRail.module.css`) is the whole nav system (desktop + mobile), all in one component:
  - **Desktop (`>700px`)** = **Threads' exact fixed side navigation**: `left: 0; top: 0`, full
    height (`min-height: 480px`), **`width: 76px`** (their `--barcelona-side-navigation-width`),
    translucent `rgba(247,245,240,0.85)` + `backdrop-filter: blur(15px)` (their
    `--barcelona-side-navigation-background` @ 0.85, warm-adjusted), NO border/radius/shadow (the
    old floating capsule is gone), no dividers. Anatomy: logo top (Threads' exact slot: **34×34**
    mark + 15px block padding, a LINK home whose svg grows `scale(1.07)` on hover / dips `0.98`
    on press, `transform 0.2s ease-in-out`), items vertically centered
    (`.items { margin: auto 0 }`, `row-gap: 4px` — Threads' exact), ☰ at the bottom (its popover
    opens up-right). Items **60×60px** (Threads' exact box; their 50px-tall compact variant is
    mirrored under `@media (max-height: 600px)`), radius `12px`, **idle `#b8b8b8`**
    (their `--barcelona-navigation-icon` light theme), hover = `rgba(0,0,0,0.04)` wash (icon stays
    light), **active = the warm `#f3e3d3` blob + `#a85432` icon** — the SAME accent language as
    the mobile bottom bar (Threads' blob-less `#1a1a1a` active was tried and rolled back: the
    app's terracotta active is a brand moment, kept at every breakpoint).
    Items in Threads' order: Home / Search / **Create (+) — Threads' exact plated button
    (always-visible plate `rgba(0,0,0,0.035)` radius 10, inset 6px vertical, + glyph `#999999` =
    their `--barcelona-secondary-icon`; PLACEHOLDER, no functionality until the composer flow
    exists — desktop rail only)** / **Notifications (their exact heart glyph — desktop-only via
    `desktopOnly`, excluded from the mobile bars; routes to `/notifications`, a noindex
    placeholder empty-state screen until the backend ships an activity feed)** / My threads. **Desktop glyphs are Threads' EXACT sidebar icons** (24×24
    FILLED paths lifted verbatim: Home / Search / Profile, plus their asymmetric "More" — rounded
    bars 21px + 14px × 2.5px, rx 1.25) via each item's `railIcon`; the mobile bars keep the
    original 22px stroke set (`icon`) — an exception to the app-wide outline icon style, scoped to
    the desktop rail.
  - **Mobile (`≤700px`) top app bar** — `height: 60px`, **FIXED** (`top: var(--kb-top)` — same
    anti-rubber-band treatment as the thread app bar; /home and /me compensate with 60px of mobile
    top padding), **SOLID WHITE `#fdfcf8`** (the view-thread bar's white tone, opaque — NOT
    frosted: over the feed's images the translucent recipe read too transparent; it fuses with the
    mobile `#fdfcf8` sheet, BORDERLESS — no hairline, the bar and the sheet read as one), grid
    `[☰] · [logo centered] · [search]`. The **☰ reuses the SAME NavRail menu**
    (Languages / About — the `MenuButton` with `variant="header"`); the logo is Threads' EXACT
    mobile-header slot — a **32×32 box the glyph FILLS** (`BrandLogo size={32} variant="plain"
    fit="glyph"`; at the old `size 36` the master viewBox's air shrank the visible mark to ~20px),
    a **button → `/home`** like theirs (press `scale(0.98)` on the svg, 0.2s ease-in-out);
    the magnifier links to `/search`. The header renders **only on
    `/home` and `/me`** (Search and the thread view keep their own top bars → no double headers).
    The asymmetric ☰ glyph: two rounded lines, the bottom one shorter (see Iconography).
  - **Mobile bottom bar** — fixed, frosted glass, **two icon-only items: Home + My threads** (Search
    moved to the app-bar magnifier; the ☰ moved to the app bar). Idle/active states per Interaction
    patterns. Hidden while the keyboard is open (`useKeyboardOpen`); honors `safe-area-inset-bottom`.
- **AppShell** mobile `padding-bottom: 64px` keeps the bottom bar clear; the FIXED app bar does NOT
  offset the top — each screen that shows it adds the 60px itself (home and me: mobile
  `padding-top: 60px`).

## Components (catalog)

Reference component: **`HomeFeedCard`** — the thread cell that defines the feed look.

| Component | File(s) | Notes |
|---|---|---|
| Thread card | `home/HomeFeedCard` | **Threads feed-row grid**: avatar (36px circle, hairline ring `#e5e0d3`) in a left gutter (`36px + 12px gap` = Threads' 48px threadline lane); username row + body + media + stats stacked in the content column (same anatomy as `PostReply`). `padding: 12px 0` (the screen container provides the 24px feed inset), **no hover wash**. Threads-exact rhythm: avatar cell `padding-top: 4px`, username row `line-height: 21px` + body 3px below, stats row `margin-top: 6px`. Media bleeds asymmetrically like replies (start cancels the lane + container padding; end just the container padding). Divider = full-bleed `::after` (1px `#ebe7dd`, `left/right: calc(-1 * var(--layout-pad-x))`; hidden on the last card). No "End of feed" marker. Header: mask `@id` Inter body-sized `clamp(14→15px)/600` (`#1a1a1a`) + timestamp same size `400` (`#9b9591`, `min-width: 24px` centered), gap 6 — Threads' exact identity row, same as the thread view (see Typography). Trending badge: uppercase mono, `#c53030` on `rgba(197,48,48,0.08)`. |
| Primary button | `WelcomeModal .button`, etc. | `background:#1a1a1a; color:#fdfcf8; border-radius:12px; font-weight:600; padding:13px 14px`. Hover = `opacity` transition. **Dark fill, cream text — never white text-on-white.** |
| Chips / tags | `search/SearchTagCard`, compose tags | Rounded (`3–8px`), warm tint `#f3e3d3` bg or subtle border; small mono/`11px` text. |
| Inputs | `HomeCompose`, `SearchNew .searchBox` | Surface `#fdfcf8`, border `#e5e0d3`, focus ring `inset 0 0 0 2px #c5a572`. **`HomeCompose` is two-state (Threads' exact compose row):** at rest a quiet strip — avatar 36 · "What's new?" prompt (`15/400 #9b9591`, 8px margins + 4px lead) · bordered Post button (36px tall, radius 10, `1px rgba(0,0,0,0.15)`, `15/600 #1a1a1a`) — `padding: 16px 0` + full-bleed bottom hairline; click expands the full inline composer IN PLACE (transparent/borderless — integrated into the surface, no card-in-card), collapsing back on outside click only while the draft is empty. |
| Tabs | `HomeFilterBar` (home + search) | **Threads' exact tab anatomy, warm-monochrome:** full-width EQUAL cells (`flex: 1 0 0` + `min-width: max-content` — equal while they fit; when a locale's labels overflow (ES search tabs) the row **scrolls on x** with a hidden scrollbar instead of crushing the cells, and the active tab auto-centers into view), 48px tall, centered `15px/600` labels (Inter, sentence case via i18n), baseline hairline `#ebe7dd` under the whole row (full-bleed via `-var(--layout-pad-x)` margins; it lives on each tab, so it travels with the scroll), inactive `#9b9591`, **active = `#1a1a1a` text + 1px `#1a1a1a` underline** over the baseline (`::after` at `bottom: -1px`), pressed = `opacity 0.6`. No eyebrow label, no mono, no accent color, NO count badges (with five equal search cells they threw the centered labels off — labels sit clean, Threads-style). |
| Floating menu panel | `menu/MenuSurface` | **THE app's menu surface (Threads' exact dropdown), single source:** 240px, radius 16, 8px padding, 0.5px `#e5e0d3` outline + their triple shadow (`0 0 80px .25 / 1px 1px 2px .05 / 0 8px 16px .06`), opening pop `scale(0)→1` 0.15s. Rows via its exported `menuStyles` (`item` 15/600 ink radius 8, hover `rgba(0,0,0,0.04)`, press `scale(0.98)`; `itemIcon` charcoal, `itemIconRight`, `itemDanger` `#ff3040`, full-bleed `divider`). Consumers: `PostOptionsMenu` (desktop panel) and the NavRail ☰ (which adds only anchor classes + its animated close). Never re-implement a floating menu panel. |
| Dropdown / select menu | `post/PostSortMenu` | Trigger (44px touch target) + floating menu of options (name + description + check). The canonical anchored-dropdown pattern — reuse it. See Dropdown menu. |
| Modals | `WelcomeModal`, `nav/LanguageModal` | Portal to body, surface `#fdfcf8`, border `#e5e0d3`, radius `18px`, backdrop `rgba(31,26,20,0.42)` + blur, shadow `0 18px 50px rgba(26,26,26,0.18)`. Focus trap + Escape + `aria-modal`. |
| Reaction picker / pill | `post/PostReactionPicker`, `post/PostReactionPill` | Popover radius `28px`; see Reactions. |
| Mask avatar | `MaskAvatar` | Identicon for the pseudonymous mask; procedural SVG from a seed (the mask hash) — same seed → same avatar, no network, no uploads; CIRCLE (radius 50%), never a real photo. **The mask IS the brand mark retold: a thread + its dot**, in FOUR seed-picked archetypes (normalized 36-unit box, rounded strokes): single coil (arc 130–260°, dot in the opening), double coil (two concentric arcs, offset mouths), the logo's own SERPENTINE (scaled master path, rotated in 45° steps), and orbit (tight off-center coil, dot orbiting opposite) — plus per-seed start angle, sweep, coil radius and dot size (2.7–3.6). All on a **curated warm duotone pair** (10 pre-checked bg·thread combos — terracotta/cream, tint/terracotta, umber/wheat, rare ink/sand… no independent bg/fg roll, no off-palette greens/blues). **Avatar size is `36px` everywhere content rows exist** (feed, search rows, thread OP AND replies at every depth — Threads' single avatar size); `56px` only in the profile hover card. **Activity dot (`online`)**: Threads-exact — green `rgb(94,231,71)` (their `--barcelona-green-dot`), **10px content-box** dot (at 36px; scales `size·10/36`, min 8) + **2px outward ring** (total 14px), anchored `bottom:-1px; right:-2px` so the ring overflows the avatar curve like Threads. Ring color = the surface BEHIND the avatar: default `#fdfcf8` (cards — incl. the search results surface); `ringColor` prop for other grounds. |
| Toasts | `contexts/ToastContext` + `ToastViewport` | Dark pill `#1a1a1a` / text `#f7f5f0`, **min-height `53px`**, **dynamic width** (`max-width: min(360px, calc(100vw-32px))`, wraps past it), radius `12px`, bottom-floating portal. `showToast({type,message,duration,action,icon})→id`; `type:"loading"` = persistent spinner; `icon:"none"` (copy confirms) / `icon:"check"` not needed (success check is **white `#f7f5f0`**, never green). `showToast.update(id,…)` morphs a toast in place (same node → no jump) for **"Publishing… → Thread posted"** sequences; `.dismiss(id)`. `action` renders a trailing link (e.g. "View"). aria-live polite / assertive(error) / busy(loading). |
| Identity tags | `home/HomeFeedCard` (`is_mine`), `post/PostReply` (`is_op`), `me/MeProfileHeader` (You) | Derived from backend **booleans** `is_mine`/`is_op` (anonymity — no author id leaves the server; `is_op` is local to the thread). "Your thread" (feed/search) and the thread-author "· Author" reply meta share ONE pattern: Threads-style **quiet meta** — a `·` divider + Inter timestamp-identical text (body-sized `400 #9b9591`) after the timestamp. No pill, no badge (the old warm pill shouted next to the whisper-quiet identity row). The `/me` "You" badge is the warmer pill (`10px/700`, radius `20px`). |
| /me profile header | `me/MeProfileHeader` | **Threads' exact profile anatomy, FLAT on the surface** (no card-in-card; /me is the fourth canonical surface screen) — the BASE for anonymous profiles (everything but the "You" pill generalizes to other users' masks): name block left ("Anonymous" `24px/600/1.4`, their `--system-24` h1, + the "You" warm pill `10px/700` radius 20 — /me only) with the **mask hash as the @handle line** — the WHOLE mono pill is the copy button (`#f7f5f0`/`#ebe7dd`/`#8b6f47`, hover `#f0ece3`, copy→toast) · **identicon right, Threads' 84px desktop / 64px mobile**, hairline `#e5e0d3` ring. Below: the stats as ONE quiet meta line ("**12** threads · **40** reactions · **5** replies" — `15px`, labels `#9b9591`, VALUES `600 #6b6b6b`, `·` in `#c4bfb1`; their followers-line language) + the "Joined April 2020" whisper (calendar glyph + `13px #9b9591`; from `/me`'s `joined` = the mask's create_at, month+year via `Intl.DateTimeFormat` in the UI language). No privacy note. **Profile tabs (Threads' strip): Threads · Media** (`HomeFilterBar`) — Media = the search grid verbatim (3-col 2px mosaic, one tile per thread = first file, carousel/Reel marks, NSFW blur), derived CLIENT-SIDE from the loaded threads (the pagination sentinel renders on the THREADS tab only — on the short media grid it stayed in view and chain-loaded every page), tile → `/p/:id` seeded. **`PostProfileHoverCard` mirrors this anatomy in miniature** (name 17/600 + mono hash pill left · 56px identicon right, quiet stats line, joined whisper — popover spec: radius 16, `0 8px 24px` shadow). **`/m/:maskId` is the PUBLIC twin (legacy `/anon/:maskId` redirects)** (`AnonProfileHeader`, same stylesheet): no You pill, public stats pair (posts · replies from `/users/<id>/`, which accepts the 6-hex public id), thread list via the search author filter (`@<id>`); clicking any avatar/mask (`PostProfileTrigger`, now a role=link) opens it — your own mask routes to /me. |
| Error screens | `screens/ServerError`, `screens/NetworkError` | Classified centrally (`ServerHealthContext`): a 5xx (HTTP response) → **server-down** screen; a request that failed **without a response** / `navigator.onLine===false` → **no-connection** screen (wifi-off icon, no HTTP code). Auto-recovers on the browser `online` event; manual retry re-checks `/health/`. Same warm layout for both. |
| States | `*EmptyState`, `*ErrorState`, `*Skeleton`, `*Spinner`, `*RetryBanner` | Every feed/screen ships loading (skeleton), empty, and error/retry variants — reuse them, don't reinvent. |

### Reactions (real set)

Defined in `post/PostReactionPicker.js` (and mirrored in the backend catalog / fixture). **Six**
reactions, in display order:

| id | emoji | English `label` (payload) | visible text |
|---|---|---|---|
| `love` | ❤️ | `love` | `reactions.love` |
| `laugh` | 😂 | `laugh` | `reactions.laugh` |
| `wow` | 😮 | `wow` | `reactions.wow` |
| `sad` | 😢 | `sad` | `reactions.sad` |
| `angry` | 😡 | `angry` | `reactions.angry` |
| `applause` | 👏 | `applause` | `reactions.applause` |

The English `label` is the **stable value** that travels in the API payload and must match the
backend `Reaction.name`; `labelKey` is only the visible (translated) tooltip/aria text. Do not
change `label` strings casually — they are data (changing the set means a backend migration + the
`reactions.json` fixture).

### Dropdown menu (anchored select)

Reference: **`post/PostSortMenu`** — the canonical warm dropdown. Reuse this shape for any
select-style menu instead of inventing a new one.

- **Trigger** — transparent button, `min-height: 44px` (mobile touch target), padding `9px 14px`,
  radius `10px`, gap `7px`. Inline SVG glyph + active label (`14px / 500`, `#1a1a1a`) + a chevron
  (`#a3a3a3`). Hover wash `#f0ece3` (neutral — never the terracotta tint). While the result is
  loading the chevron is swapped for a small spinning ring (`#c5a572` border, transparent top).
- **Menu** — surface `#fdfcf8`, border `#e5e0d3`, radius `8px`, padding `6px`, shadow
  `0 6px 24px rgba(26,26,26,0.08)`, `min-width: 224px`, `max-width: min(260px, calc(100vw - 16px))`.
  Anchored under the trigger and **opens to the right** (`left` base). Entry animation: fade +
  `scale(0.96→1)` + `translateY(-4px→0)`, `140ms ease-out`, `transform-origin: top left`; removed
  under `prefers-reduced-motion`.
- **Option** — full-width button, padding `11px 12px`, radius `8px`, transparent border. Two lines:
  name (`14px / 600`, `#1a1a1a`) + description (`11.5px`, `#6b6b6b`), with a trailing check
  (terracotta `#a85432`) kept in layout via `visibility` so rows never shift. Hover wash `#f7f5f0`.
  **Selected** = neutral fill `#f0ece3` + border `#e5e0d3` — the check is the selection signal, not
  an accent fill.
- **Viewport fit (mobile)** — the component measures its own width and nudges the menu left via an
  inline `left` offset so it never overflows on small screens (8px margin). Same approach as
  `PostReactionPicker`; measured in `useLayoutEffect` (no flash) and recomputed on resize.
- **Behavior** — closes on click-outside, Escape (restores focus to the trigger), and on **scroll**
  (capture + passive: an anchored menu must not float misaligned when content moves). Arrow keys
  move between options; opening focuses the active one.
- **A11y** — trigger `aria-haspopup="menu"` + `aria-expanded`; menu `role="menu"`; options
  `role="menuitemradio"` + `aria-checked`; decorative SVGs `aria-hidden`.

## Interaction patterns

### Press feedback — Threads-exact soft press

Threads-EXACT press: on press the control scales down SOFTLY and eases back on release — **no
overshoot/bounce** (Threads' own spec, decoded from their CSS: `transition-property: transform`,
duration `0.15–0.2s`, plain `ease`; the earlier 0.12s overshoot-bezier spring read abrupt and was
replaced). **Centralized** as two global utility classes in `src/styles/index.css` (global, not a
CSS Module) — never re-implement it per component:

```css
.springPress     { transition: transform 0.15s ease, background .14s ease, color .14s ease, opacity .14s ease; }  /* text buttons */
.springPressIcon { transition: transform 0.2s ease,  background .14s ease, color .14s ease, opacity .14s ease; }  /* icon-only controls */
.springPress:not(:disabled):active     { transform: scale(0.96); }
.springPressIcon:not(:disabled):active { transform: scale(0.9); }   /* Threads' action-icon pair */
@media (prefers-reduced-motion: reduce) {
  .springPress, .springPressIcon { transition: background .14s ease, color .14s ease, opacity .14s ease; }
  .springPress:active, .springPressIcon:active { transform: none; }
}
```

- **Media frames** (`ThreadMedia .frame`, JS-driven `.pressing`) use Threads' exact media-cell
  trio: `scale(0.98)` + `transition: transform 0.2s ease, border-radius 0.3s ease`.
- (The reaction picker's emoji hover-pop keeps its own playful overshoot — that's a hover
  GROW, not press feedback.)
- **Rules:** (1) `:not(:disabled)` → a **disabled** control NEVER springs (no misleading press
  feedback — e.g. the inactive "Post" button). (2) Honors `prefers-reduced-motion` (no transform).
  (3) The transition also carries `background/color/opacity` so it **coexists** with hover washes
  (e.g. the nav `#f0ece3`) from one declaration — affected components drop their own `transition`
  so the global class is the single source (no cascade clash). (4) Visual-only — never affects
  focus (`:focus-visible` intact) or `aria`.
- **Applied to** (only these, for now — do not spread app-wide): nav controls (desktop NavRail
  items + mobile bottom-bar items + app-bar ☰/search), the three-dots options trigger, the
  primary submit buttons ("Post" in `HomeCompose`, "Reply" in `PostCommentBox` — these spring
  only when enabled), and the modal CTAs/options (`WelcomeModal` "I understand",
  `LanguageModal` options + "Close").

### Nav icon states (mobile)

Shared, centralized in `NavRail.module.css`: idle **`#a3a3a3`**; hover (`@media (hover:hover)`)
and tap (`:active`) → **`#1a1a1a` icon + `#f0ece3` pill**; the bottom-bar **active route** keeps
its own warm blob **`#f3e3d3` fill + `#a85432` icon** (declared last so it wins over hover). Icon
stroke is bumped to **`2.3px`** on mobile (Threads-like weight) via a CSS override scoped to
`.appBarButton svg` / `.bottomBar .item svg` — the shared `NAV_ITEMS` glyphs stay `1.8` on desktop.

### Frosted glass bars

The mobile bottom bar, the view-thread mobile app bar and the search mobile masthead share one
recipe (the NavRail top app bar is SOLID `#fdfcf8` — see NavRail above):
frosted glass + `-webkit-backdrop-filter`/`backdrop-filter: blur(28px) saturate(180%)`
(Threads-strength; the high `0.88` alpha keeps the background barely perceptible, frosted not
transparent), hairline border `#ebe7dd`. **Frosted glass is a MOBILE-ONLY treatment** (`≤700px`),
where the bars are **white** `rgba(253, 252, 248, 0.88)` (`#fdfcf8` @ 0.88 — Threads uses a white
bar over the off-white page). On **desktop** (`>700px`) the thread app bar is **solid `#f7f5f0`**
(no translucency/blur — Threads' desktop header is opaque too, and it pairs with the corner mask);
the NavRail mobile app bar + bottom bar don't exist on desktop; the search masthead is solid
`#f7f5f0` on desktop and frosted (this recipe) on mobile — the old `SearchAppBar` was deleted.
**Fallback:**
`@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)))` → solid
(`#fdfcf8` mobile / `#f7f5f0` desktop; never illegible). On mobile, content blurs through as it
scrolls under the fixed bar.

### App-bar entrance ("you've arrived")

The drill-in screens (thread view `/p/:id` + public profile `/m/:maskId`) share the shell with the
screen you came from, so their app bar plays a one-shot mount choreography that signals the context
switch: the **back button slides in from the left** (`translateX(-10px)→0` + fade — the direction
you came from; the desktop floating circle adds `scale(0.7)` so the disc "materializes"), and the
**title settles upward one beat later** (`translateY(5px)→0`, `70ms` delay). Both `0.45s
cubic-bezier(0.16, 1, 0.3, 1)` (expo-out — decelerates, never bounces) with
`animation-fill-mode: backwards` so the delayed title is invisible until its beat. The thread
subtitle ("N replies") carries its own quiet `0.3s` rise so it announces itself whenever the data
lands (instant from cache, later from network). Removed under `prefers-reduced-motion`. Keyframes
live per stylesheet (`Post.module.css` `barSlideIn/barPopIn/barRiseIn`, `MyThreads.module.css`
`profileBar*` for the profile bar). Top-level screens (home/search/me) do NOT play it — arriving
somewhere is the signal, switching tabs is not.

### New-thread highlight

The just-created thread's feed card briefly highlights then fades to normal so the user spots
it at the top: `@keyframes` 0–65% warm `#f3e3d3` + inset ring `#d8b89a`, 100% transparent, `3600ms
ease-out forwards`. Animates **only background-color + box-shadow** (the "border" is an inset
shadow) → no layout shift. `FeedContext` clears the `newPostId` mark after the fade (so it never
re-triggers on scroll/re-render); reduced-motion shows a static highlight that simply clears.

### Loading buttons (no resize)

A submitting button keeps its exact size: the label always renders the resting text (e.g. "Post")
with `visibility: hidden` while submitting (box kept), and a spinner is centered over it with
`position:absolute; inset:0; margin:auto` (centered **without** `transform`, so the rotate
animation doesn't fight the centering). `aria-busy` + an `aria-label` announce the busy state.

## Iconography

- **Inline SVG only** — there is **no icon library** (no Tabler/Feather package; the establishement
  of "Tabler" is not true in this repo). Icons are hand-authored `<svg>` (≈27 components).
- **Style:** `viewBox="0 0 24 24"`, `fill="none"`, `stroke="currentColor"`, `stroke-linecap="round"`,
  `stroke-linejoin="round"` — a Feather/Lucide-like outline style.
- **Stroke width:** `1.5` default (most common); `1.8`/`2` for small/dense icons. Keep one weight per
  context; don't mix.
- **Sizing:** render at `20–22px` in nav/menus. Color via `currentColor` (inherits text color).
- **Mobile nav weight:** nav glyphs are bumped to `2.3px` on mobile via a CSS override (see
  Interaction patterns → Nav icon states) for a heavier, Threads-like presence; desktop stays `1.8`.
- **Mobile hamburger (☰):** an **asymmetric** mark — two rounded lines, the bottom one shorter
  (`M4 8 h16` / `M4 16 h10`-ish in the `0 0 24 24` viewBox) — lighter than the desktop rail's
  3-bar glyph. The desktop ☰ keeps the 3 equal bars.
- Use icons with an accessible label (`aria-label` on the control, or adjacent text); decorative
  icons get `aria-hidden="true"`.

## Brand

The brand mark is the **serpentine "thread + dot"** — a thread winding back and forth with a dot at
the top-right (whoever starts the thread). Source of truth: `src/components/BrandLogo.js` (inline
SVG) + masters in `brand/`. Glyph: path `M24 17.5 Q46 25.75 24 34 Q46 42.25 24 50.5` (stroke 5.5) +
dot `(44.5,19) r4.5`, on a `rx=17` squircle, `viewBox 0 0 68 68`.

**Variants by context — never swap them:**

| Context | Variant | How |
|---|---|---|
| Nav rail | **`plain`** — terracotta `#a85432` thread, **no background** (no divider — Threads' sidebar has none) | `<BrandLogo variant="plain" />` |
| Splash / Welcome modal | **`tile`** — cream thread on terracotta squircle | `<BrandLogo />` (default) |
| Favicon / app icon / OG image | **terracotta background** (cream thread) | static assets in `public/` |

**Do NOT:** put the nav logo on a terracotta box; ship the OG/app icon without its terracotta
background; recolor the thread (always `#a85432` on light, cream on terracotta); reintroduce the
rejected smooth-S/loop variant.

## Content & tone

- **Sentence case** for ALL UI text, in **both English and Spanish** — capitalize only the first
  letter of the phrase (plus proper nouns / brand & feature names). **Never Title Case** (it is
  incorrect in Spanish and dated in English). Applies to buttons, labels, placeholders, titles,
  tabs, badges and messages.
  - ✅ EN "Post", "Posting as {{alias}}", "Enable location", "Not now" · ES "Publicar",
    "Publicando como {{alias}}", "Activar ubicación", "Ahora no".
  - ❌ "Publicar Como", "Enable Location", "Near You" (Title Case — forbidden).
  - **Exempt (keep their own capitalization):** brand/feature names — `Thiup`, `Close You` /
    `For You` (and ES `Cerca de ti` / `Para ti`). And **never** sentence-case: user content,
    numbers/counters (`{{count}} / {{max}}`), or interpolated values/aliases.
  - Note: the i18n value carries the correct sentence case even where CSS `text-transform:
    uppercase` renders it caps (tabs/badges) — so the case is right if the transform is ever removed.
- Voice: human, sober, respectful; short and plain. No hype, no exclamation spam.
- **All user-facing strings via i18n** (`src/i18n/locales/en.json` + `es.json`); never hardcode
  copy in components. Title per route via `usePageTitle(key)` (format `"<page> · Thiup"`; Home = just
  `Thiup`).
- **Exception (not a TODO):** Spanish i18n values and Spanish **user content** are **data** — do not
  "translate" or normalize them. UI chrome is translated; user content is preserved as written.

## Accessibility

**Real state (verified):**
- `aria-label` on icon-only controls; `aria-current="page"` on the active nav item; `aria-hidden` on
  decorative SVG. Error screens use `role="alert"`; modals use `role="dialog"`/`"alertdialog"`,
  `aria-modal`, focus trap, Escape, and focus restore.
- A visually-hidden technique exists (`clip: rect(0,0,0,0); width:1px`) in a few components
  (`PostCommentBox`, `PostReply`, `PostProfileHoverCard`) — but there is **no named global
  `sr-only` class** and headings are sparse (only ~3 `<h1>` + ~2 `<h2>` total).
- Focus ring: `inset 0 0 0 2px #c5a572` (visible, warm) — a component-level `box-shadow`. The
  **UA focus outline is disabled app-wide** (`:focus, :focus-visible { outline: none }` in
  `index.css` — product decision: the browser's blue ring flashed on openers when modals
  restored focus on Escape). Focus itself is preserved (tab order / restores intact); any
  control that needs a visible ring draws the warm inset box-shadow. Contrast holds on the
  cream palette (text `#1a1a1a`/`#6b6b6b` on `#f7f5f0`/`#fdfcf8`). `prefers-reduced-motion`
  is honored; hovers are gated behind `@media (hover: hover)`.

**Recommended going forward (not yet a codebase-wide convention):**
- Add one visually-hidden `<h2>` (or `<h1>`) per screen as a screen-reader landmark, and consider a
  single shared `.srOnly` utility class instead of repeating the `clip` snippet per component.

## Privacy in the UI (hard rules)

- Never put thread content, author masks, or search queries in: OG/Twitter previews, JSON-LD,
  sitemap, or any **crawlable / shareable** surface.
- **Document titles are an exception (product decision):** `/p/:id` shows the thread text
  (Threads-style) and `/search` shows the query (X-style `<query> - Search / Thiup`, via
  `prefixSeparator: "-"` + `separator: "/"`), through `usePageTitle`'s `prefix` arg
  (whitespace-collapsed + truncated to 70 chars). This affects only
  the browser tab/history — these routes stay `noindex` and their share image stays the static
  brand card, so nothing leaks to crawlers or link previews.
- The OG/share image is the **static brand card** for the whole app — never per-thread.
- `/p/:id` (canonical short thread URL; legacy `/post/:id` redirects to it), `/search`,
  `/notifications`, `/me`, `/m/:maskId` (legacy `/anon/:maskId` redirects to it) are `noindex` (via `usePageTitle(key, { noindex: true })`) and
  blocked in `robots.txt`. Only `/` is indexable.

## DESIGN RULES for AI agents

1. **Use the warm palette tokens above. `#FFFFFF` is FORBIDDEN — use `#fdfcf8`** for elevated
   surfaces. Reuse an existing token before adding any new color.
2. **Reuse existing components/patterns/tokens.** Do not introduce new color systems, new component
   styles, CSS variables, CSS-in-JS, or UI libraries.
3. **Brand by context:** nav = no-background thread+dot + thin divider; favicon/app-icon/OG = terracotta
   background. Never swap these or recolor the thread.
4. **Sentence case** for UI text in EN & ES — first letter only (+ proper/brand names like Thiup,
   Close You). Never Title Case. Excludes user content, numbers/counters, and interpolated values.
   See Content & tone for examples.
5. **All UI text via i18n (en/es).** Never hardcode user-facing strings. User **content** stays in
   Spanish (it is data).
6. **Icons = inline SVG**, Feather/Lucide outline style (`viewBox 0 0 24 24`, `stroke="currentColor"`,
   width `1.5`). No icon packages.
7. **Accessibility:** `aria-label`s on icon controls, `aria-current` on active nav, `role="alert"`
   on errors, focus ring `#c5a572`, sufficient contrast, honor reduced-motion. **Add** a
   visually-hidden landmark heading per new screen (see Accessibility — not yet universal).
8. **Respect the anonymous/sensitive nature:** sober, low-arousal UI; never expose user content in
   chrome (titles/previews/metadata).
9. **JS, not TS. CSS Modules.** No heavy new dependencies; keep the bundle lean.
10. **Ship the full set of states** (loading/skeleton, empty, error/retry) for any new feed/screen.
11. **Keep this doc updated** when the design system changes, and prefer fixing the flagged
    inconsistencies over copying them.
12. **ENGLISH ONLY in code.** Every comment, docstring, JSDoc and identifier is written in
    English — no exceptions. When you touch a file with legacy Spanish comments, migrate those
    lines to English (don't mass-rewrite untouched files). **Single exception:** Spanish i18n
    translation values (`es.json`) and Spanish user content are **data**, not code — never
    "translate" or rewrite them (see rules 4–5 and Content & tone).

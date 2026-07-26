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
| `#ebe7dd` | Border (default) | Chrome dividers (modal headers/footers, menu rows) and hover washes. **NOT content-row dividers anymore**: every divider between feed cards / replies / search rows (and the tabs baseline, compose hairline, composer-dock top) is Threads' exact `0.5px rgba(0,0,0,0.15)` (`--lines-primary`) — see the Feed screens layout rules |
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
  Kept for stat counters, trending/momentum badges and the `/profile` hash pill — it signals
  "machine/pseudonymous data". **Mask `@id` + timestamp rows are Inter EVERYWHERE** (thread view
  AND feed cards, reconciled) at a **FIXED `14px`** — the Inter-compensated match for Threads'
  measured 15px SYSTEM font (Inter's larger x-height reads bigger at equal size; the old
  body-sized clamp made the identity row shout on desktop). Hierarchy from weight/color only:
  mask `600 #1a1a1a`; time + "· Author" + "Your thread" meta `400 #a3a3a3` (a step more faded
  than the body's grays — Threads' meta reads muted next to their ink). Content BODIES (feed card,
  preview, OP, replies, ancestors) are the SAME fixed `14px` (the old fluid clamp to 15px is gone
  — at 15px Inter the cards read oversized next to Threads).
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
    the container edge. **Home's vertical rhythm is Threads-exact (measured on threads.com):**
    `.surface` is `padding: 8px 24px 0` — 8px top (their column body's padding-top before the
    compose row), NO bottom (the last row's own 12px rests on the rounded bottom edge) — and every
    in-feed hairline (card dividers, compose strip, tabs baseline) is their `0.5px
    rgba(0,0,0,0.15)` (`--lines-primary`), not the heavier 1px `#ebe7dd`. **On mobile (≤700px)
    every sheet's inset drops to `16px`** (`--layout-pad-x: 16px` — the 24px is Threads' DESKTOP
    column value; 16 is their small-screen row padding and the thread-view inset, ONE shared edge
    across all full-bleed sheets). These rules now govern ALL the feed surfaces: home
    (`8px 24px 0` / mobile `8px 16px 0`), search (`4px 24px 0` / mobile `0 16px 0`) and
    profile + /m/:maskId (`12px 24px 0` / mobile `12px 16px 0`) — bottom always 0 (the
    flush-media variants dropped their old `-12px` bottom-padding eater accordingly). **Search is the third canonical surface screen and is ONE responsive
    layout at every breakpoint** (the old mobile `SearchAppBar` + its `SearchSuggestions`/recent-
    searches dropdown were DELETED): a 60px solid masthead with the centered "Search" title
    (Threads' search column header) + corner mask (desktop), and ONE `.surface` card containing
    **Threads' in-card search box** (44px recessed rounded-16 field on `#f7f5f0`, magnifier 16px
    `#b8b8b8`, input 15px; autofocus on landing is desktop-only — never pop the mobile keyboard
    on navigation) with **LIVE results as you type** (the input debounces 350ms into `?q=` with
    `replace` — the URL stays the single source of truth for tabs/cache/deep links), then the
    tabs+results (query mode) or the trending suggestion rows (landing). On mobile the surface
    dissolves into the canonical `#fdfcf8` full-bleed sheet (`useMobileSurfacePage`, same as
    /home and /p/:id) and the masthead is HIDDEN — the NavRail mobile app bar (☰ + centered
    logo, home's exact header) renders on /search too and replaces it (content offset 60px).
  **HARD RULE:** `--layout-pad-x` MUST always equal the real side padding of its container, at
  **every breakpoint** — if you change the padding (incl. inside a media query), change
  `--layout-pad-x` to match, or the carousel over/under-shoots the column edge (last item cut off /
  first item misaligned). The carousel **gap is `6px`** (`--barcelona-carousel-gap`, in `ThreadMedia`).
- **Elevated surface screens (`/p/:id`, `/home`, `/search`, `/profile` and `/m/:maskId`) — the
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
    **The thread app bar (Threads' new post header):** grid
    `1fr · minmax(auto,65%) · 1fr` (gap 16) with the middle column truly CENTERED — desktop = the
    title block ("Thread" + N replies); mobile = the centered 32px BRAND logo instead (Threads'
    thread header carries the logo, not a title — same slot/press as the NavRail app bar brand, a
    button → /home, riding the title's entrance beat) — and NO options menu in the bar — the three-dots lives on the parent thread's
    header row (`Post .opHeader`, like a reply's), mobile included. **Sorting lives in the
    replies bar (`PostRepliesBar`)** — Threads' exact bar between the OP's full-bleed divider and
    the replies (rendered only when there ARE replies; it doubles as the post-sort scroll
    anchor): LEFT = the `PostSortMenu` trigger (Threads' filled 16px sort glyph + label `14/600`
    + their 12px chevron, secondary `#9b9591`, hover `#f0ece3` wash + `#6b6b6b`, 36px tall,
    `margin-inline-start: -8px` aligns the icon with the content edge); RIGHT = "View activity"
    (same anatomy mirrored, label `14/400`, Threads' left-chevron path rotated 180° — a visual
    PLACEHOLDER like the nav Create +, no behavior until the backend ships an activity feed).
    Only the back button splits:
    desktop = Threads' floating circular button (24px `#fdfcf8` circle, 0.5px `#e5e0d3` hairline,
    shadow `0 2px 8px rgba(0,0,0,0.08)`, their exact 12×12 arrow glyph, hover `scale(1.1)`);
    mobile = Threads' exact mobile-header Back (via `useIsMobile`): 20×20 glyph (their own post page renders it at --x-width/height 20px; their
    line/polyline coords verbatim, stroke 2, round caps) in a 52×52 circular target anchored at
    Threads' 2px screen-edge offset (`margin-inline-start: -10px` cancels the bar's 12px padding
    — the arrow sits ~16px from the edge, not 26), pressed with their soft `scale(0.9)`
    (`transition: transform 0.2s ease`). Same spec on the profile bars
    (`MyThreads .profileBackButton`).
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
    light), **active = the warm `#f3e3d3` blob + `#a85432` icon** — DESKTOP-ONLY now: the
    mobile bottom bar went Threads-exact blob-less (state lives in the glyph — see the bottom-bar
    bullet); the rail keeps the terracotta blob as the desktop brand moment.
    Items in Threads' order: Home / Search / **Create (+) — Threads' exact plated button
    (always-visible plate `rgba(0,0,0,0.035)` radius 10, inset 6px vertical, + glyph `#999999` =
    their `--barcelona-secondary-icon`; opens the global `ComposeModal` — rendered on the desktop
    rail AND the mobile bottom bar)** / **Notifications (their exact heart glyph; routes to `/notifications`, a noindex
    placeholder empty-state screen until the backend ships an activity feed)** / My threads. **Nav glyphs are Threads' EXACT icons** (24×24
    paths lifted verbatim: Home / Search / Notifications / Profile, plus their asymmetric "More" — rounded
    bars 21px + 14px × 2.5px, rx 1.25). The DESKTOP rail shows each item's `railIcon` (the filled
    set); the MOBILE bottom bar swaps each item's `barIconIdle`/`barIconActive` pair instead (see
    the bottom-bar bullet) — an exception to the app-wide outline icon style, scoped to the nav;
    the mobile ☰ keeps its stroke glyph.
  - **Mobile (`≤700px`) top app bar** — `height: 60px`, **FIXED** (`top: var(--kb-top)` — same
    anti-rubber-band treatment as the thread app bar; /home compensates with 60px of mobile
    top padding), **Threads' EXACT frosted header** (`rgba(253,252,248,0.85)` — their
    `--barcelona-header-background` @ 0.85, warm-adjusted — + their `blur(28.5px)`; solid `#fdfcf8`
    fallback without backdrop-filter; it fuses with the mobile `#fdfcf8` sheet, BORDERLESS — no
    hairline), grid
    `[☰] · [logo centered] · [balance span]` — no magnifier: Search lives in the bottom bar now,
    like Threads' mobile header. The **☰ reuses the SAME NavRail menu**
    (Languages / About — the `MenuButton` with `variant="header"`); the logo is Threads' EXACT
    mobile-header slot — a **32×32 box the glyph FILLS** (`BrandLogo size={32} variant="plain"
    fit="glyph"`; at the old `size 36` the master viewBox's air shrank the visible mark to ~20px),
    a **button → `/home`** like theirs (press `scale(0.98)` on the svg, 0.2s ease-in-out).
    The header renders **on
    `/home` AND `/search`** (on mobile it REPLACES search's masthead, which is desktop-only; the
    thread view and the profile keep their own back bars → no double headers).
    The ☰ is Threads' EXACT header "More" glyph: two EQUAL filled rounded bars (24×24, 2.5 tall,
    rx 1.25 — see Iconography).
  - **Mobile bottom bar** — fixed, **Threads' EXACT mobile nav**: five `20%` grid cells on a
    **50px** bar (their `--barcelona-small-screen-nav-height-short`), each item filling its cell
    minus a 4px margin (their inset plate: ~42px tall, radius 8, nearly cell-wide — hover wash,
    active blob and Create's plate all live on that box), icons 24px, frosted with the header recipe (`rgba(253,252,248,0.85)` + `blur(28.5px)`).
    Order: Home / Search / Create (+) / Notifications / Profile. **Threads-exact states (their
    mobile anatomy, decoded + measured live): NO persistent background on the active route —
    the STATE lives in the GLYPH.** Each item carries an idle/active pair lifted verbatim from
    threads.com (`barIconIdle` = their OUTLINE set: outline house / thin 2px magnifier / outline
    heart / outline person; `barIconActive` = their SOLID set: solid house / bold magnifier /
    solid heart / solid person), CSS-swapped by route; active tint stays the brand `#a85432`
    (not their ink). Their plate (`--barcelona-navigation-item-hover-background`, radius 8,
    inset 4px, opacity 0 at rest) is hover/press feedback ONLY — ours mirrors that: the
    `#f0ece3` pill shows on hover/tap (terracotta held on the active item), never persists.
    The desktop rail is untouched (one `railGlyph` filled set + the warm blob). Hidden while the
    keyboard is open (`useKeyboardOpen`); honors `safe-area-inset-bottom`.
- **AppShell** mobile `padding-bottom: 64px` keeps the bottom bar clear; the FIXED app bar does NOT
  offset the top — each screen that shows it adds the 60px itself (home and me: mobile
  `padding-top: 60px`).

## Components (catalog)

Reference component: **`HomeFeedCard`** — the thread cell that defines the feed look.

| Component | File(s) | Notes |
|---|---|---|
| Ancestor chain (comment permalink) | `post/PostAncestor` | **Threads' thread continuity**: `/p/:id` accepts a REPLY uid; the backend then sends `parents` (root → immediate parent, mapped to `thread.ancestors`) and `Post.js` renders one `PostAncestor` per node ABOVE the OP section. Row = a depth-0 reply/feed row (36px gutter + identity row with the SAME inline three-dots `PostOptionsMenu` as replies — View details / Copy link / Report, header OUTSIDE the navZone so the menu never nests in a role=link — + full body + media bleed + quiet stats: `ReactionStack` + reply count), whole row navigable to that node's own `/p/:id` (seeded; the navZone wraps the body, `HomeFeedCard`'s guard pattern on the rest). Threadline trunk `2px #e5e0d3` centered on the lane (`left: 17px`), floating segment `top: 56px → bottom: -12px` with Threads' 4px breathing gaps at BOTH avatars (next avatar always sits 16px below the row: ancestor rows 12px padding + 4px cell offset; the OP adds `.opSectionChained { padding-top: 16px }`). The FIRST node (`.first`) drops its 12px top padding and pulls -4px so its avatar lands at the exact 20px the OP's does on a root permalink (symmetric landing; its trunk compensates at `top: 44px`). "· Author" meta only on non-root ancestors (`is_op` comes computed vs the chain ROOT). No divider inside the chain — the trunk IS the connection. **Landing anchor (Threads' behavior):** whenever the entry has NO saved position in the scroll manager (`hasSavedScrollPosition`, exported by ScrollToTop — ONE rule covering preview/ancestor clicks, cold deep links, RELOADS — the entry keeps its location.key but the in-memory positions are gone — and re-entries; real back/forward HAS one → the manager restores it and the anchor stands down), a layout effect pins the head section just under the 60px app bar. The GUARANTEED scroll room is a SEPARATE, always-on effect (not gated by the anchor): whenever the chain renders — push, back/forward AND reload alike — the surface's min-height is set to `calc(100vh - 60px + <head offset RELATIVE to the surface>)` (measured via rects — `offsetTop` resolved against a farther offsetParent since the surface is unpositioned, overstretching the card ~80px and cutting the bottom-docked composer out of the anchored viewport; with the relative offset the card ends flush at the fold: head under the bar, composer fully visible) (one full column below the head + the chain above; ResizeObserver re-applies as ancestor media resolves; Threads reserves inline min-heights on its virtualized cells for the same reason). Deterministic — a function of the CHAIN only, never of transient skeletons/replies (the old post-anchor grow measured those and caused a grow-then-shrink jump) — and present on POP remounts, so positions the scroll manager saved on a previous visit stay reachable (they were stranding mid-way when the old inline grow was cleaned up on exit). The composer stays pinned to the card's bottom via its existing margin-top:auto dock. Landing = the head's top edge at the bar's bottom: the parent content is FULLY hidden and only the threadline stub in the chained section's 16px padding peeks (the "there is thread above" indicator). First pass instant, pre-paint — no root-first flash — then held by MANUAL SCROLL ANCHORING: a ResizeObserver re-anchors on every chain resize (ancestor media resolving — incl. legacy files WITHOUT stored dimensions, whose frames reflow on load — and font swap), active until the FIRST user wheel/touch. The effect is keyed on STRUCTURE (`ancestors.length > 0` + location.key), never on the `post` object — the seed→fetch swap replaces the object identity and used to clean the observer up mid-flight — and it carries NO "once per entry" ref gate: StrictMode double-invokes mount effects, and a gate left the second run without a live observer (seeded feed clicks drifted while deep links held). `hasSavedScrollPosition` alone decides re-anchor vs restore. **Scroll-to-root pill (Threads'):** on POP arrivals (direct link, reload, back/forward — never preview clicks, which are PUSH) a floating pill announces the hidden chain: fixed top-center under the bar (`Post .rootPill`), a FACEPILE of the chain's UNIQUE masks (deduped root-first — a self-thread repeats its author) + Threads' exact 12px arrow (their left-arrow path in a `rotate(90deg)` span). Faces are 24px `MaskAvatar` coins overlapped ReactionStack-style (−8px, 2px pill-bg separation ring, root on TOP via inline z-index); up to 3 — longer chains collapse to 2 faces + a quiet "+N" bubble (24px `#f0ece3` coin, 10/600 `#6b6b6b`), warm pill (#fdfcf8, 0.5px hairline, radius 999, drop-in entrance; own composed press scale — the global springPress would clobber the translateX(-50%) centering). Visible while `scrollY > 40` and not dismissed; clicking stops the landing anchor's pinning (via `anchorStopRef`), dismisses, and rides to the top with a SELF-DRIVEN rAF ease-out (~500ms — native smooth scrollTo gets cancelled by the dismissal commit; a user wheel/touch aborts the ride). i18n: `post.scrollToRoot`. Known minor: on systems with classic scrollbars, the bar appearing after load can recenter the fixed pill by ~half its width — a global stable-gutter rule was tried and REVERTED (it changed the app-wide scroll/lock model and regressed the reload flow); fix it only with a dedicated, fully-verified pass. CRITICAL detail: the observed box is a dedicated WRAPPER around the ancestor articles, never the surface — the surface's box is min-height-stretched by the scroll room, so it does NOT resize when the chain grows and a surface observer never fires (the bug that kept exposing the parent's tail). Same wrapper drives the scroll-room re-apply. The landing carries a +1px bias so sub-pixel rounding can never leave a hairline of the parent peeking. Runs after ScrollToTop's scroll-to-0, which mounts earlier). Real back/forward never anchors — the scroll manager restores the exact previous position. Keyed per history entry (location.key), so revisits re-anchor. |
| Thread card | `home/HomeFeedCard` | **Threads feed-row grid**: avatar (36px circle; the hairline ring comes from `MaskAvatar` itself) in a left gutter (`36px + 12px gap` = Threads' 48px threadline lane); username row + body + media + stats stacked in the content column (same anatomy as `PostReply`). `padding: 12px 0` (the screen container provides the 24px feed inset), **no hover wash**. Threads-exact rhythm: avatar cell `padding-top: 4px`, username row `line-height: 21px` + body 3px below, stats row `margin-top: 6px`. Media bleeds asymmetrically like replies (start cancels the lane + container padding; end just the container padding). Divider = full-bleed `::after` (**0.5px `rgba(0,0,0,0.15)`** — Threads' exact `--lines-primary` feed divider, measured on threads.com; `left/right: calc(-1 * var(--layout-pad-x))`; hidden on the last card). No "End of feed" marker. Header: mask `@id` Inter body-sized `clamp(14→15px)/600` (`#1a1a1a`) + timestamp same size `400` (`#9b9591`, `min-width: 24px` centered), gap 6 — Threads' exact identity row, same as the thread view (see Typography). Trending badge: uppercase mono, `#c53030` on `rgba(197,48,48,0.08)`. **Conversation preview (X-style two-story card, EVERY feed surface — home, search posts tab, /profile and /m/:maskId; never the thread view):** when the backend attaches `top_reply` (two rules in cascade: the root author's FIRST self-continuation — no threshold, X's "the author's thread never competes", it renders with the "· Author" meta — or, without one, the best third-party reply EARNED via the unique-reactors gate; most cards still carry none), the card grows a second story: the reply row (same 36px gutter grid; identity row with optional "· Author" + the reply's OWN inline three-dots `PostOptionsMenu` — header outside the navZone, PostAncestor's anatomy; text clamped to 3 lines in a keyboard navZone; REAL media via `ThreadMedia` with the reply-style asymmetric bleed; quiet stats) threadline-connected to the root avatar (trunk `top: 44px → bottom: -12px` on `.rootSection`, PostAncestor's spec — 4px gaps at both avatars). The preview navigates to the REPLY's own `/p/:id` permalink seeded WITH THE KNOWN STRUCTURE — the reply as head + the root as its `ancestors` (a preview reply is always depth 1) — so the permalink paints chain-complete on its first frame and anchors pre-paint; the fetch only reconciles and fills the reply's own replies below the fold (no pop-in above the head — the pop-in was the layout-jump the seed kills). Ancestor-row clicks inside a permalink seed the same way (the chain sliced above the clicked node). Reloads/deep links have no seed and keep the fetch-first flow — feed → permalink → chain, one system. |
| Primary button | `WelcomeModal .button`, etc. | `background:#1a1a1a; color:#fdfcf8; border-radius:12px; font-weight:600; padding:13px 14px`. Hover = `opacity` transition. **Dark fill, cream text — never white text-on-white.** |
| Chips / tags | `search/SearchTagCard`, compose tags | Rounded (`3–8px`), warm tint `#f3e3d3` bg or subtle border; small mono/`11px` text. |
| Inputs | `HomeCompose`, `SearchNew .searchBox`, `PostCommentBox` | Surface `#fdfcf8`, border `#e5e0d3`, focus ring `inset 0 0 0 2px #c5a572`. **`PostCommentBox` (thread reply) is Threads' exact composer:** the pill = radius 24, `0.5px #e5e0d3` border, TRANSPARENT fill, `padding: 6px` (their `--x-paddingInline: 6px` — the send disc sits 6px off the pill edge), gap 12, avatar 36, input `15px/1.4` + 7px block padding. Toolbar icons are Threads' BARE 20px glyphs (no 36px boxes, no hover wash): `#999999`, hover `scale(1.1)` / press `scale(0.97)` at `transform 0.15s`, spaced by the toolbar's 12px column-gap; the icon cluster sits **8px** from the send disc (their `padding-inline-end: 8px` → a -4px margin on the disc nets it). Toolbar order (Threads-exact): EMPTY = attach · expand; with content = expand · send. On mobile it's a fixed band GLUED to the bottom nav — Threads' formula `bottom: calc(50px + safe-inset)` (a CONSTANT, never derived from the visual viewport), band `#fdfcf8` + `0.5px rgba(0,0,0,0.15)` top hairline + 8px padding; only the real docked-keyboard state (`useKeyboardOpen`, with 120/60px open/close HYSTERESIS + rAF-coalesced var writes — the iPad floating keyboard flickered a single threshold) switches it to `bottom: var(--kb-inset-bottom)`. Its submit is **Threads' EXACT send button** (decoded from their CSS): a 36×36 ink disc (radius 50%, `#1a1a1a`/`#fdfcf8`) holding their 12-viewBox arrow at 14px rotated 90° (points UP), replacing the old labeled "Reply" — it POPS in when content appears with their exact entrance `opacity 0 + scale(0) → 1`, `0.18s cubic-bezier(0.17, 0.84, 0.44, 1)`, origin center (none under reduced-motion; spinner centers over the hidden icon while posting). Its toolbar carries Threads' exact **"Expand composer"** glyph (20px filled diagonal arrows) which opens **`PostReplyExpandModal`** — Threads' reply dialog: canonical modal chrome (mobile = full-screen sheet), header `Cancel · "Reply" · spacer`, the PARENT being replied to (avatar + mask/time + 4-line-clamped text + its media via the REAL `ThreadMedia` — carousel/video/NSFW blur, bleed vars zeroed so it stays text-aligned; `replyingTo` carries `media` for reply targets; the `MediaViewer` lightbox sits at z-index 1200, above dialogs — threadline trunk descending 2px `#e5e0d3` with breathing gaps into your row), your row (avatar + @id + the SAME draft: text/media state stays in `PostCommentBox`, the dialog is just another view — expanding/collapsing never loses anything), footer = labeled Media button + tags/over-limit counters + primary dark Reply. **`HomeCompose` is Threads' exact compose row and ONLY an entry point now, DESKTOP-ONLY (hidden ≤700px — the mobile sheet leads with tabs + feed; on mobile creation lives behind the bottom bar's +):** a quiet strip — avatar 36 · "What's new?" prompt (`15/400 #9b9591`, 8px margins + 4px lead) · bordered Post button (36px tall, radius 10, `1px rgba(0,0,0,0.15)`, `15/600 #1a1a1a`) — `padding: 16px 0` + full-bleed bottom hairline (0.5px `rgba(0,0,0,0.15)`, one tone with the feed dividers); clicking anything on it opens the global **`ComposeModal`** (see Modals), where the actual composing happens. |
| Tabs | `HomeFilterBar` (home + search) | **Threads' exact tab anatomy, warm-monochrome:** full-width EQUAL cells (`flex: 1 0 0` + `min-width: max-content` — equal while they fit; when a locale's labels overflow (ES search tabs) the row **scrolls on x** with a hidden scrollbar instead of crushing the cells, and the active tab auto-centers into view), 48px tall, centered `15px/600` labels (Inter, sentence case via i18n), baseline hairline 0.5px `rgba(0,0,0,0.15)` under the whole row (full-bleed via `-var(--layout-pad-x)` margins; it lives on each tab, so it travels with the scroll), inactive `#9b9591`, **active = `#1a1a1a` text + 1px `#1a1a1a` underline** over the baseline — the underline is ONE measured bar that **SLIDES between cells** on tab change (`transform`/`width`, `0.3s cubic-bezier(0.16,1,0.3,1)` expo-out, none under reduced-motion; measured per render + ResizeObserver, first paint never animates), pressed = `opacity 0.6`. (`CloseYouRadiusBar` sits BELOW the row without overlap — its tray draws no top hairline of its own; the tabs' baseline is the shared edge, so the indicator stays visible on close-you.) The loading spinner hangs OFF the label (absolute at `left: calc(100% + 6px)` of the `.label` anchor, 150ms fade-in) so appearing/disappearing never nudges the centered text. No eyebrow label, no mono, no accent color, NO count badges (with five equal search cells they threw the centered labels off — labels sit clean, Threads-style). |
| Floating menu panel | `menu/MenuSurface` | **THE app's menu surface (Threads' exact dropdown), single source:** 240px, radius 16, 8px padding, 0.5px `#e5e0d3` outline + their triple shadow (`0 0 80px .25 / 1px 1px 2px .05 / 0 8px 16px .06`), opening pop `scale(0)→1` 0.15s. Rows via its exported `menuStyles` (`item` 15/600 ink radius 8, hover `rgba(0,0,0,0.04)`, press `scale(0.98)`; `itemIcon` charcoal, `itemIconRight`, `itemDanger` `#ff3040`, full-bleed `divider`). Consumers: `PostOptionsMenu` (desktop panel), the NavRail ☰ (which adds only anchor classes + its animated close) and `PostSortMenu` (anchored under its trigger, radio rows + Threads' check). Never re-implement a floating menu panel. |
| Dropdown / select menu | `post/PostSortMenu` | Threads' exact bar trigger (16px sort glyph + label + 12px chevron, `#9b9591`) + floating menu of options (name + description + check). The canonical anchored-dropdown pattern — reuse the MENU shape. Lives in `PostRepliesBar` (with the "View activity" placeholder) under the thread OP. See Dropdown menu. |
| Attached-media strip | `media/MediaScanList` + `post/PostScanResult` | **The composer's file previews (IG/Threads standard): compact TILES on ONE x-scrolling row** (hidden scrollbar) — many files never grow the composer vertically. Tile = 84×84, radius 12, hairline `#e5e0d3`, thumbnail cover, **NO filename** (it survives as the tile's `title` tooltip); entrance pop `scale(0.9)→1` 0.18s. States as overlays: busy = `rgba(26,26,26,0.3)` scrim + cream spinner; uploading = 3px terracotta bottom progress bar; upload error = danger scrim `rgba(197,48,48,0.3)` where the overlay IS the retry button (scrim disc + refresh glyph); compress error = same scrim + alert glyph. Remove = 20px scrim disc top-right; compression details = ⓘ scrim disc bottom-right toggling the before/after panel BELOW the strip (one file at a time, `aria-controls`); a visually-hidden `role=status` live region narrates each tile's state. |
| Modals | `WelcomeModal`, `nav/LanguageModal`, `compose/ComposeModal` | Portal to body, surface `#fdfcf8`, border `#e5e0d3`, radius `18px`, backdrop `rgba(31,26,20,0.42)` + blur, shadow `0 18px 50px rgba(26,26,26,0.18)`. Focus trap + Escape + `aria-modal`. |
| Thread composer | `compose/ComposeModal` + `contexts/ComposeContext` | **THE create flow (Threads/Substack-style dialog), one global instance:** opened by home's compose row AND the nav "+" (every screen, both breakpoints — this is how MOBILE creates). 600px card, vertically CENTERED (mobile ≤700px = full-screen sheet; NO mobile autofocus — Threads' behavior, the keyboard only opens when the user taps the field); the body scrolls inside with a HIDDEN scrollbar (the app's internal-scroll pattern — no reflow when it appears) and pasting long text jumps the scroll INSTANTLY to the end (no smooth animation — it read dizzy); header `Cancel · "New thread" · spacer` (52px, hairline below); body = thread-row anatomy (avatar 36 + mask @id 15/600, borderless 15px textarea with the hashtag-highlight overlay, media previews, location/error notices); footer toolbar = **LABELED options** (icon 20px + `13/500` label: "Media", "Area" — labels exist because icon-only controls went unnoticed; area active = `#f3e3d3` + terracotta, blocked = dimmed; the area SMART-DEFAULTS to ON when the browser permission is already granted and the user has never chosen — one-time, never triggers a dialog, and the user's own toggle persists and wins from then on) left · mono char count + primary dark Post (36px, radius 12, `15/600`, centered spinner while posting) right. **Text limit = Threads' exact 500** (`MAX_CHARS`, same in `PostCommentBox` — typing past it is allowed, the counter goes negative and Post disables; the backend enforces the same 500 server-side via `THREAD_TEXT_MAX_LENGTH`). Mounted permanently by `ComposeProvider` (renders null closed). **Closing with a non-empty draft asks first** (Threads' behavior): Escape/backdrop/Cancel funnel into `requestClose` → the shared **`DiscardDialog`** (`compose/DiscardDialog` — Threads' exact confirm: 280px card radius 16, centered `16/700` title, STACKED full-width 48px hairline-split actions, Discard in `#ff3040` 600 / Cancel 400 ink; Escape/backdrop = keep editing, initial focus on Cancel) — "Discard thread?" clears text+media and closes, Cancel keeps editing. Same dialog on the reply expand modal ("Discard reply?"). The dialogs cap at `max-height: 100%` of the padded backdrop (NEVER `calc(100dvh - fixed)`: the up-to-96px top padding pushed the footer off-viewport on long drafts) and scroll the BODY inside — the footer/Post button never leaves the screen. Posting reuses the feed flow (publishing→posted toast morph, "View" action, top-scroll + highlight only on /home; location failures surface as an info toast since the modal closes). |
| Reaction picker / pill | `post/PostReactionPicker`, `post/PostReactionPill` | Popover radius `28px`; see Reactions. |
| Mask avatar | `MaskAvatar` | Identicon for the pseudonymous mask; procedural SVG from a seed (the mask hash) — same seed → same avatar, no network, no uploads; CIRCLE (radius 50%), never a real photo. **Hairline ring (Threads' exact profile-pic outline), built into the component** at every size: `outline: 0.5px solid rgba(0,0,0,0.15)` + `outline-offset: -0.5px` (their light `--lines-primary`; drawn INWARD over the avatar's edge — no box growth, translucent so it contrasts on any surface). Never add a second ring in consumers. **The mask IS the brand mark retold: a thread + its dot**, in FOUR seed-picked archetypes (normalized 36-unit box, rounded strokes): single coil (arc 130–260°, dot in the opening), double coil (two concentric arcs, offset mouths), the logo's own SERPENTINE (scaled master path, rotated in 45° steps), and orbit (tight off-center coil, dot orbiting opposite) — plus per-seed start angle, sweep, coil radius and dot size (2.7–3.6). All on a **curated warm duotone pair** (10 pre-checked bg·thread combos — terracotta/cream, tint/terracotta, umber/wheat, rare ink/sand… no independent bg/fg roll, no off-palette greens/blues). **Avatar size is `36px` everywhere content rows exist** (feed, search rows, thread OP AND replies at every depth — Threads' single avatar size); `56px` only in the profile hover card. **Activity dot (`online`)**: Threads-exact — green `rgb(94,231,71)` (their `--barcelona-green-dot`), **10px content-box** dot (at 36px; scales `size·10/36`, min 8) + **2px outward ring** (total 14px), anchored `bottom:-1px; right:-2px` so the ring overflows the avatar curve like Threads. Ring color = the surface BEHIND the avatar: default `#fdfcf8` (cards — incl. the search results surface); `ringColor` prop for other grounds. |
| Toasts | `contexts/ToastContext` + `ToastViewport` | Dark pill `#1a1a1a` / text `#f7f5f0`, **min-height `53px`**, **dynamic width** (`max-width: min(360px, calc(100vw-32px))`, wraps past it), radius `12px`, bottom-floating portal. `showToast({type,message,duration,action,icon})→id`; `type:"loading"` = persistent spinner; `icon:"none"` (copy confirms) / `icon:"check"` not needed (success check is **white `#f7f5f0`**, never green). `showToast.update(id,…)` morphs a toast in place (same node → no jump) for **"Publishing… → Thread posted"** sequences; `.dismiss(id)`. `action` renders a trailing link (e.g. "View"). aria-live polite / assertive(error) / busy(loading). |
| Identity tags | `home/HomeFeedCard` (`is_mine`), `post/PostReply` (`is_op`), `me/MeProfileHeader` (You) | Derived from backend **booleans** `is_mine`/`is_op` (anonymity — no author id leaves the server; `is_op` is local to the thread). "Your thread" (feed/search) and the thread-author "· Author" reply meta share ONE pattern: Threads-style **quiet meta** — a `·` divider + Inter timestamp-identical text (body-sized `400 #9b9591`) after the timestamp. No pill, no badge (the old warm pill shouted next to the whisper-quiet identity row). The `/profile` "You" badge is the warmer pill (`10px/700`, radius `20px`). |
| /profile profile header | `me/MeProfileHeader` | **Threads' exact profile anatomy, FLAT on the surface** (no card-in-card; /profile — legacy /me redirects — is the fourth canonical surface screen; it plays the SAME profile app bar as /m/:maskId: desktop = back + centered "Profile" title with the entrance choreography; on MOBILE /profile mirrors home's NavRail header EXACTLY — the ☰ (`MenuButton variant="header"`) in the LEFT slot (NO Back: /profile is a top-level bottom-bar tab, not a drill-in) + centered 32px brand button → /home (`MyThreads .profileAppBarBrand`, STATIC: no entrance beat) + balance spacer; only /m/:maskId (a real drill-in) keeps the mobile Back, its right slot a plain spacer — no ☰ on drill-ins) — the BASE for anonymous profiles (everything but the "You" pill generalizes to other users' masks): name block left ("Anonymous" `24px/600/1.4`, their `--system-24` h1, + the "You" warm pill `10px/700` radius 20 — /profile only) with the **mask hash as the @handle line** — the WHOLE mono pill is the copy button (`#f7f5f0`/`#ebe7dd`/`#8b6f47`, hover `#f0ece3`, copy→toast) · **identicon right, Threads' 84px desktop / 64px mobile** (hairline ring from `MaskAvatar`). Below: the stats as ONE quiet meta line ("**12** threads · **40** reactions · **5** replies" — `15px`, labels `#9b9591`, VALUES `600 #6b6b6b`, `·` in `#c4bfb1`; their followers-line language) + the "Joined April 2020" whisper (calendar glyph + `13px #9b9591`; from `/me`'s `joined` = the mask's create_at, month+year via `Intl.DateTimeFormat` in the UI language). No privacy note. **Profile tabs (Threads' strip): Threads · Media** (`HomeFilterBar`) — Media = the search grid verbatim (3-col 2px mosaic, one tile per thread = first file, carousel/Reel marks, NSFW blur, and COLLAPSED hairline seams in ThreadMedia's tone — each tile's ::after paints only its right+bottom `0.5px rgba(0,0,0,0.15)` edge, suppressed on the last column/row, so every interior seam carries ONE line, the perimeter none, and near-white media never fuses with the cream gaps; same rules on BOTH grids), derived CLIENT-SIDE from the loaded threads (the pagination sentinel renders on the THREADS tab only — on the short media grid it stayed in view and chain-loaded every page), tile → `/p/:id` seeded. **`PostProfileHoverCard` mirrors this anatomy in miniature** (name 17/600 + mono hash pill left · 56px identicon right, quiet stats line, joined whisper — popover spec: radius 16, `0 8px 24px` shadow). **`/m/:maskId` is the PUBLIC twin (legacy `/anon/:maskId` redirects)** (`AnonProfileHeader`, same stylesheet): no You pill, public stats pair (posts · replies from `/users/<id>/`, which accepts the 6-hex public id), thread list via the search author filter (`@<id>`); clicking any avatar/mask (`PostProfileTrigger`, now a role=link) opens it — your own mask routes to /profile (a click on a mask whose profile is ALREADY open no-ops — no same-place remount/replayed entrance). |
| Rate-limit notice | `RateLimitNotice` + `utils/rateLimit` | **THE single 429 surface** (thread composer, inline reply box, expanded reply dialog) — a throttled write is a WAIT, not a failure, so it NEVER wears the danger palette: warm notice (`rgba(168,84,50,0.05)` on `1px #dcc0ad`, radius 12) with the composer's tactful note anatomy — a 40px `#fdfcf8` dial holding the outline **hourglass** (`#a85432`, 16px) ringed by the remaining wait (2.5px arc, track `#f3e3d3` / progress `#a85432`, drains via `stroke-dashoffset`) + title `12.5px/550 #a85432` and detail `12.5px #6b6b6b` (tabular-nums). Props: the 429 `error` itself (never a duration), `variant="post"|"reply"` picks the copy, `compact` tightens it for the docked mobile reply bar, `onDismiss` adds the ×, `onExpire` fires after the "you can post again now" beat. The wait comes from the backend ONLY (`getRetryAfterSeconds`: `Retry-After` header → payload `retry_after`/`wait` → the throttle sentence's number); with none the ring is dropped and the copy loses the countdown — **never invent a duration**. **The wait belongs to the ERROR, not to the mount:** `getRateLimitWait(err)` memoizes an absolute deadline per error object (WeakMap, no mutation) and the notice ticks off THAT, so collapsing/expanding the composer resumes both the seconds and the ring instead of refilling it (the arc drains continuously — `stroke-dashoffset` over `1s linear`, one second per counter step). Real errors keep their red banner. While the reply dialog is open the box's notice would strand behind the backdrop, so the DIALOG renders it (slot above the toolbar) and the inline one stands down. |
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

- **Trigger** — transparent button, 36px tall, padding `6px 8px`, radius `10px`, gap `6px`.
  Threads' exact anatomy: filled 16px glyph + active label (`14px / 600`) + their filled 12px
  chevron, everything in the secondary `#9b9591` (`currentColor`). Hover = `#f0ece3` wash +
  `#6b6b6b` (neutral — never the terracotta tint). While the result is loading the chevron is
  swapped for a small spinning ring (`#c5a572` border, transparent top).
- **Menu** — the panel IS `MenuSurface` (no bespoke surface): 240px, radius 16, 8px padding,
  0.5px `#e5e0d3` outline + triple shadow, `scale(0)→1` pop. The consumer only anchors it
  (`.wrapper .menu`: absolute under the trigger, `left` base + inline shiftX so it never leaves
  the viewport, `transform-origin: top left` so the pop grows out of the LEFT-edge trigger).
- **Option** — a plain `menuStyles.item` row (Threads' sort menu: 15/600 ink, radius 8, hover
  `rgba(0,0,0,0.04)`, press `scale(0.98)`), name ONLY — no description line — plus Threads' exact
  filled 16px "Checkmark: selected" riding the right edge (`itemIcon itemIconRight`, charcoal),
  kept in layout via `visibility` so rows never shift. **The check is the ONLY selection signal**
  (no fill on the selected row, like Threads).
- **Viewport fit (mobile)** — the component measures its own width and nudges the menu left via an
  inline `left` offset so it never overflows on small screens (8px margin). Same approach as
  `PostReactionPicker`; measured in `useLayoutEffect` (no flash) and recomputed on resize.
- **Behavior** — closes on click-outside, Escape (restores focus to the trigger), and on **scroll**
  (capture + passive: an anchored menu must not float misaligned when content moves). Arrow keys
  move between options; opening focuses the active one.
- **A11y** — trigger `aria-haspopup="menu"` + `aria-expanded`; menu `role="menu"`; options
  `role="menuitemradio"` + `aria-checked`; decorative SVGs `aria-hidden`.

## Interaction patterns

### Hover washes — Threads' soft fade (app-wide standard)

A hover wash NEVER pops in: the background (and any paired color/border shift) FADES in **and
out** with **`0.2s ease`**, declared on the control's BASE state (Threads' soft hover). This is
the single timing for every wash in the app — the global `.springPress*` utilities carry it, and
every CSS-module wash was normalized to it (the old 100–160ms mix read as "instantly appears").
Faster beats stay only where they're press feedback, not hover: `transform 0.1–0.2s` (soft press,
below) and MenuSurface's row press. Deliberate slow cases (MediaViewer backdrop 320ms, the radius
slider fill 0.32s) are exempt. When adding any new `:hover { background: … }`, put
`transition: background 0.2s ease` (plus `color`/`border-color` if they change) on the base class.

### Press feedback — Threads-exact soft press

Threads-EXACT press: on press the control scales down SOFTLY and eases back on release — **no
overshoot/bounce** (Threads' own spec, decoded from their CSS: `transition-property: transform`,
duration `0.15–0.2s`, plain `ease`; the earlier 0.12s overshoot-bezier spring read abrupt and was
replaced). **Centralized** as two global utility classes in `src/styles/index.css` (global, not a
CSS Module) — never re-implement it per component:

```css
.springPress     { transition: transform 0.15s ease, background .2s ease, color .2s ease, opacity .2s ease; }  /* text buttons */
.springPressIcon { transition: transform 0.2s ease,  background .2s ease, color .2s ease, opacity .2s ease; }  /* icon-only controls */
.springPress:not(:disabled):active     { transform: scale(0.96); }
.springPressIcon:not(:disabled):active { transform: scale(0.9); }   /* Threads' action-icon pair */
@media (prefers-reduced-motion: reduce) {
  .springPress, .springPressIcon { transition: background .2s ease, color .2s ease, opacity .2s ease; }
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

Shared, centralized in `NavRail.module.css`: idle **`#a3a3a3`** on the OUTLINE glyph set; hover
(`@media (hover:hover)`) and tap (`:active`) → **`#1a1a1a` icon + `#f0ece3` pill** (transient
feedback — Threads' plate); the bottom-bar **active route** = the SOLID glyph variant in
**`#a85432`, NO background** (Threads' blob-less mobile anatomy; on hover/tap the `#f0ece3`
pill still shows with the terracotta held). All mobile nav glyphs (the `barIconIdle`/`barIconActive`
pairs + the app bar's ☰ "More") are Threads' 24px paths lifted verbatim — no stroke-width
overrides remain.

### Frosted glass bars

The NavRail bars (top app bar AND bottom bar) use Threads' exact header recipe —
`rgba(253,252,248,0.85)` + `blur(28.5px)`, see NavRail above. The view-thread mobile app bar
shares this older variant:
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
`profileBar*` for the profile bar, played by BOTH /profile and /m/:maskId). Top-level screens (home/search) do NOT play it — arriving
somewhere is the signal, switching tabs is not.

### New-thread / new-reply highlight

ONE highlight language for both the just-created feed card (`HomeFeedCard .cardNew`, 3600ms) and
the just-posted reply (`PostReply .highlighted`, 3s): the **brand terracotta** — background
`rgba(168,84,50,0.1)` (the Brand wash token) + a **1px contour ring** `rgba(168,84,50,0.5)` —
which actually contrasts on the cream (the old `#f3e3d3`/`#d8b89a` pair read too faint. The
optional `.newBadge` chip, off by default, still uses the old warm-chip palette). The animation
opens with a soft **inward ripple**: a thick inner glow (`inset 0 0 0 26px @ 0.14`) that
COLLAPSES into the contour ring over the first ~16–18% (box-shadow spread interpolates
numerically), `cubic-bezier(0.16,1,0.3,1)` expo-out — then holds and fades to transparent.
Painted on a **full-bleed `::before` overlay** (`inset: 0 calc(-1 * var(--layout-pad-x))`,
`z-index: -1` + `isolation: isolate` on the row) so the contour wraps the WHOLE row edge to
edge — the row boxes carry no side padding (the container does) and nested replies indent via
their own `padding-left`, so this holds at every depth. Still **only background-color +
box-shadow** → no layout shift. `FeedContext` clears the `newPostId` mark after the fade (so it
never re-triggers on scroll/re-render); reduced-motion shows a static wash+ring that simply
clears.

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
- **Mobile hamburger (☰):** Threads' EXACT header "More" glyph — two EQUAL filled rounded bars
  (24×24, bars 2.5 tall, rx 1.25, lifted verbatim). The desktop rail ☰ keeps Threads' asymmetric
  sidebar "More" (rounded bars 21px + 14px).
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
  `/notifications`, `/profile` (legacy `/me` redirects to it), `/m/:maskId` (legacy `/anon/:maskId` redirects to it) are `noindex` (via `usePageTitle(key, { noindex: true })`) and
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

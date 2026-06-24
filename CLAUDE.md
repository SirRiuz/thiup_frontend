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
| `#9b9591` | Text tertiary / muted | De-emphasized meta, placeholder-ish text |
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

### Translucent overlays (common)

- Shadows: warm-tinted black `rgba(26, 26, 26, α)` — α ≈ `0.04`→`0.08` (cards), `0.18` (modals).
- Modal backdrop: `rgba(31, 26, 20, 0.42)` + `backdrop-filter: blur(8px)`.
- Card hover: `rgba(235, 231, 221, 0.4)`. Brand wash: `rgba(168, 84, 50, 0.1)`.

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
- **Monospace** (IDs, timestamps, technical chips): `ui-monospace, "SF Mono", Menlo, Consolas,
  monospace`. Used for mask `@id`s and timestamps — it signals "machine/pseudonymous data".
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
  `14` (nav items), `18/22` (modals, rail capsule), `28` (reaction popover), `50%`/`999px` (pills, avatars).
- **Shadows (elevation):**
  - Card/raised: `0 4px 20px rgba(26,26,26,0.06)` · rail: `0 6px 22px rgba(26,26,26,0.05)`.
  - Popover: `0 8px 24px rgba(26,26,26,0.08)` · Modal: `0 18px 50px rgba(26,26,26,0.18)`.
- **Breakpoints:** `700px` is the primary nav breakpoint (`>700` side capsule, `≤700` bottom bar);
  `480px` for fine mobile tweaks. Always honor `@media (prefers-reduced-motion: reduce)` and gate
  hover affordances behind `@media (hover: hover)`.

## Layout & shell

- **Content column:** `max-width: 740px`, centered.
- **AppShell** (`AppShell.module.css`): page bg `#f7f5f0`. Desktop (`>700px`) reserves the rail lane
  with symmetric `96px` side padding (keeps the column centered). Mobile (`≤700px`) adds
  `padding-bottom: 64px` so the fixed bottom bar never covers content.
- **NavRail** (`NavRail.module.css`) is the whole nav system (desktop + mobile), all in one component:
  - **Desktop (`>700px`)** = floating capsule, `width: 68px`, `border-radius: 22px`, surface `#fdfcf8`,
    border `#e5e0d3`, fixed `left: 14px; top: 50%`. Items `46px`, radius `14px`, idle `#666`,
    **active** = warm blob (`#f3e3d3` bg + `#a85432` icon). Three items: Home / Search / My threads.
    See Brand for the rail logo + divider.
  - **Mobile (`≤700px`) top app bar** — `height: 60px`, **sticky**, frosted glass (see Interaction
    patterns), grid `[☰] · [logo centered] · [search]`. The **☰ reuses the SAME NavRail menu**
    (Languages / About — the `MenuButton` with `variant="header"`); the logo is `BrandLogo
    variant="plain"` (`size 36`); the magnifier links to `/search`. The header renders **only on
    `/home` and `/me`** (Search and the thread view keep their own top bars → no double headers).
    The asymmetric ☰ glyph: two rounded lines, the bottom one shorter (see Iconography).
  - **Mobile bottom bar** — fixed, frosted glass, **two icon-only items: Home + My threads** (Search
    moved to the app-bar magnifier; the ☰ moved to the app bar). Idle/active states per Interaction
    patterns. Hidden while the keyboard is open (`useKeyboardOpen`); honors `safe-area-inset-bottom`.
- **AppShell** mobile `padding-bottom: 64px` keeps the bottom bar clear; the sticky app bar offsets
  the top in normal flow (no manual top padding).

## Components (catalog)

Reference component: **`HomeFeedCard`** — the thread cell that defines the feed look.

| Component | File(s) | Notes |
|---|---|---|
| Thread card | `home/HomeFeedCard` | `padding: 18px 8px`, `border-bottom: 1px #ebe7dd`, hover `rgba(235,231,221,0.4)`. Header: identicon + monospace mask `@id` (`#1a1a1a`) + `·` (`#c4bfb1`) + monospace timestamp (`#6b6b6b`). Trending badge: uppercase mono, `#c53030` on `rgba(197,48,48,0.08)`. |
| Primary button | `WelcomeModal .button`, etc. | `background:#1a1a1a; color:#fdfcf8; border-radius:12px; font-weight:600; padding:13px 14px`. Hover = `opacity` transition. **Dark fill, cream text — never white text-on-white.** |
| Chips / tags | `search/SearchTagCard`, compose tags | Rounded (`3–8px`), warm tint `#f3e3d3` bg or subtle border; small mono/`11px` text. |
| Inputs | `HomeCompose`, `search/SearchAppBar` | Surface `#fdfcf8`, border `#e5e0d3`, focus ring `inset 0 0 0 2px #c5a572`. |
| Tabs | `search/SearchAppBar`, `HomeFilterBar` | Sentence-case labels via i18n; active = warm accent underline/blob. |
| Dropdown / select menu | `post/PostSortMenu` | Trigger (44px touch target) + floating menu of options (name + description + check). The canonical anchored-dropdown pattern — reuse it. See Dropdown menu. |
| Modals | `WelcomeModal`, `nav/LanguageModal` | Portal to body, surface `#fdfcf8`, border `#e5e0d3`, radius `18px`, backdrop `rgba(31,26,20,0.42)` + blur, shadow `0 18px 50px rgba(26,26,26,0.18)`. Focus trap + Escape + `aria-modal`. |
| Reaction picker / pill | `post/PostReactionPicker`, `post/PostReactionPill` | Popover radius `28px`; see Reactions. |
| Mask avatar | `MaskAvatar` | Identicon for the pseudonymous mask; procedural SVG from a seed (the mask hash) — same seed → same avatar, no network, no uploads. Small radius `3px`, never a real photo. |
| Toasts | `contexts/ToastContext` + `ToastViewport` | Dark pill `#1a1a1a` / text `#f7f5f0`, **min-height `53px`**, **dynamic width** (`max-width: min(360px, calc(100vw-32px))`, wraps past it), radius `12px`, bottom-floating portal. `showToast({type,message,duration,action,icon})→id`; `type:"loading"` = persistent spinner; `icon:"none"` (copy confirms) / `icon:"check"` not needed (success check is **white `#f7f5f0`**, never green). `showToast.update(id,…)` morphs a toast in place (same node → no jump) for **"Publishing… → Thread posted"** sequences; `.dismiss(id)`. `action` renders a trailing link (e.g. "View"). aria-live polite / assertive(error) / busy(loading). |
| Identity tags | `home/HomeFeedCard` (`is_mine`), `post/PostReply` (`is_op`), `me/MeProfileHeader` (You) | Derived from backend **booleans** `is_mine`/`is_op` (anonymity — no author id leaves the server; `is_op` is local to the thread). "Your thread" (feed/search) + "OP" (replies) use mono `9px`, radius `3px` (matching the momentum debug tag): warm `#f3e3d3`/`#a85432`/border `#d8b89a` for mine, solid black `#1a1a1a`/`#f7f5f0` for OP. The `/me` "You" badge is the warmer pill (`10px/700`, radius `20px`). |
| /me profile header | `me/MeProfileHeader` | **/me only.** Card (`#fdfcf8`/`#e5e0d3`/radius `12`): identicon (58px, ring `#d8b89a`) + "Anonymous" + "You" badge + short hash pill (`#f7f5f0`/`#ebe7dd`/text `#8b6f47`/mono/radius `6`) with copy→toast + 3 **private** stats (Threads/Reactions/Replies, from `/me`, owner-only) with `#f0ece2` dividers + a short lock privacy note. A light divider (lines icon + real count + `#f0ece2` rule) separates it from the list — no explanatory heading. |
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

### Press feedback — spring / bounce

A subtle "spring" (Threads-style): on press the control shrinks and bounces back on
release (overshoot). **Centralized** as two global utility classes in `src/styles/index.css`
(global, not a CSS Module) — never re-implement it per component:

```css
.springPress,            /* text buttons */
.springPressIcon {       /* icon-only controls (a touch stronger) */
  transition: transform 0.12s cubic-bezier(0.34, 1.56, 0.64, 1),
    background 0.14s ease, color 0.14s ease, opacity 0.14s ease;
}
.springPress:not(:disabled):active     { transform: scale(0.93); }
.springPressIcon:not(:disabled):active { transform: scale(0.88); }
@media (prefers-reduced-motion: reduce) {
  .springPress, .springPressIcon { transition: background .14s ease, color .14s ease, opacity .14s ease; }
  .springPress:active, .springPressIcon:active { transform: none; }
}
```

- The bounce comes from the **overshoot cubic-bezier** (the `1.56` > 1). Intensity is
  **subtle–medium**: `scale(0.93)` buttons, `scale(0.88)` icons; `120ms`.
- **Rules:** (1) `:not(:disabled)` → a **disabled** control NEVER springs (no misleading press
  feedback — e.g. the inactive "Post" button). (2) Honors `prefers-reduced-motion` (no transform).
  (3) The transition also carries `background/color/opacity` so it **coexists** with hover washes
  (e.g. the nav `#f0ece3`) from one declaration — affected components drop their own `transition`
  so the global class is the single source (no cascade clash). (4) Visual-only — never affects
  focus (`:focus-visible` intact) or `aria`.
- **Applied to** (only these, for now — do not spread app-wide): nav controls (desktop NavRail
  items + mobile bottom-bar items + app-bar ☰/search), the three-dots options trigger, and the
  primary submit buttons ("Post" in `HomeCompose`, "Reply" in `PostCommentBox`) — the latter
  spring only when enabled.

### Nav icon states (mobile)

Shared, centralized in `NavRail.module.css`: idle **`#a3a3a3`**; hover (`@media (hover:hover)`)
and tap (`:active`) → **`#1a1a1a` icon + `#f0ece3` pill**; the bottom-bar **active route** keeps
its own warm blob **`#f3e3d3` fill + `#a85432` icon** (declared last so it wins over hover). Icon
stroke is bumped to **`2.3px`** on mobile (Threads-like weight) via a CSS override scoped to
`.appBarButton svg` / `.bottomBar .item svg` — the shared `NAV_ITEMS` glyphs stay `1.8` on desktop.

### Frosted glass bars

The mobile app bar + bottom bar and the view-thread app bar share one recipe (consistency):
`background: rgba(247, 245, 240, 0.88)` + `-webkit-backdrop-filter`/`backdrop-filter:
blur(28px) saturate(180%)` (Threads-strength; same alpha + blur in all three bars — the higher
`0.88` alpha keeps the background barely perceptible, frosted not transparent), hairline border
`#ebe7dd`. **Fallback:** `@supports not
((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)))` → solid `#f7f5f0`
(never illegible). Content blurs through as it scrolls under the fixed/sticky bar.

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
| Nav rail | **`plain`** — terracotta `#a85432` thread, **no background**, with a short divider below | `<BrandLogo variant="plain" />` + `.divider` (28px, 1px `#e5e0d3`) |
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
- Focus ring: `inset 0 0 0 2px #c5a572` (visible, warm). Contrast holds on the cream palette
  (text `#1a1a1a`/`#6b6b6b` on `#f7f5f0`/`#fdfcf8`). `prefers-reduced-motion` is honored;
  hovers are gated behind `@media (hover: hover)`.

**Recommended going forward (not yet a codebase-wide convention):**
- Add one visually-hidden `<h2>` (or `<h1>`) per screen as a screen-reader landmark, and consider a
  single shared `.srOnly` utility class instead of repeating the `clip` snippet per component.

## Privacy in the UI (hard rules)

- Never put thread content, author masks, or search queries in: OG/Twitter previews, JSON-LD,
  sitemap, or any **crawlable / shareable** surface.
- **Document titles are an exception (product decision):** `/post/:id` shows the thread text
  (Threads-style) and `/search` shows the query (X-style `<query> - Search / Thiup`, via
  `prefixSeparator: "-"` + `separator: "/"`), through `usePageTitle`'s `prefix` arg
  (whitespace-collapsed + truncated to 70 chars). This affects only
  the browser tab/history — these routes stay `noindex` and their share image stays the static
  brand card, so nothing leaks to crawlers or link previews.
- The OG/share image is the **static brand card** for the whole app — never per-thread.
- `/post/:id`, `/search`, `/me` are `noindex` (via `usePageTitle(key, { noindex: true })`) and
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

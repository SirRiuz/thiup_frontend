# pages/ — static pages

Plain HTML/CSS/JS pages served as static assets, **outside** the React app
(`src/`). No build step, no framework — each page can be served as-is (e.g. the
landing at `https://thiup.com/`, while the React app lives at
`https://app.thiup.com/`).

## Layout

```
pages/
  landing/            → marketing landing for https://thiup.com/
    index.html
    css/styles.css
    js/main.js         (i18n toggle + small helpers)
    assets/            (favicon, og-image, fonts)
```

## Conventions

- **100% vanilla.** No React, no bundler. Keep it lean and fast.
- **Design system.** Mirror the app's visual language (see the frontend
  `CLAUDE.md`): warm palette as CSS variables in `:root`, Inter, 8px radius,
  sober/warm tone. **`#FFFFFF` is forbidden** — use `#fdfcf8` / `#f7f5f0`.
- **i18n.** Default English, optional Spanish via a toggle that persists in
  `localStorage` and applies live. Sentence case in every language.
- **Privacy.** Open Graph cards are **brand-level only** — never user content.
- **CTA.** Any "open the app" link points at `https://app.thiup.com/home`.

## SEO / domain

- **Canonical host is non-www** (`https://thiup.com/`). Every canonical, OG and
  sitemap URL uses non-www. The `www` → non-www **301 redirect must be set at the
  edge** (Cloudflare Bulk Redirect / Redirect Rule) — that, plus the canonical
  tags, is what makes Google show the non-www result.
- `landing/sitemap.xml` + `landing/robots.txt` are the brand site's own (served at
  `thiup.com/…`), separate from the app's restrictive robots on `app.thiup.com`.
- `landing/app/` is `https://thiup.com/app` — an indexable page that opens the app.
  It is internally linked (header + footer, anchor "Open the app") and listed in
  the sitemap so it is a **sitelink candidate**. Sitelinks are chosen
  automatically by Google; they can't be forced and take time to appear.
- JSON-LD (`Organization` + `WebSite`) lives in `landing/index.html` — brand only.

## Adding a new page (e.g. support, terms)

1. Create `pages/<name>/` with the same shape (`index.html`, `css/`, `js/`,
   `assets/`).
2. Reuse the same CSS variables/tokens — copy `:root` from
   `landing/css/styles.css` so the look stays consistent.
3. Keep it vanilla and translatable (reuse the `main.js` i18n pattern).

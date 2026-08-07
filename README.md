# Thiup — Frontend

Anonymous, privacy-first social app. React 18 SPA bootstrapped with
[Create React App](https://github.com/facebook/create-react-app) — plain JavaScript (no
TypeScript), CSS Modules, no UI kit. See [`CLAUDE.md`](./CLAUDE.md) for the full design system
reference and [`CONTRIBUTING.md`](./CONTRIBUTING.md) for the English-only comments rule.

## Requirements

- **Docker + Docker Compose** (recommended — no local Node/npm needed at all), **or**
- Node `20.18.0` (pinned in [`.tool-versions`](./.tool-versions)) + npm, to run it directly on your
  machine.

## Quick start (Docker — recommended)

Everything (Node, npm packages) runs isolated inside the container. `node_modules` never touches
your machine: the compose file mounts the source (`.:/app`) but shadows `node_modules` with its
own anonymous volume, so `npm install` only ever runs inside the container.

1. Copy the env template and fill in the values:

   ```bash
   cp .env.template .env
   ```

2. Build the image and start the dev server — either with `make`:

   ```bash
   make build
   make up
   ```

   or with `docker compose` directly:

   ```bash
   docker compose build
   docker compose up
   ```

3. Open [http://localhost:3000](http://localhost:3000). Edits on the host hot-reload inside the
   container (the source is bind-mounted).

Stop it with:

```bash
make down
# or
docker compose down
```

**`Makefile` targets:**

| Target       | Runs                    | Does |
|--------------|--------------------------|------|
| `make build` | `docker compose build`  | Builds the image (installs deps inside the container) |
| `make up`    | `docker compose up`     | Starts the dev server on [:3000](http://localhost:3000) |
| `make run`   | alias of `make up`      | Same as `make up` |
| `make down`  | `docker compose down`   | Stops and removes the container |
| `make compile` | `docker compose run --rm frontend npm run build:secure` | Produces the production static bundle in `build/` |
| `make audit`   | `docker compose run --rm frontend npm audit` | Reports dependency vulnerabilities (see below) |

### Production build (`make compile`)

```bash
make compile
```

Runs [`npm run build:secure`](./scripts/build-secure.js) inside a one-off container — no local
Node/npm needed. It compiles the optimized `react-scripts build`, then obfuscates the JS/CSS
output. The build vars are **hardcoded in `build-secure.js`** (it ignores `.env*` entirely, moving
those files aside during the build and restoring them after — even on failure — so nothing from
your local `.env` leaks into the production bundle).

Because the source is bind-mounted (`.:/app`), the resulting `build/` folder is written straight
to your host — no extra copy step. The container build step runs as root, so the target chowns
`build/` back to your host user afterwards; you can `rm -rf build` normally without `sudo`.

**When `package.json`/`package-lock.json` changes**, rebuild the image so the new deps get
installed inside the container:

```bash
make build && make up
# or
docker compose build && docker compose up
```

**Port already in use?** Override it in `.env` (`PORT=3001`, for example) — `docker-compose.yml`
reads `${PORT:-3000}` for both the container's dev server and the host port mapping.

## Quick start (without Docker)

Requires Node `20.18.0` (see `.tool-versions`) and npm on your machine.

```bash
npm install --legacy-peer-deps
cp .env.template .env
npm start
```

Open [http://localhost:3000](http://localhost:3000). The page reloads on changes; lint errors show
in the console.

## Environment variables

Copy [`.env.template`](./.env.template) to `.env` before running the app (Docker or local) and
fill in the values:

| Variable                 | Purpose |
|---------------------------|---------|
| `REACT_APP_API_URL`       | Base URL of the backend API |
| `REACT_APP_GATEWAY_SEED`  | Rotating gateway path seed — optional; must match the backend's `GATEWAY_SEED` if set |

**Restart the dev server after editing `.env`** — CRA only inlines `REACT_APP_*` vars that exist in
`process.env` at start (`npm start` / `docker compose up`), it does not hot-reload them.

## Local CAPTCHA (CAP) setup

This repo has **no CAPTCHA env var of its own** — CAP is entirely configured and hosted by the
**backend** (`thiup_backend`). The frontend only ever *solves* a challenge (`src/services/captcha.js`)
and *exchanges* the resulting token for a human pass (`src/api/humanPass.js`); the widget's endpoint
comes at runtime from `GET /config/` (`captcha_endpoint`/`captcha_protect`), never from a local
`.env` value. This repo's [`.env.template`](./.env.template) only ever needs `REACT_APP_API_URL` and
`REACT_APP_GATEWAY_SEED` — nothing CAP-related to add there. If the errors below show up, the fix
lives entirely in the `thiup_backend` repo (its own `.env` + `cap`/`valkey` Docker services), not
here.

### Decoding the errors

If you see this set of errors while posting locally:

```
POST http://localhost:8080/<hash>/ 404                        (dispatch.js)
POST http://localhost:3333/<site-key>/challenge 404           (captcha.js)
cap solve [network_error] Invalid site key or secret          (captcha.js)
POST http://localhost:8080/threads/ 403                       (dispatch.js)
```

| Line | What it actually means |
|---|---|
| `POST /<hash>/ 404` (once, early) | **Harmless, by design.** The app defaults to gateway (encrypted) mode until `GET /config/` resolves (fail-closed). If the backend's `ENCRYPTED_RESPONSE` is `False`, that first gateway probe answers `404 GATEWAY_DISABLED` and the app permanently switches to direct/plain calls for the rest of the session — that's why every request *after* this one (e.g. `/threads/`) hits the plain URL with no hash. Not a bug, ignore it. |
| `POST /<site-key>/challenge 404` + `Invalid site key or secret` | **The real problem.** The CAP standalone server is up and reachable, but it doesn't recognize the site key configured in the backend's `.env`. A site key is a **record inside CAP's own Valkey store**, not just an env value — on a fresh clone/volume (or after wiping `valkey_data`), the placeholder `CAP_SITE_KEY`/`CAP_SECRET` shipped in the backend's `.env.template` were never actually *created* in the running CAP instance, so every solve fails. |
| `POST /threads/ 403` | Direct consequence of the row above: no solved captcha → no human pass → the backend rejects the write with `CAPTCHA_FAILED`. |

### Fix (in the `thiup_backend` repo)

1. Make sure the `cap` and `valkey` services are running: `docker compose up` (or `make up`) there.
2. Open [http://localhost:3333](http://localhost:3333) and log in with the backend's `CAP_ADMIN_KEY`.
3. Create a new key in the dashboard.
4. Copy the generated site key + secret into the backend's `.env` → `CAP_SITE_KEY` / `CAP_SECRET`.
5. Restart the backend so it picks up the new `.env` values.
6. Hard-reload this frontend's tab — the widget instance is cached per page load
   (`capInstance` in `src/services/captcha.js`), so a stale key can otherwise linger until reload.

### Skipping CAP entirely (pure frontend work)

If you don't need to test the captcha flow, turn it off in the **backend's** `.env`:

```
CAPTCHA_PROTECT=False
```

and restart it. `isCaptchaEnabled()` then reads `captcha_protect=false` from `/config/` and the
whole solve/verify flow is skipped client-side — no CAP/Valkey containers needed at all.

## Available scripts

| npm script         | What it does                                              |
|---------------------|-------------------------------------------------------------|
| `npm start`         | Runs the dev server in watch mode                          |
| `npm test`          | Runs the test runner in interactive watch mode             |
| `npm run build`     | Builds the production bundle into `build/`                 |
| `npm run build:secure` | Copies captcha assets, then runs the hardened build script |
| `npm run eject`     | One-way CRA eject — copies all build config into the project |

Under Docker, these map to `docker compose run --rm frontend <script>`, e.g.:

```bash
docker compose run --rm frontend npm test
docker compose run --rm frontend npm run build
```

## Dependency vulnerabilities (`make audit`)

```bash
make audit
```

Runs `npm audit` inside the container (no local Node/npm needed). `npm` exits non-zero when
vulnerabilities are found, so `make audit` itself will report `Error 1` — that's `npm audit`'s
normal behavior, not a broken command.

**Current state: 9 findings, all inside `react-scripts`' own frozen dependency tree** (5.0.1 is
its last published version — there is no newer release to pull fixes from). We went from 30 to 9
by bumping `react-router-dom` to v7 and adding targeted `overrides` in `package.json`
(`@tootallnate/once`, `nth-check`, `postcss`, `serialize-javascript`, `underscore`) for the ones
that had a safe, same-behavior patched version. The remaining 3 root packages have **no version
that clears the advisory without either breaking the build or being a strictly worse trade**
(verified — see below) — none of them are reachable through this app's actual code:

| Package | Why it's flagged | Why it doesn't apply here |
|---|---|---|
| `react-router` | CSRF bypass in its RSC (React Server Components / Remix framework) mode | This app is a pure client-rendered SPA (`BrowserRouter`, no SSR, no `createBrowserRouter`) — that code path never runs. **No published react-router-dom version clears this AND the earlier open-redirect CVE at once** (versions ≤7.17.0 dodge this one but hit the redirect bug; ≥7.12.0 dodge the redirect bug but hit this one). `^7.18.2` was chosen because it fixes the one bug that's actually reachable from this app's routes. |
| `svgo` / `@svgr/webpack` | `removeScripts` plugin leaves some scripts intact | Only reachable if the app imports a `.svg` file as a React component. This codebase has zero such imports — every icon is hand-authored inline SVG (see `CLAUDE.md` → Iconography). Dead code path. |
| `uuid` | Missing bounds check when an output buffer is explicitly passed | Only used by `sockjs`, itself only used by `webpack-dev-server`'s hot-reload socket — a **dev-only** tool, never shipped to the production bundle. The vulnerable call pattern isn't the one `sockjs` uses. |

**We verified `npm audit fix --force` is not a shortcut to 0** (tested in an isolated copy, not
the real repo): it deletes `react-scripts` entirely (removes ~1200 packages, installing a
non-functional `0.0.0` placeholder) — breaking `npm start`/`build`/`test` completely — and
downgrades `react-router-dom` into a *different* vulnerable range that surfaced 14 more CVEs
(including RCE/XSS), a net loss. **Never run it on this project.**

A real path to 0 exists only by ejecting CRA (`npm run eject`) or migrating the build off
`react-scripts` (e.g. to Vite) — both are substantial, separate efforts, not something to do as a
side effect of a routine dependency bump.

## Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) — code comments must be in English, enforced by a
pre-commit hook (`git config core.hooksPath .githooks`, once per clone).

## Learn more

This project uses Create React App; its docs cover things like
[code splitting](https://facebook.github.io/create-react-app/docs/code-splitting),
[analyzing the bundle size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size),
[making a PWA](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app),
[advanced configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration),
and [deployment](https://facebook.github.io/create-react-app/docs/deployment). Full CRA docs:
[facebook.github.io/create-react-app](https://facebook.github.io/create-react-app/docs/getting-started).

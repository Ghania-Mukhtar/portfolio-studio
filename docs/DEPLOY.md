# Deploy

Portfolio Studio is a Next.js 15 App Router app **with server API routes**
(`/api/generate`, `/api/revise`) that call Claude. So it must run on a host that
supports Next.js server functions, with the API key set as an environment
variable. (A pure static export will **not** work — the AI routes need a server.)

> The portfolios it *produces* are plain standalone `.html` files; those need no
> hosting at all — users just download and open them.

---

## Before you deploy

1. Run a clean production build locally and make sure it passes:

   ```powershell
   npm run build
   ```

   This also type-checks and lints. Fix anything it reports before shipping.
2. Decide how you will provide `ANTHROPIC_API_KEY` (and optionally
   `ANTHROPIC_MODEL`) on the host — as an environment variable, **not** committed.

---

## Option A: Vercel (recommended, zero config)

Vercel is made by the Next.js team; the API routes run as serverless functions.

1. Push the project to GitHub / GitLab / Bitbucket.
2. vercel.com → "Add New Project" → import the repo. Framework preset is detected
   as **Next.js**.
3. In **Project Settings → Environment Variables**, add:
   - `ANTHROPIC_API_KEY` = your key
   - `ANTHROPIC_MODEL` = `claude-sonnet-4-6` (optional)
4. Deploy. You get a URL immediately; add a custom domain in settings.

Every push to the main branch ships automatically; PRs get preview URLs. Set the
env vars for the Production (and Preview) environments.

---

## Option B: Any Node host

On a server with Node 18.18+:

```bash
npm install
npm run build
ANTHROPIC_API_KEY=sk-ant-... npm run start    # serves on PORT (default 3000)
```

Put it behind a reverse proxy (Nginx, Caddy) for TLS and a domain; keep the
process alive with pm2 / systemd. The same recipe works on Render, Railway,
Fly.io, etc. (build `next build`, start `next start`, set the env var).

Netlify / Cloudflare Pages also work via their Next.js adapters, which run the
API routes as functions — set the env var in the platform's dashboard.

---

## Environment notes

- **Required:** `ANTHROPIC_API_KEY` for AI generation. Without it the deploy
  still serves the app — Load Example, editing, and Download work — but AI
  generation returns a clear "add your key" message.
- **Optional:** `ANTHROPIC_MODEL` (defaults to `claude-sonnet-4-6`).
- The **first build needs network access** (Google Fonts at build time). CI must
  allow outbound network for that step.
- No other secrets are required. The key is read only by the server-side `/api`
  routes and never sent to the browser.

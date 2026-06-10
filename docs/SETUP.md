# Setup & Local Development

How to get the builder running on your machine, including the API key it needs
for AI generation, plus fixes for the gotchas you are most likely to hit on
Windows.

---

## Requirements

- **Node.js 18.18+** (built and verified on Node 24).
- **npm** (ships with Node).
- An **Anthropic API key** for AI generation (optional — the app runs without
  one; see below).

Check what you have:

```powershell
node --version
npm --version
```

If either says "not recognized" / "command not found", see
[Troubleshooting](#troubleshooting).

---

## Install

From the project root:

```powershell
npm install
```

This pulls Next.js 15, React 19, Tailwind v4, Motion, the Anthropic SDK, and
`mammoth` (Word-file text extraction).

---

## Add your API key (for AI generation)

```powershell
copy .env.local.example .env.local
```

Then edit `.env.local`:

```
ANTHROPIC_API_KEY=sk-ant-...        # from https://console.anthropic.com/
ANTHROPIC_MODEL=claude-sonnet-4-6   # optional; use claude-opus-4-8 for max quality
```

- The key is read **only on the server**, by the `/api/generate` and
  `/api/revise` routes (`lib/ai.ts`). It is never sent to the browser and is
  gitignored (`.env*.local`).
- **Without a key** the app still runs: **Load example**, **inline editing**, the
  **form editor**, and **Download** all work offline. Only "read my CV with AI"
  shows a clear "add your key" message.

Restart `npm run dev` after creating or changing `.env.local`.

---

## Run the dev server

```powershell
npm run dev
```

Open **http://localhost:3000**. The dev server hot-reloads. Try **Load example**
to see a finished portfolio with no setup, then click text to edit it and use a
project image's drag handles to resize it.

---

## Build for production

```powershell
npm run build      # compiles, type-checks, and lints
npm run start      # serves the production build on :3000
```

The first `build` needs **network access** (the three fonts download from Google
Fonts at build time).

---

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the hot-reloading dev server. |
| `npm run build` | Production build (also runs type-checking and lint). |
| `npm run start` | Serve the built app (run `build` first). |
| `npm run lint` | Lint only. |

---

## Troubleshooting

### "npm is not recognized" right after installing Node
Your terminal captured its `PATH` before Node was installed. **Fully quit and
reopen the terminal and editor** (or reboot). To run once without restarting:

```powershell
& "C:\Program Files\nodejs\npm.cmd" run dev
```

### `MODULE_NOT_FOUND` / a broken page after `npm run build`
`next build` overwrites `.next` while a dev server is running, which can break
the running dev process. Stop dev, remove `.next`, then restart:

```powershell
Get-Process node | Stop-Process -Force
Remove-Item -Recurse -Force .next
npm run dev
```

### AI generation returns "add your key" (code `NO_KEY`)
`ANTHROPIC_API_KEY` is missing or empty in `.env.local`, or the dev server was
not restarted after adding it. Fix the key and restart.

### Port 3000 is already in use

```powershell
npm run dev -- -p 3001
```

### The first build fails on fonts
`npm run build` fetches Google Fonts at build time — be online for the first
build.

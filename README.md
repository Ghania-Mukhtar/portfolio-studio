# Portfolio Studio

An **AI portfolio builder**. Upload your CV, pick a theme, describe your idea —
Claude reads the CV and writes a premium portfolio to match. The result is shown
full screen, is **directly editable** (click any text, replace and resize any
image), and **downloads as a single offline `.html` file** with a theme switcher
built in.

**Stack:** Next.js 15 (App Router) · React 19 · Tailwind v4 · Motion · TypeScript
· Anthropic SDK. The *generated* portfolio is dependency-free, self-contained
HTML (no server, no network needed to open it).

## Setup

```bash
npm install
cp .env.local.example .env.local     # then add your Anthropic API key
npm run dev                          # http://localhost:3000
npm run build
```

Get a key at https://console.anthropic.com/. It is read **only on the server**
(by the `/api` routes), never sent to the browser, and is gitignored. Optional:
set `ANTHROPIC_MODEL` (defaults to `claude-sonnet-4-6`; use `claude-opus-4-8` for
maximum quality).

> Without a key, the app still runs: **Load example**, **editing**, and
> **Download** work offline; only AI generation shows a clear "add your key"
> message.

## How it works

1. **Home** — start, load the example, or resume a portfolio in progress.
2. **Upload CV** — browse a file (PDF / Word / text) or paste text.
3. **Choose a theme** — Cinematic, Editorial, Mono, Royal, Pastel.
4. **Describe your idea** — how it should feel and what to highlight.
5. **AI builds it** — Claude extracts everything from the CV, then asks only for
   what it could not find (gap questions).
6. **Result** — the portfolio, full screen, with **Download**, **Make changes
   (AI)**, **Edit & add media**, and **Home**. It is **live-editable** (below).
7. **Make changes** — describe edits in a box; the AI recreates the portfolio.

Back navigation is available at every step.

### Edit directly on the result (autosaved)

- **Click any text** — name, tagline, project copy, about, skills, sections — to
  edit it in place. It saves automatically and never reloads the page mid-edit.
- **Click an image's "Replace image" button** to swap it from your computer.
- **Resize any image** with the right (width), bottom (height) and corner drag
  handles — 200×200 to 900×700 px. The whole image always stays visible
  (`object-fit: contain`, never cropped). Works with mouse and touch.
- **Edit & add media** also gives a full form editor: every field, project
  images/videos (or pasted URLs), a Work gallery, and custom sections.

### It builds what you ask for

- **Contact actions** — mention a WhatsApp/phone/email or socials and the
  portfolio gets tappable **Message on WhatsApp / Email me / Call /** link buttons.
- **Media** — upload images/videos (embedded so the download works offline) or
  paste a URL.
- **Any section** — ask for services, testimonials, FAQ, pricing, process, etc.
  and the AI adds it as a custom section.

### Custom illustrations, matched to the person

When an image slot is empty, it shows a **colorful, flat, dark-outline isometric
illustration** generated from the CV — not a stock graphic:

- The **hero/about** illustration reflects the person's **field** (an AI/CS
  person gets a workspace scene; a designer a design studio; etc.).
- Each **project** illustration reflects **that project's text** (a banking app →
  a phone scene, finance → a bank/chart, photography → a camera, …).
- The illustration **recolors with the theme** and is pure inline SVG (offline).

## Structure

```
app/
  page.tsx                "/"        -> the builder wizard
  example/page.tsx        "/example" -> the example portfolio (full-screen)
  api/generate/route.ts   build from CV (PDF/Word/text) + idea + theme
  api/revise/route.ts     apply a free-text change request
  globals.css             app-chrome tokens, 5 themes, the .btn (pressable) styles
components/
  builder/                Builder.tsx (wizard + live-edit bridge) + Fields.tsx
  theme/ , ui/            theme switcher, shared pressable Button, icons
lib/
  portfolio-schema.ts     PortfolioData + the Ghania example
  ai.ts                   server-only Claude helpers (the key stays here)
  generate.ts             generatePortfolioHtml(data, opts) -> the standalone file
  themes.ts               theme registry
CLAUDE.md                 the brief, research, and design system (start here)
docs/                     SETUP, CONTENT, THEMING, ARCHITECTURE, COMPONENTS, DEPLOY
```

> **One renderer.** `generatePortfolioHtml(data)` in `lib/generate.ts` produces
> every portfolio — the live preview, the download, and `/example`. The example
> is just sample *data* (`examplePortfolio()`); no feature is special-cased to it,
> so everything here applies to **any** portfolio the app makes.

## Design standards (enforced everywhere)

- **Big type for important things, scannable layout.**
- **Tactile, color-blind-safe buttons** (pressable pill with edge + shadow;
  affordance is shape + shadow, not color).
- **Fully responsive**, one locked accent per theme (the colorful illustrations
  are the one deliberate exception), motion that honors `prefers-reduced-motion`.

See **[`CLAUDE.md`](CLAUDE.md)** for the full rationale and **[`docs/`](docs/)**
for the how-to guides.

## Notes

- The downloaded portfolio loads premium fonts online and falls back to system
  fonts offline. Its placeholder art is inline SVG and any uploaded media is
  embedded as a data URL, so the file needs **no network** to open.
- PDFs are read by Claude directly; Word files via `mammoth`; text as-is.
- Uploaded media is not persisted in browser storage across a refresh (too
  large), but is always present in the live session and the download.

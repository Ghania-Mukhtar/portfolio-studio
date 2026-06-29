# Portfolio Studio

An AI portfolio builder. Upload your CV, pick a theme, describe your idea, and
Claude reads the CV and writes a premium portfolio to match. The result is shown
full screen, is **directly editable** (click any text, replace and resize any
image), and **downloads as a single offline `.html` file** with a theme switcher
built in.

There is also an **Airtable intake**: a public form collects submissions and a
single API endpoint turns each row into a finished portfolio, hands free.

**Stack:** Next.js 15 (App Router) · React 19 · Tailwind v4 · Motion · TypeScript
· Anthropic SDK. The *generated* portfolio is dependency free, self contained HTML
(no server and no network needed to open it).

## Live

| | URL |
|---|---|
| App (builder) | https://portfolio-studio-jet.vercel.app |
| Example portfolio (static) | https://ghania-mukhtar.github.io/portfolio/studio/ |

> The deployed app needs its API keys set as environment variables before AI
> generation works (see [Environment](#environment)). The static example needs
> nothing, it is a self contained file.

## Quick start

```bash
npm install
cp .env.local.example .env.local     # then add your keys
npm run dev                          # http://localhost:3000
npm run build                        # production build
```

## Environment

Copy `.env.local.example` to `.env.local` and fill in what you need. Every key is
read **only on the server** (by the `/api` routes), never sent to the browser, and
is gitignored.

| Variable | Required for | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | AI generation | Get one at https://console.anthropic.com/ |
| `ANTHROPIC_MODEL` | optional | Defaults to `claude-sonnet-4-6`; use `claude-opus-4-8` for max quality |
| `AIRTABLE_TOKEN` | Airtable intake | Personal access token with `data.records:read` + `data.records:write` on the Submissions base |
| `AIRTABLE_BASE_ID` / `AIRTABLE_TABLE` | optional | Override the defaults baked into `lib/airtable.ts` |

> Without a key the app still runs: **Load example**, **editing**, and
> **Download** work fully offline; only AI generation shows a clear "add your key"
> message.

## How it works

1. **Home** - start, load the example, or resume a portfolio in progress.
2. **Upload CV** - browse a file (PDF / Word / text) or paste text.
3. **Choose a theme** - Cinematic, Editorial, Mono, Royal, Pastel.
4. **Describe your idea** - how it should feel and what to highlight.
5. **AI builds it** - Claude extracts everything from the CV, then asks only for
   what it could not find (gap questions).
6. **Result** - the portfolio, full screen, with **Download**, **Make changes
   (AI)**, **Edit & add media**, and **Home**. It is live editable (below).
7. **Make changes** - describe edits in a box; the AI recreates the portfolio.

Back navigation is available at every step.

### Edit directly on the result (autosaved)

- **Click any text** (name, tagline, project copy, about, skills, sections) to
  edit it in place. It saves automatically and never reloads the page mid edit.
- **Click an image's "Replace image" button** to swap it from your computer.
- **Resize any image** with the right (width), bottom (height) and corner drag
  handles, 200x200 to 900x700 px. The whole image always stays visible
  (`object-fit: contain`, never cropped). Works with mouse and touch.
- **Edit & add media** also gives a full form editor: every field, project
  images/videos (or pasted URLs), a Work gallery, and custom sections.

### It builds what you ask for

- **Contact actions** - mention a WhatsApp/phone/email or socials and the
  portfolio gets tappable **Message on WhatsApp / Email me / Call /** link buttons.
- **Media** - upload images/videos (embedded so the download works offline) or
  paste a URL.
- **Any section** - ask for services, testimonials, FAQ, pricing, process, etc.
  and the AI adds it as a custom section.

### Premium isometric illustrations, matched to the person

When an image slot is empty it shows a **content aware isometric illustration**
generated from the CV, not a stock graphic. Each surface uses per face gradient
shading with directional light, lit edge highlights, a soft accent bloom, and a
grounded contact shadow plus reflection, so it reads as a rendered, premium scene:

- The **hero/about** illustration reflects the person's **field** (an AI/CS
  person gets a workspace scene; a designer a design studio; and so on).
- Each **project** illustration reflects **that project's text** (a banking app
  becomes a phone scene, finance a bank/chart, photography a camera, and so on).
- It **recolors with the theme** and is pure inline SVG, so the download stays
  offline and makes no external image requests.

## Airtable intake (form to portfolio)

A second way in: a public Airtable form collects submissions, and the
`/api/intake` endpoint turns each row into a portfolio with no manual step.

```
User fills the Airtable FORM
        |  creates a row in the "Submissions" table
Airtable AUTOMATION  ->  POST { recordId }  ->  /api/intake
        |
The app (/api/intake):
   1. reads that row from Airtable          (AIRTABLE_TOKEN)
   2. builds the input: CV + idea + theme
   3. Claude writes the portfolio           (ANTHROPIC_API_KEY)
   4. renders the standalone HTML
   5. writes "Portfolio HTML" + Status back to the row
```

- `GET /api/intake` processes every row whose Status is empty or `New`.
- `POST /api/intake` with `{ "recordId": "rec..." }` processes one row.
- The form is **public and write only**: submitters see only the form, never the
  table or other submissions. The admin interface stays private to you.

The Submissions table fields map exactly to the generator input: **Name, CV Text
or CV File, Idea, Theme** (the five theme ids: cinematic, editorial, mono, royal,
pastel), plus workflow fields (**Status, Portfolio HTML, Portfolio URL**). See
`lib/airtable.ts` for the field map and `app/api/intake/route.ts` for the
pipeline.

## Deploy

- **Vercel** (current): import the repo, add `ANTHROPIC_API_KEY` and
  `AIRTABLE_TOKEN` as environment variables, deploy. No config needed.
- **Render**: a `render.yaml` blueprint is included for a free, persistent Node
  service (`Dashboard -> New -> Blueprint`). Useful because the long generation
  call has no per request timeout there.
- **The generated portfolio is a static `.html` file** and can be hosted anywhere
  (GitHub Pages, any static host) with no backend.

## Structure

```
app/
  page.tsx                "/"        -> the builder wizard
  example/page.tsx        "/example" -> the example portfolio (full screen)
  api/generate/route.ts   build from CV (PDF/Word/text) + idea + theme
  api/revise/route.ts     apply a free-text change request
  api/intake/route.ts     Airtable Submissions -> portfolio pipeline
  globals.css             app-chrome tokens, 5 themes, the .btn (pressable) styles
components/
  builder/                Builder.tsx (wizard + live-edit bridge) + Fields.tsx
  theme/ , ui/            theme switcher, shared pressable Button, icons
lib/
  portfolio-schema.ts     PortfolioData + the Ghania example
  ai.ts                   server-only Claude helpers (the key stays here)
  generate.ts             generatePortfolioHtml(data, opts) -> the standalone file
  airtable.ts             server-only Airtable REST helpers for /api/intake
  themes.ts               theme registry
render.yaml               one-click Render blueprint
CLAUDE.md                 the brief, research, and design system (start here)
docs/                     SETUP, CONTENT, THEMING, ARCHITECTURE, COMPONENTS, DEPLOY
```

> **One renderer.** `generatePortfolioHtml(data)` in `lib/generate.ts` produces
> every portfolio: the live preview, the download, `/example`, and the Airtable
> intake output. The example is just sample *data* (`examplePortfolio()`); no
> feature is special cased to it, so everything here applies to **any** portfolio
> the app makes.

## Design standards (enforced everywhere)

- **Big type for important things, scannable layout.**
- **Tactile, color-blind-safe buttons** (pressable pill with edge + shadow;
  affordance is shape + shadow, not color).
- **Fully responsive**, one locked accent per theme (the premium illustrations are
  the one deliberate exception), motion that honors `prefers-reduced-motion`.

See **[`CLAUDE.md`](CLAUDE.md)** for the full rationale and **[`docs/`](docs/)**
for the how-to guides.

## Notes

- The downloaded portfolio loads premium fonts online and falls back to system
  fonts offline. Its illustrations are inline SVG and any uploaded media is
  embedded as a data URL, so the file needs **no network** to open.
- PDFs are read by Claude directly; Word files via `mammoth`; text as is.
- Uploaded media is not persisted in browser storage across a refresh (too
  large), but is always present in the live session and the download.

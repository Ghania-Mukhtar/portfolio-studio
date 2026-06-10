# Architecture & data flow

How the builder is put together and how data moves from a CV to a downloadable
file. Pair this with `CLAUDE.md` (the *why*) and [COMPONENTS.md](COMPONENTS.md)
(the per-piece reference).

> Stack: Next.js 15 (App Router) + React 19 + Tailwind v4 + Motion + TypeScript +
> the Anthropic SDK. One data model, one renderer, server-only AI.

---

## 1. The shape of the project

```
portfolio/
├─ app/
│  ├─ globals.css            App-chrome tokens + 5 themes + .btn (pressable) styles
│  ├─ layout.tsx             Fonts, metadata, pre-paint theme script, ThemeProvider
│  ├─ page.tsx               "/"        -> <Builder/>
│  ├─ example/page.tsx       "/example" -> full-screen iframe of the Ghania portfolio
│  └─ api/
│     ├─ generate/route.ts   POST {file?|cvText?, idea?, theme?} -> {data, gaps}
│     └─ revise/route.ts     POST {current, instructions, theme?} -> {data, gaps}
│
├─ components/
│  ├─ builder/
│  │  ├─ Builder.tsx         The wizard state machine + the live-edit bridge
│  │  └─ Fields.tsx          TextInput / TextArea / Repeat / SkillsEditor / MediaList
│  ├─ theme/                 ThemeProvider + ThemeSwitcher (app chrome)
│  └─ ui/                    Button (pressable pill) + icons
│
├─ lib/
│  ├─ portfolio-schema.ts    PortfolioData, emptyPortfolio(), examplePortfolio(), findGaps()
│  ├─ ai.ts                  SERVER-ONLY Claude helpers (the key stays here)
│  ├─ generate.ts            generatePortfolioHtml(data, opts) -> the standalone file
│  └─ themes.ts              Theme registry (id, label, swatch, default)
│
├─ CLAUDE.md  README.md  CHANGELOG.md
└─ docs/                     This documentation set
```

**The one rule:** one data model (`lib/`), one renderer (`lib/generate.ts`),
server-only AI (`lib/ai.ts` behind `app/api`). The app chrome's look lives in
`app/globals.css`; the output's look lives inlined in `generate.ts`.

---

## 2. Data flow (CV → download)

```
CV file ─┐
idea ────┼─► /api/generate ─► lib/ai.ts (Claude, forced tool output) ─► PortfolioData
theme ───┘                                                                  │
                                                                            ▼
                                                            Builder.tsx state `data`
                                                                            │
              ┌─────────────────────────────────────────────┬─────────────┤
              ▼                                               ▼             ▼
   generatePortfolioHtml(data,{theme,editable:true})   inline edits   form editor
        = the live preview (sandboxed iframe)         (postMessage)   (Fields.tsx)
              │  user edits text / replaces / resizes images           │
              └───────────────► setPath() writes back into `data` ◄────┘
                                                                            │
                                                                            ▼
                                  generatePortfolioHtml(data,{theme})  = the Download
                                       (no edit markup; self-contained HTML)
```

- **One renderer, two modes.** The preview uses `editable: true` (adds the edit
  script + hooks); the download uses the default (clean). Both come from the same
  function, so **preview == download**.
- **The example** (`/example`) is the same renderer over `examplePortfolio()` —
  sample data only, nothing special-cased.

---

## 3. The live-edit bridge

The result is a `sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"`
iframe. The injected `EDIT_SCRIPT` posts messages to the parent:

| Message | Meaning | Builder writes |
|---|---|---|
| `pf-edit` | text edited inline | `setPath(data, path, value)` |
| `pf-img` | "Replace image" clicked | opens the file picker → sets a `MediaItem` |
| `pf-img-size` | image resized | `setPath(data, path+".w"/".h", …)` |

Text edits update `data` but do **not** regenerate the iframe (the caret/scroll
stay put); image replace/resize and theme changes bump `docKey`, which is the
only thing the editable document is memoized on, so it reloads deliberately. The
download is always regenerated from the latest `data`.

`setPath` understands paths like `name`, `projects#0.title`,
`sections#1.items#2.heading`, `skills#3`, `heroImage`, `gallery#2.w`.

---

## 4. Rendering & security model

- The wizard (`Builder.tsx`, theme components) is client-side. The `/api` routes
  run on the **server** (`runtime = "nodejs"`).
- **The API key never reaches the browser.** It is read only in `lib/ai.ts`
  (`process.env.ANTHROPIC_API_KEY`) inside the API routes, and is gitignored.
- The generated file is **offline-first**: all CSS/JS inlined, empty image slots
  drawn as inline-SVG illustrations, uploaded media embedded as data URLs.

---

## 5. Build & run

```bash
npm install
npm run dev      # http://localhost:3000 (hot reload)
npm run build    # production build (type-checks + lints)
npm run start    # serve the build
```

The first `build` needs network access (fonts). See [SETUP.md](SETUP.md) for the
API key and Windows gotchas, [DEPLOY.md](DEPLOY.md) for hosting.

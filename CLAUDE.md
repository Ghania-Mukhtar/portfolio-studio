# CLAUDE.md - Portfolio Studio

An **AI portfolio builder**. The user uploads a CV, picks a theme, and describes
their idea; Claude reads the CV (PDF, Word, or text), writes and structures the
portfolio to match the idea, and the app renders a premium, theme-switchable
portfolio that downloads as a single offline HTML file.

This file is the brief, the research behind it, and the design system. Read it
before changing anything. It exists so the *why* survives, not just the *what*.

> Built with the `design-taste-frontend` anti-slop skill. Stack: **Next.js 15
> (App Router) + Tailwind v4 + Motion + TypeScript + the Anthropic SDK**. The
> *generated* portfolio is dependency-free, self-contained HTML.

---

## 1. The product and its flow

A guided wizard, with **back navigation at every step** and a **home** to return
to:

1. **Home** - start, or "Load example", or jump back to a portfolio in progress.
2. **Upload CV** - browse a file from the computer (**PDF / Word / text**) or
   paste text.
3. **Choose a theme** - five options (cards).
4. **Describe the idea** - free text: how they want it to feel / what to focus on.
5. **AI builds it** - Claude extracts everything from the CV and writes the copy
   to match the idea. It then **asks only for what it could not find** (gaps).
6. **Result** - the finished portfolio shown **full screen, alone, nothing
   beside it**, with floating controls: **Download**, **Make changes**, **Home**.
   Text is **click-to-edit inline** and art/images are **click-to-replace**, both
   saved automatically.
7. **Make changes** - describe the change in a box; Claude **recreates** the
   portfolio (theme is also switchable here).

"Both" (the user's word) = (1) this builder app and (2) the portfolio it makes.
Each must feel expensive, scan in seconds, work on phone and laptop, and have
buttons anyone can use.

**It builds whatever the user asks for, not a fixed template:**
- **Contact actions** from the CV/idea: WhatsApp ("Message on WhatsApp", a
  `wa.me` link), email, phone, and any social links become tactile buttons.
- **Work media**: users upload images/videos (embedded as data URLs so the
  download stays offline) or paste a URL, attached to a project or a Work
  gallery. (`MediaList` in the builder; `<img>`/`<video>` in the output.)
- **Custom sections**: the AI can add any section requested (services,
  testimonials, FAQ, pricing, process, publications, ...) via `sections` with a
  `text` / `list` / `cards` / `quote` layout. Also hand-editable.
- Honest limits in a single offline file: a self-sending contact form is not
  possible (mailto / WhatsApp links are the standard, and are provided);
  uploaded media is not kept in browser storage across refresh (too large) but
  is always in the download.

---

## 2. Who this is for

- **People with a CV and no portfolio.** Not designers; they want a great result
  with near-zero effort. Upload + idea + gap-only questions exist for them. [4]
- **Hiring managers / clients** who later view the generated portfolio. They scan
  for a short edit of the best work, impact, and zero sloppy details. [4]

Design consequence: **let AI do the writing, ask the user almost nothing, lead
with the work, keep copy skimmable, make every detail correct.**

---

## 3. The two explicit requirements (do not regress these)

1. **Big type for important things, scannable layout.** ~79% of users scan. [5]
   Hero headline `clamp(2.8rem, 8.5vw, 6.2rem)`; section headings
   `clamp(2rem, 5.5vw, 3.6rem)`; body ~1.05rem at a 40-46ch measure.
2. **Tactile, color-blind-safe buttons.** One style: a *pressable pill* with a
   visible bottom **edge** (`--accent-edge`) + drop shadow, pressing *down* on
   `:active`. Affordance is **shape + edge + shadow, never hue alone**.
   `.btn` / `.btn-primary` / `.btn-ghost` in `app/globals.css`, mirrored in the
   generated file's inlined CSS.

Both are **fully responsive**. The builder is centered panels with Back/Next on
phones and laptops; the result is a full-screen portfolio; the generated file
reflows at `760px` / `920px`.

---

## 4-6. Luxury mechanics, psychology, type/color/spacing

Heavy whitespace, restraint, fine type, subtle motivated motion (all gated by
`prefers-reduced-motion`), one locked accent per theme. [1][2][3] When an image
slot is empty it shows a **colorful, content-aware isometric illustration** (pure
inline SVG); uploaded media is embedded as a **data URL**. So the generated file
makes **no external image requests** and works offline. Honesty is enforced in
the AI prompt: it must not invent employers, metrics, or dates; unknown fields
stay empty.

### Themes (one accent each, locked)
| Theme | Background | Text | Accent | Button edge |
|---|---|---|---|---|
| **Cinematic** (default, dark) | `#0b0b0c` | `#ece9e1` | `#c2a878` | `#7d6738` |
| **Editorial** (warm paper) | `#f3f0e9` | `#1a1916` | `#9e4a2e` | `#6f3320` |
| **Mono** (stark) | `#fafaf8` | `#111111` | `#111111` | `#000000` |
| **Royal** (deep, gold) | `#0f0c1d` | `#ece8f6` | `#c9a24b` | `#8a6e2e` |
| **Pastel** (soft, rose) | `#f7f2f6` | `#2c2733` | `#b5687f` | `#8a4860` |

Typography: Bricolage Grotesque (display), Inter Tight (body), JetBrains Mono
(labels). The generated file uses Google Fonts online, system fonts offline.

---

## 7. Architecture

```
lib/portfolio-schema.ts   PortfolioData type, emptyPortfolio(), examplePortfolio()
                          (Ghania), findGaps()
lib/ai.ts                 SERVER-ONLY Claude helpers: generatePortfolio() and
                          revisePortfolio(). Reads PDF natively (document block),
                          forces structured output via the build_portfolio tool.
                          Key from process.env.ANTHROPIC_API_KEY (never client).
app/api/generate/route.ts POST {file?|cvText?, idea?, theme?}. PDF -> Claude,
                          Word -> mammoth -> text, else text. Returns {data,gaps}.
app/api/revise/route.ts   POST {current, instructions, theme?} -> {data,gaps}.
lib/generate.ts           generatePortfolioHtml(data,{theme,editable}) -> the
                          standalone file: inlined CSS (5 themes), theme switcher
                          + reveal + in-page scroll scripts, colorful isometric
                          illustrations (colorScene), embedded media. No external
                          assets. `editable:true` adds the inline-edit script.
components/builder/*       Builder.tsx (the wizard state machine + the live-edit
                          postMessage bridge) + Fields.tsx
                          (TextInput/TextArea/Repeat/SkillsEditor/MediaList).
components/ui/Button.tsx   the shared pressable button.
app/page.tsx              "/"        -> the builder
app/example/page.tsx      "/example" -> the Ghania portfolio, full-screen iframe
```

- **Two theme systems.** The app chrome uses `ThemeProvider` + tokens in
  `app/globals.css` (`lib/themes.ts` registry). The *generated file* has its own
  identical token set inlined, with a 5-swatch switcher persisted to
  `localStorage`, so the download is independently theme-switchable, offline.
- **One renderer.** `generatePortfolioHtml` produces the result. The wizard's
  result `<iframe srcDoc>` and the Download button use the same string, so
  preview == download. The result iframe is `sandbox="allow-scripts"` (no
  same-origin) so the chosen theme always wins over any stale `localStorage`.

### Common edits
- Output look / sections: `lib/generate.ts` (`STYLES` + section builders).
- What the AI returns: the schema + prompt in `lib/ai.ts` (keep it in sync with
  `PortfolioData`).
- Wizard steps / questions: `components/builder/Builder.tsx`.
- Add a theme: a `[data-theme]` block in `app/globals.css`, an entry in
  `lib/themes.ts`, an inlined block + swatch in `lib/generate.ts`.

---

## 8. Setup the API key (required for AI)

The builder calls Claude server-side. Without a key it shows a clear message and
still supports Load Example + Download (those are offline).

1. Copy `.env.local.example` to `.env.local`.
2. Set `ANTHROPIC_API_KEY` (from https://console.anthropic.com/).
3. Optional `ANTHROPIC_MODEL` (defaults to `claude-sonnet-4-6`; use
   `claude-opus-4-8` for max quality).
4. Restart `npm run dev`.

The key is read only by the `/api` routes; it never reaches the browser and is
gitignored.

---

## 9. The example

`examplePortfolio()` is **Ghania, an AI student** (VitalWatch, Expense Management
System). It powers "Load example" and `/example`. Illustrative, editable, honest.

---

## 10. House rules (anti-slop - keep true)

- **Zero em-dashes** in our own copy/templates (user/AI content excepted, and the
  AI is told to avoid them too).
- One accent per view, one radius scale, no 3 identical feature cards, rationed
  eyebrows, no fake stamps/scroll cues/invented numbers.
- Motion motivated + `prefers-reduced-motion` honored, in app and generated file.
- **Empty image slots show a colorful, content-aware isometric illustration**
  (`colorScene()` in `lib/generate.ts`), built from the `isoTools` toolkit (true
  30deg, flat color + bold dark outline). Eight scenes: workspace/AI, finance,
  medical, design, ecommerce, education, social, plus the default. Selection:
  - **hero/about = the person's FIELD** (`sceneFromField`, from role + tagline
    first) - an AI/CS person is a *workspace*, NOT a hospital, even if one
    project is medical. About falls back to the richest project's scene.
  - **each project = its own text** (`sceneFromText`): VitalWatch -> medical,
    Expense -> finance.
  These are the one place the "one accent" rule is relaxed (deliberate
  illustration). Rendered `preserveAspectRatio="meet"` over a theme backdrop
  (`.frame.illus` = `--il-bg`) and recolored per theme by a CSS filter
  (`--il-filter`), both set in each `[data-theme]` block. The old monochrome
  motif art (`artPanel`/`pickMotif`/`buildMotif`/`isometricArt`) is dead code,
  kept only for reference.
- **Every uploaded image is a resizable box**, everywhere (hero, about, projects,
  extra media, gallery) and for images added later. In edit mode each gets a
  persistent **"Replace image"** button and right/bottom/corner drag handles
  (200x200-900x700 px, mouse + touch). The whole image is always shown
  (`object-fit:contain`, never cropped). Size lives on `MediaItem.w`/`h`,
  autosaved, re-applied on download. A replaced image defaults to its clamped
  natural size (small uploads are not blown up).
- The **result page is directly editable** (builder preview only, never the
  download): `generatePortfolioHtml(data, { editable:true })` adds `[data-edit]`
  (inline contenteditable text), a "Replace image" button (`[data-replace]`) and
  resize handles (`[data-rz]`), plus an edit script that posts changes to
  `Builder.tsx`, which writes them via `setPath()` and autosaves. Text edits do
  not reload the iframe (caret kept); image replace / resize / theme change bump
  `docKey` to reload. The download always uses `editable:false` - the shipped
  file has zero edit markup. The preview iframe is
  `sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"` and
  in-page nav (`#work`, etc.) scrolls via JS (a bare `#` href in a srcdoc iframe
  would otherwise resolve against the parent URL).
- Buttons stay tactile + color-blind safe (section 3).
- The result screen shows ONLY the portfolio.

---

## 11. Run it

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
```

Node/npm via winget (`node v24`, `npm 11`). Deps added: `@anthropic-ai/sdk`,
`mammoth` (Word text). PDFs are read by Claude directly.

---

## Sources

1. Luxury / premium branding psychology:
   https://medium.com/@vanmari.tanishka/the-psychology-behind-luxury-branding-why-we-crave-premium-experiences-f3a0859746aa
2. Whitespace = perceived value:
   https://ixdf.org/literature/article/the-power-of-white-space
3. Luxury web design principles:
   https://kijo.london/blog/luxury-website-design/
4. What hiring managers want in a portfolio:
   https://www.uxdesigninstitute.com/blog/hiring-managers-ux-portfolio/
5. Users scan, not read (F-pattern, hierarchy):
   https://www.nngroup.com/articles/f-shaped-pattern-reading-web-content/

## Accessibility note (color-blind buttons)

Buttons are read by shape + bottom edge + shadow + high-contrast label (ghost
variant adds a luminance border `color-mix(in srgb, var(--fg) 55%, transparent)`),
all luminance/shape based, not hue based. Targets >=44px; focus is a 2px accent
outline.

# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### To do
- Optional: stream AI progress; persist media via IndexedDB across refresh.

## [0.12.0] - 2026-06-06

Image-display fixes, clearer handles, and live-preview bug fixes.

### Changed
- **Uploaded images are now shown in full, never cropped** (`object-fit:contain`,
  superseding the `cover` from 0.11.0). Resizing smaller scales the whole image
  down proportionally inside its box; resizing works on both axes.
- A replaced image now defaults to a smaller, natural-size box (clamped), so the
  user has room to grow it and small uploads are not blown up.
- **Resize handles are more visible** - bigger, brighter bars with a white border
  and high-contrast grip lines, partly visible at rest and full on hover (always
  visible on touch).

### Fixed
- **Nav and hero in-page buttons** (Work / About / Contact) now scroll to their
  section instead of navigating the preview to the home page (a bare `#id` href
  in a `srcdoc` iframe was resolving against the parent URL; now handled in JS).
- **Email / WhatsApp / Call / social** buttons now work inside the live preview
  (the iframe allows popups; the edit script no longer blocks those links). They
  always worked in the download.
- **Load example** now opens the portfolio on the first click (the preview is
  regenerated synchronously when entering the result, not via an after-render
  effect).
- Documentation (`README.md`, `CLAUDE.md`, and the whole `docs/` set) rewritten
  to match the current builder (the old `docs/` described the removed v0.1.0
  fixed-portfolio).

## [0.11.0] - 2026-06-06

### Changed
- **Every uploaded image is now a resizable box** (hero, about, projects, extra
  media, work gallery - everywhere, and any image added later). Each image gets
  a **right handle** (width), a **bottom handle** (height) and a **corner handle**
  (both), with visible grip bars. Limits: 200x200 min, 900x700 max. Smooth
  pointer drag (mouse + touch); handles show on hover (desktop) and are always
  visible on touch. The **"Replace image" button stays visible on every image**.
  Size is stored per image (`MediaItem.w`/`h`), autosaved, and re-applied on
  download. A replaced image defaults to its natural size (clamped), so small
  uploads are not stretched. Images now fill their box (`object-fit:cover`).
  `imgWrap`/`boxStyle` in `lib/generate.ts`; `pf-img-size` -> `Builder` `setPath`.

## [0.10.0] - 2026-06-06

Colorful scenes everywhere, the hero matched to the field, and resizable images.

### Changed
- **The colorful illustration is now used across the whole site** (hero, about,
  every project placeholder), not just the hero.
- **The hero/about now represent the PERSON'S FIELD**, read from their role +
  tagline (`sceneFromField`): an AI / CS person gets a workspace scene, a
  designer a design studio, etc. - **no more "hospital for a CS student"** just
  because one project was medical. Each **project** placeholder still matches
  that project's own text (`sceneFromText`): VitalWatch -> medical, Expense ->
  finance. About shows the richest project's scene.
- Scenes render with `preserveAspectRatio="meet"` on a matching light backdrop
  (`.frame.illus`), so the full illustration shows in any frame shape.

### Added
- **Drag-to-resize images.** After replacing an image, a corner grip lets you
  drag to set its size; the image is always shown **in full** (never cropped).
  The size is stored on `MediaItem.scale`, applied as the block's max-width, and
  autosaved (edit script posts `pf-img-scale` -> `Builder` `setPath`).

## [0.9.0] - 2026-06-06

Gave the hero a real illustration.

### Added
- **Colorful, content-aware hero illustration** (`heroScene()` in
  `lib/generate.ts`): a flat-color, bold-dark-outline, true-30deg isometric scene
  in the Dribbble / Adobe style, built entirely as inline SVG (offline). A small
  toolkit (`isoTools`: box / cylinder / coin / ball / screen panels / heart)
  composes 8 scenes - **workspace/AI, finance, medical, design, ecommerce,
  education, social** - each with 10+ distinct objects plus a shared stage
  (platform, grid, plant, mug, floating accents).
- **Two-level scene selection** (`pickScene()`): Level 1 reads the CV's projects
  and picks the richest matching scene (e.g. a health project -> a hospital scene
  with a red cross, heart monitor + heartbeat, hospital bed, medicine bottles);
  Level 2 falls back to the person's field (role / skills). So the hero feels
  custom-made for the specific person. Verified: VitalWatch -> medical.

### Changed
- The hero no longer uses the monochrome cube art; project / about placeholders
  still use the theme-colored isometric motifs.

## [0.8.0] - 2026-06-06

Made the isometric art depict the work, and made the result page directly
editable.

### Added
- **Content-aware isometric scenes.** Keywords in each section's text now choose
  WHAT the scene depicts: a standing **phone** (app / mobile / banking), a
  **monitor** on a stand (dashboard / SaaS / web), a rising **bar chart + coin**
  (finance / fintech / sales), a **medical cross** (health / fitness / vitals), a
  **camera with a lens** (photo / film / video), stacked **artboards** (design /
  brand / UI), a **server/neural cluster** (AI / ML / data), **parcels** (shop /
  ecommerce), stacked **books** (education / research), or the abstract
  **monument** (default). `pickMotif()` + `buildMotif()` in `lib/generate.ts`;
  the text hash still varies proportions so each project is unique.
- **Inline editing on the result page.** Click any text to edit it in place; it
  saves automatically (no separate form needed). Built with `[data-edit]`
  markers + a small edit script that posts changes to the builder, which updates
  the data and persists it. Edits never reload the preview, so the caret and
  scroll position are kept.
- **Click-to-replace images.** Click the hero / about art, any project image, or
  a gallery image and a file picker opens; the chosen image from your computer
  replaces it and is saved automatically (embedded so the download stays
  offline). New optional `heroImage` / `aboutImage` fields put a real photo where
  the isometric art was.

### Changed
- `generatePortfolioHtml(data, { theme, editable })` - the builder preview passes
  `editable` (inline-edit hooks + script); the **download is never editable**, so
  the shipped file has no edit markup. The result iframe now renders the editable
  document; Download/AI revise still use the clean one.

## [0.7.0] - 2026-06-06

Rebuilt the isometric art into a premium, **text-driven** illustration system.

### Added
- **A composed isometric monument** replacing the loose floating-cube panel:
  a tiered stone pedestal, a stepped accent tower, four satellite pillars, a
  floating halo ring, drifting cubes and particles, over a faded architectural
  site-grid. Real 2:1 isometric projection (`ip()` / `ibox()` in
  `lib/generate.ts`), crisp non-scaling edges, soft blurred shadows + glow.
- **Each scene is generated from the section's text.** A hash of the title
  (`seedFrom` + a `mulberry` PRNG) deterministically picks the centerpiece form
  (stepped tower / twin towers / ziggurat), pillar heights, which cubes float,
  the ring size and the particle layout - so every project gets its own monument
  instead of one shared design. Same title always renders the same scene, so the
  preview still matches the download exactly.

### Changed
- `artPanel(seed, idx)` now takes the section text as a seed; new face classes
  (`fA1/2/3`, `fN1/2/3`), `iso-grid`, `iso-ring`, `iso-dot` and `float5`,
  mirrored in `lib/generate.ts` and `app/globals.css`.

### Removed
- The previous flat cube classes (`t1a..t2c`), the art caption (`iso-cap`), and
  the leftover gradient/streak helpers (`art-name`, `art-mono`, `blobA/B`,
  `streaks` + their keyframes).

## [0.6.0] - 2026-06-06

### Added
- **Isometric illustration** as the no-image fallback: when a project has no
  uploaded media, the portfolio shows a clean, gently floating, theme-colored
  isometric scene instead of a flat panel (`cube()` + rewritten `artPanel` in
  `lib/generate.ts`, recoloring via CSS-variable face classes). This applies to
  every generated portfolio, including the `/example` (Ghania) one.
- An **animated isometric visual on the builder home page** (shared
  `isometricArt()` markup + matching classes in `app/globals.css`).

### Removed
- The old gradient/streak art panels (and the `initials` helper).
- Refresh the deep `docs/` set to the AI/wizard model; `CLAUDE.md` is the
  current source of truth.

## [0.5.0] - 2026-06-06

Made the builder satisfy open-ended requests: contact actions, media, and any
custom sections.

### Added
- **Contact actions** generated from the CV/idea: WhatsApp ("Message on
  WhatsApp", `wa.me`), email, phone, and any social links become tactile buttons
  in the portfolio (`whatsapp` field + smarter `socials`).
- **Work media**: upload images/videos from the computer (embedded as data URLs
  so the download stays offline) or paste a URL. Attach to a project or a new
  **Work gallery**. New `MediaList` component; `MediaItem` / `gallery` /
  `ProjectItem.media` in the schema; `<img>`/`<video>` rendering in the output.
- **Custom sections** (`sections`): the AI can add any section the user asks for
  (services, testimonials, FAQ, pricing, process, publications, ...) with a
  `text` / `list` / `cards` / `quote` layout. Editable by hand too.
- **Editor step** ("Edit & add media") reachable from the result: edit every
  field, manage media, and manage custom sections, then return to the
  full-screen portfolio.

### Changed
- AI prompt + tool schema extended for `whatsapp`, richer `socials`, and
  `sections`. Revisions strip media before the AI call and reattach it after, so
  large media never inflates a request and is preserved across edits.
- localStorage persistence falls back to a media-stripped save to avoid quota
  errors (media always stays in the live session and the download).

## [0.4.0] - 2026-06-06

Turned the builder into a guided, **AI-powered** wizard and added two themes.

### Added
- **AI generation** via Claude (`lib/ai.ts`, `app/api/generate`,
  `app/api/revise`): reads PDF natively, Word via `mammoth`, and text; returns
  structured `PortfolioData` through a forced tool call; honesty enforced in the
  prompt. Key read server-side from `ANTHROPIC_API_KEY` (`.env.local.example`).
- **Guided wizard** (`components/builder/Builder.tsx`): Home -> Upload CV
  (browse/drag/drop a PDF/Word/text file, or paste) -> Choose theme (5 cards) ->
  Describe idea -> AI build -> gap questions -> **full-screen result** (portfolio
  only) with Download / Make changes / Home, plus **back navigation everywhere**.
- **Make changes**: describe edits in a box; Claude recreates the portfolio.
- **Two new themes**: Royal (deep, gold) and Pastel (soft, rose), for 5 total,
  in `globals.css`, `lib/themes.ts`, and inlined in the generated file.
- `generatePortfolioHtml(data, { theme })` sets the initial theme; the generated
  file's switcher now offers all 5.
- Dependencies: `@anthropic-ai/sdk`, `mammoth`.

### Changed
- The result screen now shows **only** the portfolio (fixing the split-view
  complaint); themes are selectable in the flow and inside the download.

### Removed
- `lib/cv-parser.ts` (heuristic parser) - replaced by AI extraction.

## [0.3.0] - 2026-06-06

Pivoted the project from a single hand-built portfolio into a **portfolio
builder** (Portfolio Studio): paste a CV, fill only the gaps, preview live, and
download a self-contained portfolio file.

### Added
- `lib/portfolio-schema.ts`: one `PortfolioData` model, `findGaps()`, and a
  built-in **Ghania** example (`examplePortfolio()`).
- `lib/cv-parser.ts`: pure client-side CV extraction (contact patterns + heading
  detection + per-section parsing).
- `lib/generate.ts`: `generatePortfolioHtml()` produces a complete standalone,
  offline, theme-switchable HTML portfolio with inlined CSS/JS and inline
  animated SVG art (no external requests).
- `components/builder/*`: the builder UI (CV paste + extract, gap banner,
  gap-aware form, live `<iframe>` preview, one-click download, Load example,
  Start over) with an Edit/Preview toggle on mobile.
- `components/ui/Button.tsx` + `.btn` styles: the shared **pressable, color-blind
  safe** button (edge + shadow affordance, presses down on click).
- Routes: builder at `/`, the example portfolio at `/example`.
- Theme tokens `--accent-edge` / `--btn-shadow` per theme.

### Changed
- `app/page.tsx` now renders the builder; `app/layout.tsx` metadata describes the
  product and no longer imports a fixed profile.
- Bigger, more scannable type scale across hero/sections; fully responsive
  two-pane builder.

### Removed
- The previous fixed-owner portfolio: `components/site/*`,
  `components/ui/MagneticButton.tsx`, and `lib/content.ts`. Their content lives
  on only as the editable in-app example.

## [0.2.0] - 2026-06-05

Repurposed the portfolio for its real owner, **Munazza Iqbal** (Meta Ads
specialist and AI video content creator), keeping the same luxury design system
and theme switching.

### Changed
- Rewrote `lib/content.ts` with Munazza's real CV: profile, two case studies
  (EmpowerHer, Heaven Herbal Oil), tools, four core-expertise areas, honest
  stats, and a value statement.
- Re-mapped sections to a performance-marketer structure: Selected Work (case
  studies), Tools & platforms marquee, Core expertise, About with a stats row,
  and a Contact section with phone, email, and Facebook.

### Added
- New `Certifications` section: the three DigiSkills credentials plus education
  (B.A., AIOU), as a framed credential grid.
- New abstract "illusionary" poster art (layered light + mesh gradients) from the
  updated `scripts/gen-placeholders.mjs`, replacing the designer placeholders.

## [0.1.0] - 2026-06-05

Initial build: a luxury, premium, theme-switchable portfolio for an independent
designer / art director.

### Added
- Next.js 15 (App Router) + Tailwind v4 + Motion + TypeScript scaffold.
- Token-driven theme system with three themes (Cinematic, Editorial, Mono),
  a live nav switcher, `localStorage` persistence, and a pre-paint script that
  prevents a flash of the wrong palette.
- Nine page sections: Nav, Hero, Selected Work, Recognition, Capabilities,
  About, Testimonial, Contact, Footer. Each is its own layout family.
- Single-source content model in `lib/content.ts` (profile, projects, clients,
  capabilities, testimonial), so content edits never touch a component.
- Motion primitives: `Reveal` (scroll-in) and `MagneticButton` (pointer
  physics via motion values), both honoring `prefers-reduced-motion`.
- Local, on-brand SVG placeholder posters plus a re-runnable generator
  (`scripts/gen-placeholders.mjs`); removed the external image dependency.
- Documentation: `CLAUDE.md` (brief, research, design system, house rules),
  `README.md`, and a full `docs/` set (README index, SETUP, CONTENT, THEMING,
  ARCHITECTURE, COMPONENTS, DEPLOY).

### Design
- Dark-cinematic luxury direction: heavy whitespace, one locked accent per
  theme, fluid type scale, motion only where it is motivated.
- Built to the `design-taste-frontend` anti-slop rules: zero em-dashes, no
  three-equal-card grids, rationed eyebrows, one marquee, WCAG AA contrast.

### Changed
- Reworked the Testimonial from a narrow centered block into an editorial,
  left-aligned composition so the section fills its space and reads premium.

### Verified
- Clean production build (`next build`): TypeScript types valid, lint passes,
  all static pages generated. Home route about 47.8 kB (150 kB first load JS).

[Unreleased]: https://example.com/
[0.1.0]: https://example.com/

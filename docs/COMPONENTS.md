# Components & section builders

The project has two layers: the **builder app** (React components that run the
wizard) and the **generated file** (the portfolio, assembled by string-building
functions in `lib/generate.ts`). This is a reference to both.

---

## 1. The builder app (`components/`)

### `builder/Builder.tsx` — the wizard + live-edit bridge
A `"use client"` state machine. Steps: `home → upload → theme → idea → working →
gaps → result → editor → changes → error`, with back navigation everywhere.

Responsibilities:
- Holds `data` (`PortfolioData`), `theme`, and the file/idea/change inputs.
- Persists `{ data, theme }` to `localStorage` (with a media-stripped fallback on
  quota error).
- Calls `/api/generate` and `/api/revise`; strips media before AI calls and
  re-attaches it after (`stripMedia` / `mergeMedia`).
- Renders the **result** as a sandboxed `<iframe srcDoc>` using the *editable*
  document, and runs the **postMessage bridge**: it receives `pf-edit` (text),
  `pf-img` (replace), and `pf-img-size` (resize) messages and writes them into
  `data` via `setPath()` (then autosaves). It owns the hidden file input used for
  Replace, and computes a default image box from the upload's natural size
  (`fitBox`).
- `showResult()` bumps `docKey` so the preview regenerates when (and only when)
  entering the result — text edits do **not** reload it (caret kept).
- Renders the **form editor** ("Edit & add media") and the **gap** step.

### `builder/Fields.tsx` — form inputs
`Field`, `TextInput`, `TextArea`, `Repeat<T>`, `SkillsEditor`, and `MediaList`
(browse files → data URL, or paste a URL; thumbnails, alt, remove).

### `theme/` — `ThemeProvider`, `ThemeSwitcher`
App-chrome theme state + the picker (see [THEMING.md](THEMING.md)).

### `ui/` — `Button`, `icons`
`Button` is the shared **pressable pill** (color-blind-safe edge + shadow). Used
across the app; the generated file inlines the same `.btn` styles.

---

## 2. The generated file (`lib/generate.ts`)

`generatePortfolioHtml(data, { theme?, editable? })` returns a full
`<!doctype html>` string. It composes section builders, inlines `STYLES`
(5 themes + everything), and adds the head/body scripts (theme switch, scroll-in
reveal, in-page nav scroll). With `editable: true` it also injects the edit
script and per-element edit hooks.

### Section builders (each returns an HTML string)
`navHtml`, `heroHtml`, `aboutHtml`, `projectsHtml`, `galleryHtml`,
`experienceHtml`, `skillsHtml`, `certsHtml`, `customSectionsHtml`, `contactHtml`,
`footerHtml`. Each renders only when it has content.

### The illustrations
- `colorScene(sceneId)` — a colorful, flat, dark-outline isometric scene built
  from the `isoTools` toolkit (`isoTools`, `mat`, `heartPath`, the `SCENES` map).
- Scene selection: `sceneFromField(d)` (hero/about), `sceneFromText(text)` (each
  project), with `SCENE_KEYS` / `FIELD_KEYS` keyword tables.
- `artPanel` / `pickMotif` / `buildMotif` / `isometricArt` are the **old**
  monochrome motif art — dead code, kept for reference only.

### Edit-mode helpers (only active when `editable`)
- `ed(path[, multiline])` — marks a text element `data-edit` (inline editable).
- `imgWrap(inner, path, isImage)` — for a scene, click-to-add-photo; for a real
  image, an always-on **Replace image** button + right/bottom/corner resize
  handles (`[data-rz]`).
- `boxStyle(item)` — the inline `width`/`height` px box for an uploaded image
  (clamped 200×200–900×700).
- `EDIT_SCRIPT` — the injected script that wires contenteditable, replace, and
  smooth pointer-drag resizing, posting messages to the builder.

---

## 3. Recipes

### Add a section to the output
Write a `fooHtml(d)` builder in `lib/generate.ts` (use `.shell` for width, theme
tokens for color, `data-reveal` for scroll-in), add any CSS to `STYLES`, and slot
it into the `body` array in `generatePortfolioHtml`. If users should edit its
text inline, wrap fields with `ed("path")`.

### Make a field inline-editable
Add `${ed("fieldPath")}` to the element in its builder; `setPath` in
`Builder.tsx` already understands paths like `projects#0.title`,
`sections#1.items#2.heading`, `skills#3`.

### Add an isometric scene
Add a builder to the `SCENES` map in `lib/generate.ts` (compose with `isoTools`
boxes/cylinders/etc.) and route to it from `SCENE_KEYS` / `FIELD_KEYS`.

### Add a wizard step or editor field
Edit the `Step` union and the relevant block in `components/builder/Builder.tsx`.

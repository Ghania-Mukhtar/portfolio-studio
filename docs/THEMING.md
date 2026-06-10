# Theming

Everything is driven by **semantic CSS variables (design tokens)**: switching the
`data-theme` attribute re-skins everything because every rule reads `var(--token)`.
There are five themes — **Cinematic** (default, dark), **Editorial** (warm paper),
**Mono** (stark), **Royal** (deep gold), **Pastel** (soft rose).

> Important: there are **two parallel theme systems**, because the builder app and
> the portfolio it generates are separate documents.

---

## 1. The two theme systems

### a) The app chrome — `app/globals.css` + `lib/themes.ts`
The wizard UI (panels, buttons, the home page) uses tokens defined in
`app/globals.css` under `[data-theme="..."]` blocks, mapped to Tailwind utilities
via `@theme inline` (so you write `bg-bg`, `text-fg`, `bg-accent`, …). `ThemeProvider`
sets `data-theme` on `<html>` and persists it; `ThemeSwitcher` renders the picker
from the `THEMES` registry in `lib/themes.ts`.

### b) The generated file — inlined in `lib/generate.ts`
The downloaded portfolio is standalone, so it carries **its own identical token
set**, inlined in the `STYLES` string inside `generate.ts`, plus a 5-swatch
switcher and a small script that persists the choice to `localStorage`. This is
why the download is independently theme-switchable, offline.

**Both must stay in sync.** If you change a theme's colors, change them in *both*
`app/globals.css` and the `STYLES` block in `lib/generate.ts`.

---

## 2. The tokens

Each `[data-theme]` block defines: `--bg`, `--bg-elev`, `--surface`, `--fg`,
`--fg-muted`, `--fg-faint`, `--accent`, `--accent-fg`, `--accent-edge`,
`--border`, `--hairline`, `--btn-shadow`, and `color-scheme`.

The generated file's blocks add two more, for the illustrations:

- `--il-bg` — the backdrop behind a colorful isometric illustration.
- `--il-filter` — a CSS `filter` (hue-rotate / saturate) applied to the
  illustration so it **recolors with the theme** (e.g. Mono desaturates it toward
  grayscale, Royal shifts toward purple/gold). Applied via `.hero-illus` /
  `.frame.illus` in the `STYLES` block.

`--accent-edge` + `--btn-shadow` drive the pressable button's bottom edge and
drop shadow (the color-blind-safe affordance).

---

## 3. Tune a theme

Open the `[data-theme="<name>"]` block in **`app/globals.css`** and adjust the
values, then mirror the same change in the `STYLES` string in
**`lib/generate.ts`**. Keep the variable *names*; only change values. Keep text vs
background at WCAG AA contrast.

---

## 4. Add a new theme

1. **App chrome:** copy a `[data-theme="..."]` block in `app/globals.css`, rename
   it, set new values (include `--il-bg` / `--il-filter` if you want the
   illustration tuned).
2. **Registry:** add an entry to `THEMES` in `lib/themes.ts` (`id`, `label`,
   `note`, `swatch`) and extend the `ThemeId` union.
3. **Generated file:** add the matching `[data-theme="..."]` block to the `STYLES`
   string in `lib/generate.ts`, and a swatch to its `SWATCHES` list so the
   download's switcher offers it.

After that it works across the app chrome and inside every downloaded file.

---

## 5. Typography

Bricolage Grotesque (display), Inter Tight (body), JetBrains Mono (labels). The
app loads them via `next/font`; the generated file links Google Fonts when online
and falls back to system fonts offline.

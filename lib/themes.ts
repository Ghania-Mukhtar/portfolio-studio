// Single source of truth for available themes.
// To add one: add an entry here AND a matching [data-theme="id"] block
// in app/globals.css (and inline it in lib/generate.ts for the downloaded
// file). The switcher updates automatically.

export type ThemeId = "cinematic" | "editorial" | "mono" | "royal" | "pastel";

export interface Theme {
  id: ThemeId;
  label: string;
  /** One-word feel, shown under the label in the switcher. */
  note: string;
  /** Swatch shown in the switcher: [background, text, accent]. */
  swatch: [string, string, string];
}

export const THEMES: Theme[] = [
  {
    id: "cinematic",
    label: "Cinematic",
    note: "Dark",
    swatch: ["#0b0b0c", "#ece9e1", "#c2a878"],
  },
  {
    id: "editorial",
    label: "Editorial",
    note: "Paper",
    swatch: ["#f3f0e9", "#1a1916", "#9e4a2e"],
  },
  {
    id: "mono",
    label: "Mono",
    note: "Stark",
    swatch: ["#fafaf8", "#111111", "#111111"],
  },
  {
    id: "royal",
    label: "Royal",
    note: "Gold",
    swatch: ["#0f0c1d", "#ece8f6", "#c9a24b"],
  },
  {
    id: "pastel",
    label: "Pastel",
    note: "Soft",
    swatch: ["#f7f2f6", "#2c2733", "#b5687f"],
  },
];

export const DEFAULT_THEME: ThemeId = "cinematic";
export const THEME_STORAGE_KEY = "atelier-theme";

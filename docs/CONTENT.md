# Content: the data model and how it gets filled

There is no hand-edited content file. Every portfolio is one **`PortfolioData`**
object, defined in `lib/portfolio-schema.ts`. The AI fills it from a CV, the user
edits it, and the renderer turns it into the standalone HTML file. This doc is the
guide to that object and the four ways it changes.

---

## 1. The model: `PortfolioData`

`lib/portfolio-schema.ts` is the single source of truth for the shape. Key parts:

| Field | Notes |
|---|---|
| `name`, `role`, `tagline`, `heroSub` | Identity. `tagline` is the loud hero headline. |
| `statement`, `about` | The About section. `about` is paragraphs separated by a blank line. |
| `location`, `email`, `phone`, `whatsapp`, `availability` | Contact. Each populated field can drive an action button. |
| `socials[]` | `{ label, href }` — each becomes a link button. |
| `skills[]` | Strings → chips. |
| `projects[]` | `{ title, discipline, year, summary, outcome, media? }`. |
| `experience[]`, `certifications[]`, `education[]`, `stats[]` | Proof sections. |
| `sections[]` | Custom AI/user sections: `{ title, layout, body, items[] }`, layout = `text` / `list` / `cards` / `quote`. |
| `gallery[]` | A standalone Work gallery of `MediaItem`s. |
| `heroImage?`, `aboutImage?` | Optional photos that replace the hero / about illustration. |

`MediaItem` = `{ type: "image" | "video", src, alt, w?, h? }`. `src` is a data
URL (uploaded, kept offline) or an `https` URL (pasted). `w`/`h` are the user's
chosen display box in px (set by the resize handles).

Helpers in the same file:

- `emptyPortfolio()` — a blank object (the base everything merges onto).
- `examplePortfolio()` — the built-in **Ghania** sample (AI student; VitalWatch,
  Expense Management System). Powers **Load example** and `/example`. It is only
  data — nothing in the renderer is special-cased to it.
- `findGaps(data)` — the required fields still empty (drives the gap questions).

---

## 2. How the model gets filled — four ways

### a) The AI, from a CV (`lib/ai.ts` + `app/api/generate`)
`generatePortfolio()` sends the CV (PDF read natively, Word via `mammoth`, or
text) plus the idea + theme to Claude, which is **forced to return structured
output** via the `build_portfolio` tool whose schema mirrors `PortfolioData`. The
result is merged onto `emptyPortfolio()`. The prompt enforces honesty (no invented
employers, metrics, or dates) and house style (no em-dashes). Media, `heroImage`,
`aboutImage`, and `gallery` are **not** AI-managed (the AI never sees uploaded
media — see `stripMedia`/`mergeMedia` in `Builder.tsx`).

### b) The AI, from a change request (`app/api/revise`)
`revisePortfolio()` takes the current data + a free-text instruction and returns a
revised `PortfolioData`. Media is stripped before the call and re-attached after.

### c) Inline editing on the result (autosaved)
The result preview is rendered with `editable: true`, which adds edit hooks. The
user **clicks any text to edit it** and it autosaves; a per-image **"Replace
image"** button swaps a photo; **drag handles** resize each image. Changes are
posted from the iframe to `Builder.tsx`, which writes them with `setPath()` and
persists. (See [COMPONENTS.md](COMPONENTS.md) and [ARCHITECTURE.md](ARCHITECTURE.md).)

### d) The form editor ("Edit & add media")
A full manual editor in `Builder.tsx`: every field, per-project `MediaList`
(upload/paste images & videos), the Work gallery, and custom sections.

---

## 3. Where empty image slots come from (illustrations)

When a slot has no uploaded image, the renderer draws a **colorful isometric
illustration** chosen from the data, not a stock graphic:

- **Hero / about** → the person's field (`sceneFromField`: role + tagline).
- **Each project** → that project's text (`sceneFromText`).

So changing a project's title/summary can change its illustration; changing the
role can change the hero scene. See [THEMING.md](THEMING.md) for how they recolor.

---

## 4. Editing the model itself (for developers)

If you add or rename a field:

1. Update the interface in `lib/portfolio-schema.ts` (and `emptyPortfolio()`).
2. Render it in `lib/generate.ts` (a section builder + any CSS).
3. If the AI should fill it, add it to `PORTFOLIO_SCHEMA` and the prompt in
   `lib/ai.ts` (keep them in sync with the type).
4. If users should edit it, add a field to the editor / gap step in
   `components/builder/Builder.tsx`, and an inline `data-edit` hook in the
   renderer if it should be click-editable.

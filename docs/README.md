# Documentation

Everything you need to run, edit, theme, extend, and ship **Portfolio Studio** —
the AI portfolio builder. Start with whichever matches what you are trying to do.

## Map

| Doc | Read it when you want to... |
|---|---|
| [SETUP.md](SETUP.md) | Install Node, add your Anthropic API key, run the dev server, and build. |
| [CONTENT.md](CONTENT.md) | Understand the one data model (`PortfolioData`), how the AI fills it, and how the live editor + form editor change it. |
| [THEMING.md](THEMING.md) | Understand the two theme systems (app chrome + generated file), tune a theme, or add a new one. |
| [ARCHITECTURE.md](ARCHITECTURE.md) | See the folder-by-folder layout, the single renderer, and how data flows from CV to download. |
| [COMPONENTS.md](COMPONENTS.md) | Look up the wizard pieces, the generated-file section builders, and how to add a section or field. |
| [DEPLOY.md](DEPLOY.md) | Put the builder live (needs a Node/serverless host for the AI routes + the API key). |

## Also in the repo root

- **[../CLAUDE.md](../CLAUDE.md)** is the brief and the research: the product
  flow, why it feels premium (luxury web mechanics, scanning, color/type),
  the target audience, and the anti-slop house rules. Read it before changing
  the design.
- **[../README.md](../README.md)** is the one-screen quick start.
- **[../CHANGELOG.md](../CHANGELOG.md)** is the running history of what changed.

## The 30-second mental model

- **One data model.** Everything is a `PortfolioData` object
  (`lib/portfolio-schema.ts`). The AI fills it from a CV; the editor changes it;
  the renderer serializes it.
- **One renderer.** `generatePortfolioHtml(data, opts)` in `lib/generate.ts`
  produces a complete standalone HTML string — used for the live preview, the
  download, and `/example`. So **preview == download**, and every feature applies
  to every portfolio (the example is only sample data).
- **The key stays on the server.** `ANTHROPIC_API_KEY` is read only by the
  `/api` routes (`lib/ai.ts`); it never reaches the browser.
- **The output is offline-first.** The downloaded file inlines all CSS/JS, draws
  empty image slots as inline-SVG illustrations, and embeds uploaded media as
  data URLs — no network needed to open it.

// ============================================================
//  generatePortfolioHtml(data) -> a complete, standalone HTML
//  document for a premium portfolio.
//
//  - Self-contained: all CSS + JS are inlined, so the file works
//    by double-click with NO server and NO internet (fonts fall
//    back to system fonts offline; Google Fonts load if online).
//  - Theme-switchable: 3 themes via a switcher baked into the file,
//    persisted to localStorage.
//  - Responsive, big scannable type, tactile pressable buttons,
//    motion that honors prefers-reduced-motion.
//
//  The builder shows this exact string in an <iframe> (the live
//  preview) and the Download button saves this exact string. So the
//  preview is always identical to the download.
// ============================================================

import type { PortfolioData, MediaItem } from "./portfolio-schema";

// ---- small helpers ----------------------------------------------------------

/** Escape text for safe insertion into HTML body. */
function esc(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Escape for an attribute value (href, etc.). */
function escAttr(s: string): string {
  return esc(s);
}

function has(s?: string): boolean {
  return !!s && s.trim() !== "";
}

// ---- inline-edit markers ----------------------------------------------------
// When the builder renders the result it passes `editable`, which turns on
// data-edit / data-img hooks (and the edit script). The DOWNLOAD is never
// editable, so these markers add nothing to the file the user ships.
let EDITABLE = false;
/** Marks a text element as inline-editable, bound to schema path `path`. */
function ed(path: string, multiline = false): string {
  return EDITABLE ? ` data-edit="${escAttr(path)}"${multiline ? ' data-ml="1"' : ""}` : "";
}
/** Wraps a visual for edit mode. For a generated scene, clicking it adds a photo.
 * For a real image: an always-visible "Replace image" button, plus right (width),
 * bottom (height) and corner drag handles to resize the picture's box. */
function imgWrap(inner: string, path: string, isImage = false): string {
  if (!EDITABLE) return inner;
  const p = escAttr(path);
  if (isImage) {
    const grip = "<i></i><i></i><i></i>";
    const h = (dir: string, cls: string, g: string) =>
      `<span class="rzh ${cls}" data-rz="${dir}" data-img="${p}" aria-hidden="true">${g}</span>`;
    return `<div class="img-edit is-img">${inner}<button class="img-btn" type="button" data-replace data-img="${p}">Replace image</button>${h("w", "rzh-w", grip)}${h("h", "rzh-h", grip)}${h("wh", "rzh-c", "")}</div>`;
  }
  return `<div class="img-edit" data-img="${p}"><span class="img-edit-hint">Click to add a photo</span>${inner}</div>`;
}

const IMG_MINW = 200, IMG_MINH = 200, IMG_MAXW = 900, IMG_MAXH = 700;
/** Inline size for an image box (px, clamped). Falls back to a sensible box. */
function boxStyle(item?: MediaItem): string {
  if (!item) return "";
  const w = Math.max(IMG_MINW, Math.min(IMG_MAXW, Math.round(item.w || 480)));
  const h = Math.max(IMG_MINH, Math.min(IMG_MAXH, Math.round(item.h || 360)));
  return ` style="width:${w}px;height:${h}px;max-width:100%"`;
}

// ---- isometric illustration -------------------------------------------------
// A deliberately composed isometric monument: a tiered stone pedestal, a stepped
// accent tower, four satellite pillars, a floating halo ring, drifting cubes and
// particles, set over a faded architectural site-grid. Real 2:1 isometric
// projection, crisp non-scaling edges, soft blurred shadows + glow. Pure inline
// SVG (no external requests, works offline) and every face fills from a theme
// variable, so the whole scene recolors with the active theme.
const IW = 38; // tile half-width
const IH = 19; // tile half-height (2:1 iso)
const IU = 22; // pixels per height level
const IOX = 400;
const IOY = 212;
// Project a grid point (gx, gy, gz) to screen space, rounded to keep markup lean.
function ip(gx: number, gy: number, gz: number): [number, number] {
  return [
    Math.round((IOX + (gx - gy) * IW) * 10) / 10,
    Math.round((IOY + (gx + gy) * IH - gz * IU) * 10) / 10,
  ];
}
function poly(pts: Array<[number, number]>): string {
  return pts.map((p) => `${p[0]},${p[1]}`).join(" ");
}
type IsoKind = "A" | "N"; // Accent or Neutral palette

// Per-face gradient shading (the premium lift): each surface fills with a subtle
// light-to-dark gradient instead of a flat color, so every box reads with
// directional light (lit right face, shaded left) and soft ambient-occlusion
// grounding (walls darken toward their base). Stops are built from the theme
// variables via color-mix, so the whole scene still recolors with the active
// theme and makes no external requests (works offline). Defined once, referenced
// by id from every face, so the markup stays lean.
const ISO_NEU = "color-mix(in srgb,var(--fg) 22%,var(--bg))";
const accDark = (p: number) => `color-mix(in srgb,var(--accent),#000 ${p}%)`;
const neuDark = (p: number) => `color-mix(in srgb,${ISO_NEU},#000 ${p}%)`;
function vGrad(id: string, top: string, bot: string): string {
  return `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:${top}"/><stop offset="1" style="stop-color:${bot}"/></linearGradient>`;
}
// Top faces catch a faint sheen highlight; side faces center on the old flat
// tones (~16% / ~36% darker) but fade darker toward the ground for grounding.
const ISO_GRADS =
  vGrad("gAt", "color-mix(in srgb,var(--accent),#fff 16%)", "var(--accent)") +
  vGrad("gAr", accDark(8), accDark(24)) +
  vGrad("gAl", accDark(28), accDark(45)) +
  vGrad("gNt", `color-mix(in srgb,${ISO_NEU},var(--fg) 12%)`, ISO_NEU) +
  vGrad("gNr", neuDark(8), neuDark(24)) +
  vGrad("gNl", neuDark(28), neuDark(45));
// A soft tinted backdrop vignette + a contact-shadow gradient for grounding.
const ISO_BG =
  `<radialGradient id="isoBg" cx="50%" cy="40%" r="62%"><stop offset="0" style="stop-color:color-mix(in srgb,var(--bg-elev),var(--accent) 8%)"/><stop offset="1" style="stop-color:var(--bg-elev)"/></radialGradient>`;

// One box: footprint (gx,gy)+(fw,fd), walls from z0 up to z1, top face at z1.
// Top is lightest (sheen), the right (x) face mid, the left (y) face darkest.
function ibox(gx: number, gy: number, fw: number, fd: number, z0: number, z1: number, k: IsoKind): string {
  const top: Array<[number, number]> = [ip(gx, gy, z1), ip(gx + fw, gy, z1), ip(gx + fw, gy + fd, z1), ip(gx, gy + fd, z1)];
  const right: Array<[number, number]> = [ip(gx + fw, gy, z1), ip(gx + fw, gy + fd, z1), ip(gx + fw, gy + fd, z0), ip(gx + fw, gy, z0)];
  const left: Array<[number, number]> = [ip(gx, gy + fd, z1), ip(gx + fw, gy + fd, z1), ip(gx + fw, gy + fd, z0), ip(gx, gy + fd, z0)];
  const t = k === "A" ? "gAt" : "gNt";
  const rg = k === "A" ? "gAr" : "gNr";
  const lf = k === "A" ? "gAl" : "gNl";
  const face = (id: string, pts: Array<[number, number]>) =>
    `<polygon class="iso-e" fill="url(#${id})" points="${poly(pts)}"/>`;
  // A bright rim along the two lit top edges (the "Λ" ridge from the right vertex
  // through the back vertex to the left vertex). Reduced-opacity edge highlights
  // are the signature premium cue that makes a face read as a lit, solid object.
  const hl = `<polyline class="iso-hl iso-hl${k}" points="${poly([top[1], top[0], top[3]])}"/>`;
  return face(lf, left) + face(rg, right) + face(t, top) + hl;
}

// Deterministic seed from the section's text, so the same title always yields
// the same monument (preview == download) while different titles look distinct.
function seedFrom(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}
// Small seeded PRNG (mulberry32): a stream of 0..1 driven by the text.
function mulberry(a: number): () => number {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A flat isometric disk (circle on the ground plane at height gz), for coins,
// camera lenses, server nodes, etc. radius r is in grid units.
function idisk(gx: number, gy: number, gz: number, r: number, cls: string): string {
  const [cx, cy] = ip(gx, gy, gz);
  return `<ellipse class="${cls}" cx="${cx}" cy="${cy}" rx="${Math.round(IW * r * 10) / 10}" ry="${Math.round(IH * r * 10) / 10}"/>`;
}

// Which object the scene depicts, decided from the section's text. Keyword
// groups are tested in priority order; the first hit wins, else a "monument".
type MotifId = "phone" | "monitor" | "chart" | "health" | "camera" | "design" | "ai" | "shop" | "book" | "monument";
const MOTIF_KEYS: Array<[MotifId, string[]]> = [
  ["chart", ["finance", "fintech", "expense", "budget", "money", "sales", "growth", "revenue", "forecast", "invest", "trading", "stock", "accounting", "statistic", "metric"]],
  ["health", ["health", "medical", "vital", "fitness", "clinic", "hospital", "patient", "wellness", " care ", "heart", "watch", "therapy", "doctor", "pharma", "diagnos"]],
  ["camera", ["photo", "camera", "film", "cinema", "lens", "video", "shoot", "footage", "reel", "youtube"]],
  ["phone", [" app ", "mobile", " ios ", "android", "bank", "wallet", "payment", "messaging", "chat app"]],
  ["monitor", ["dashboard", "web app", "webapp", "saas", "analytic", "admin", "platform", "website", "portal", "landing page", "browser"]],
  ["ai", [" ai ", " ml ", "machine learning", "neural", " model ", "intelligence", " data ", "llm", " nlp ", "computer vision", "algorithm", "deep learning", "predict", "classif", "chatbot", "generative"]],
  ["shop", ["shop", "store", "ecommerce", "e-commerce", "commerce", "retail", "marketplace", " cart ", "checkout", "catalog"]],
  ["book", ["education", "course", "learn", "study", "research", " book", "publication", "writing", "blog", "teaching", "academic", "thesis", " paper", "tutor", "school", "student"]],
  ["design", ["design", "brand", "logo", " ui ", " ux ", " art ", "creative", "graphic", "illustrat", "visual", "figma", "studio", "portfolio", "typograph"]],
];
function pickMotif(text: string): MotifId {
  const t = " " + text.toLowerCase().replace(/[^a-z0-9]+/g, " ") + " ";
  for (const [id, keys] of MOTIF_KEYS) {
    for (const k of keys) {
      if (t.includes(k.includes(" ") ? k : " " + k + " ") || t.includes(k)) return id;
    }
  }
  return "monument";
}

// Tools a motif uses to build its centerpiece: `put` adds a depth-sorted box,
// `over` queues SVG drawn above the structures (ellipses, floating accents).
interface MotifKit {
  put: (gx: number, gy: number, fw: number, fd: number, z0: number, z1: number, k: IsoKind) => void;
  putC: (cx: number, cy: number, w: number, d: number, z0: number, z1: number, k: IsoKind) => void;
  over: (svg: string) => void;
  float: (svg: string, n: number) => string;
  rand: (lo: number, hi: number) => number;
  rng: () => number;
}

// Each motif returns the peak height (z) of its tallest element, used to place
// the ambient glow. Centred on grid (3,3); structures sit on the pedestal top.
function buildMotif(id: MotifId, k: MotifKit): number {
  const { put, putC, over, float, rand, rng } = k;
  const Z = 1.4; // pedestal top
  switch (id) {
    case "phone": {
      // A standing phone: a thin tall slab with an accent "screen" plate in front.
      const top = rand(4.4, 5.0);
      putC(3, 3, 1.5, 0.34, Z, top, "N");
      putC(3, 3.2, 1.18, 0.06, Z + 0.3, top - 0.3, "A"); // screen
      // floating notification cards beside it
      over(float(ibox(4.5, 1.9, 0.7, 0.7, top - 1.1, top - 0.55, "A"), 1));
      over(float(ibox(0.9, 4.3, 0.6, 0.6, top - 2.2, top - 1.7, "A"), 4));
      return top;
    }
    case "monitor": {
      // A wide screen on a stand: foot, post, body, and an accent display plate.
      const top = rand(3.5, 3.9);
      putC(3, 3.15, 1.1, 0.6, Z, Z + 0.18, "N"); // foot
      putC(3, 3.1, 0.4, 0.4, Z + 0.18, Z + 0.9, "N"); // post
      putC(3, 3, 2.3, 0.3, Z + 0.9, top, "N"); // body
      putC(3, 3.16, 2.0, 0.06, Z + 1.05, top - 0.16, "A"); // display
      over(float(ibox(4.6, 1.9, 0.55, 0.55, top - 0.4, top + 0.1, "A"), 2)); // floating widget
      return top;
    }
    case "chart": {
      // A rising bar chart with a floating coin.
      const hs = [rand(2.0, 2.4), rand(2.7, 3.1), rand(3.5, 3.9), rand(4.4, 4.9)];
      for (let i = 0; i < 4; i++) {
        putC(2.0 + i * 0.62, 3, 0.5, 0.5, Z, hs[i], i % 2 ? "N" : "A");
      }
      // coin = a short accent cylinder, floating
      over(`<g class="float3">${idisk(4.8, 1.6, hs[3] + 0.4, 0.42, "fA2")}${idisk(4.8, 1.6, hs[3] + 0.62, 0.42, "fA1")}</g>`);
      return Math.max(...hs);
    }
    case "health": {
      // A 3D medical cross: a tall column with two mid side blocks + a floating pulse.
      const top = rand(3.3, 3.8);
      putC(3, 3, 0.74, 0.74, Z, top, "A"); // column
      putC(2.35, 3, 0.62, 0.62, Z + 0.9, Z + 1.6, "A"); // left arm
      putC(3.65, 3, 0.62, 0.62, Z + 0.9, Z + 1.6, "A"); // right arm
      over(float(ibox(4.5, 2.0, 0.5, 0.5, top - 0.5, top, "A"), 5));
      return top;
    }
    case "camera": {
      // A camera body with a round lens and a viewfinder bump.
      const top = rand(2.7, 3.0);
      putC(3, 3, 1.7, 1.05, Z, top, "N"); // body
      putC(2.55, 2.75, 0.5, 0.5, top, top + 0.45, "A"); // viewfinder
      over(idisk(3, 3.55, (Z + top) / 2, 0.58, "fA3")); // lens ring
      over(idisk(3, 3.55, (Z + top) / 2, 0.4, "fA1")); // lens glass
      over(float(idisk(4.6, 1.7, top + 0.6, 0.18, "iso-dot"), 1)); // floating shutter dot
      return top + 0.45;
    }
    case "design": {
      // Offset stacked artboards / canvases - the "layers" of design work.
      putC(2.7, 3.35, 1.7, 1.15, Z, Z + 0.3, "N");
      putC(3.0, 3.0, 1.7, 1.15, Z + 0.3, Z + 0.62, "A");
      putC(3.3, 2.65, 1.7, 1.15, Z + 0.62, Z + 0.96, "N");
      over(float(ibox(4.5, 1.9, 0.55, 0.55, Z + 1.7, Z + 2.25, "A"), 3)); // floating swatch
      over(float(idisk(1.4, 3.9, Z + 1.9, 0.3, "fA1"), 4));
      return Z + 0.96;
    }
    case "ai": {
      // A 2x2 cluster of server/neural towers with connecting nodes.
      const hs = [rand(2.6, 3.2), rand(2.2, 2.7), rand(2.3, 2.8), rand(3.0, 3.6)];
      const cells: Array<[number, number]> = [[2.5, 2.5], [3.6, 2.5], [2.5, 3.6], [3.6, 3.6]];
      cells.forEach(([cx, cy], i) => putC(cx, cy, 0.6, 0.6, Z, Z + hs[i], i % 2 ? "N" : "A"));
      // node dots hovering above the towers
      cells.forEach(([cx, cy], i) => over(float(idisk(cx, cy, Z + hs[i] + 0.5, 0.16, "iso-dot"), i % 6)));
      return Z + Math.max(...hs);
    }
    case "shop": {
      // A cluster of parcels / product boxes.
      putC(2.7, 3.1, 1.1, 1.1, Z, Z + 1.0, "N");
      putC(3.6, 3.3, 0.85, 0.85, Z, Z + 0.8, "A");
      putC(3.0, 2.5, 0.75, 0.75, Z + 1.0, Z + 1.7, "A");
      over(float(ibox(4.6, 1.8, 0.5, 0.5, Z + 2.0, Z + 2.5, "A"), 2));
      return Z + 1.7;
    }
    case "book": {
      // A stack of books (offset thin slabs) with one standing on top.
      putC(3.0, 3.0, 1.9, 1.25, Z, Z + 0.3, "A");
      putC(2.9, 3.1, 1.85, 1.2, Z + 0.3, Z + 0.6, "N");
      putC(3.08, 2.93, 1.88, 1.22, Z + 0.6, Z + 0.92, "A");
      putC(3.0, 3.0, 1.1, 0.32, Z + 0.92, Z + 1.9, "N"); // a book standing on top
      over(float(idisk(4.5, 1.9, Z + 2.4, 0.26, "fA1"), 3));
      return Z + 1.9;
    }
    default: {
      // monument - a seeded tower (stepped / twin / ziggurat) + satellite pillars.
      const form = Math.floor(rng() * 3);
      let peak: number;
      if (form === 0) {
        peak = rand(6.4, 7.6);
        putC(3, 3, 2.6, 2.6, Z, 2.6, "A");
        putC(3, 3, 1.8, 1.8, 2.6, 3.9, "A");
        putC(3, 3, 1.0, 1.0, 3.9, peak, "A");
      } else if (form === 1) {
        const h1 = rand(4.6, 6.4);
        const h2 = rand(4.0, 5.8);
        putC(3, 3, 2.9, 2.9, Z, 2.2, "A");
        putC(2.3, 2.3, 1.0, 1.0, 2.2, h1, "A");
        putC(3.7, 3.7, 1.0, 1.0, 2.2, h2, "A");
        putC(3, 3, 2.3, 0.5, 3.2, 3.7, "A");
        peak = Math.max(h1, h2);
      } else {
        peak = rand(4.8, 5.8);
        putC(3, 3, 3.2, 3.2, Z, 2.4, "A");
        putC(3, 3, 2.4, 2.4, 2.4, 3.3, "A");
        putC(3, 3, 1.6, 1.6, 3.3, 4.1, "A");
        putC(3, 3, 0.8, 0.8, 4.1, peak, "A");
      }
      const accentPillar = Math.floor(rng() * 5);
      const pillar = (gx: number, gy: number, hi: number, slot: number) =>
        put(gx, gy, 0.9, 0.9, Z, Z + rand(1.4, hi), accentPillar === slot ? "A" : "N");
      pillar(0.55, 0.55, 3.6, 0);
      pillar(4.55, 0.55, 3.0, 1);
      pillar(0.55, 4.55, 3.0, 2);
      pillar(4.55, 4.55, 1.9, 3);
      // a halo ring above the tower
      const rc = ip(3, 3, peak + 1.1);
      const rr = Math.round(rand(58, 72));
      over(`<g class="float2"><ellipse class="iso-ring2" cx="${rc[0]}" cy="${rc[1]}" rx="${rr}" ry="${Math.round(rr / 2)}"/><ellipse class="iso-ring" cx="${rc[0]}" cy="${rc[1]}" rx="${rr}" ry="${Math.round(rr / 2)}"/></g>`);
      return peak;
    }
  }
}

// The fallback visual when a project/section has no uploaded image: an isometric
// scene generated FROM the section's text. Keywords pick WHAT it depicts (a
// phone for an app, a chart for finance, a camera for photography, ...), and the
// text hash varies the proportions, so every project gets its own scene and the
// same text always renders identically (preview == download).
function artPanel(seed: string, idx = 0): string {
  const rng = mulberry((seedFrom(seed || "portfolio") + idx * 0x9e3779b1) >>> 0);
  const rand = (lo: number, hi: number) => lo + rng() * (hi - lo);
  const motif = pickMotif(seed);

  // Grounded structures, collected then drawn back-to-front (painter's order).
  const ground: Array<{ k: number; z: number; s: string }> = [];
  const put = (gx: number, gy: number, fw: number, fd: number, z0: number, z1: number, kk: IsoKind) =>
    ground.push({ k: gx + fw / 2 + (gy + fd / 2), z: z0, s: ibox(gx, gy, fw, fd, z0, z1, kk) });
  const putC = (cx: number, cy: number, w: number, d: number, z0: number, z1: number, kk: IsoKind) =>
    put(cx - w / 2, cy - d / 2, w, d, z0, z1, kk);
  const overs: string[] = [];
  const over = (svg: string) => overs.push(svg);
  const float = (svg: string, n: number) => `<g class="float${((n % 6) + 6) % 6}">${svg}</g>`;

  // Tiered stone pedestal (two insetting slabs); the object sits on top at z=1.4.
  put(0, 0, 6, 6, 0, 0.7, "N");
  put(0.5, 0.5, 5, 5, 0.7, 1.4, "N");

  const peak = buildMotif(motif, { put, putC, over, float, rand, rng });
  ground.sort((p, q) => p.k - q.k || p.z - q.z);
  const structures = ground.map((g) => g.s).join("");

  // Faded site grid on the floor plane (the architectural halo around the base).
  let grid = "";
  for (let i = -1; i <= 7; i++) {
    const a = ip(i, -1, 0);
    const b = ip(i, 7, 0);
    const c = ip(-1, i, 0);
    const d = ip(7, i, 0);
    grid += `<line class="iso-grid" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/><line class="iso-grid" x1="${c[0]}" y1="${c[1]}" x2="${d[0]}" y2="${d[1]}"/>`;
  }

  // Drifting accent particles - count and placement seeded by the text.
  const nDots = 3 + Math.floor(rng() * 4);
  let parts = "";
  for (let i = 0; i < nDots; i++) {
    const x = Math.round(rand(250, 600));
    const y = Math.round(rand(110, 300));
    const r = Math.round(rand(2.4, 4.2) * 10) / 10;
    parts += `<g class="float${i % 6}"><circle class="iso-dot" cx="${x}" cy="${y}" r="${r}" opacity="${(0.25 + (i % 3) * 0.12).toFixed(2)}"/></g>`;
  }

  const gc = ip(3, 3, Math.min(peak, 3) * 0.7); // glow focus near the object body
  return `<svg class="art" viewBox="0 0 800 680" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <radialGradient id="isoFade" cx="50%" cy="46%" r="52%"><stop offset="0%" stop-color="#fff"/><stop offset="60%" stop-color="#fff" stop-opacity=".45"/><stop offset="100%" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <mask id="isoMask"><rect width="800" height="680" fill="url(#isoFade)"/></mask>
    <filter id="isoSoft" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="9"/></filter>
    <filter id="isoBloom" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="22"/></filter>
    <linearGradient id="isoReflG" gradientUnits="userSpaceOnUse" x1="0" y1="372" x2="0" y2="556"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient>
    <mask id="isoRefl"><rect x="0" y="372" width="800" height="200" fill="url(#isoReflG)"/></mask>
    ${ISO_BG}${ISO_GRADS}
  </defs>
  <rect class="isobg" style="fill:url(#isoBg)" width="800" height="680"/>
  <ellipse class="iso-glow" cx="${gc[0]}" cy="${gc[1]}" rx="180" ry="118" filter="url(#isoSoft)"/>
  <ellipse class="iso-bloom" cx="${gc[0]}" cy="${gc[1]}" rx="120" ry="92" filter="url(#isoBloom)"/>
  <g mask="url(#isoMask)">${grid}</g>
  <ellipse class="iso-shadow" cx="400" cy="372" rx="216" ry="50" filter="url(#isoSoft)"/>
  <ellipse class="iso-ao" cx="400" cy="364" rx="150" ry="36" filter="url(#isoSoft)"/>
  <g class="iso-refl" mask="url(#isoRefl)" transform="matrix(1 0 0 -1 0 744)">${structures}</g>
  ${structures}
  ${overs.join("")}
  ${parts}
</svg>`;
}

/** The isometric illustration on its own, for reuse in the builder UI. */
export function isometricArt(idx = 0): string {
  return artPanel("portfolio studio", idx);
}

// ============================================================================
//  Colorful hero illustration - a flat-color, bold-dark-outline, true-30deg
//  isometric scene (Dribbble / Adobe style), built entirely as inline SVG and
//  CHOSEN FROM THE CV: the most visually rich project decides the scene, with a
//  field fallback. No external assets, works offline.
// ============================================================================

const ISO_C = 0.8660254; // cos 30deg
const ISO_S = 0.5; // sin 30deg
const OUT = "#241a38"; // the bold dark outline used on every shape

function _hx(h: string): [number, number, number] {
  const s = h.replace("#", "");
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
}
function _cl(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}
function _toHex(a: number[]): string {
  return "#" + a.map((c) => _cl(c).toString(16).padStart(2, "0")).join("");
}
function _shift(rgb: number[], amt: number): number[] {
  return rgb.map((c) => (amt >= 0 ? _cl(c + (255 - c) * amt) : _cl(c * (1 + amt))));
}
// A flat material from one base color: lighter top, base right, darker left.
function mat(base: string): { top: string; left: string; right: string } {
  const r = _hx(base);
  return { top: _toHex(_shift(r, 0.17)), left: _toHex(_shift(r, -0.16)), right: base };
}

// The drawing toolkit, bound to a scene origin (ox,oy) and unit size u.
function isoTools(ox: number, oy: number, u: number) {
  const r = (n: number) => Math.round(n * 10) / 10;
  const pt = (x: number, y: number, z: number): [number, number] => [
    r(ox + (x - y) * ISO_C * u),
    r(oy + (x + y) * ISO_S * u - z * u),
  ];
  const poly = (arr: Array<[number, number]>, fill: string, sw = 2.4) =>
    `<polygon points="${arr.map((p) => p[0] + "," + p[1]).join(" ")}" fill="${fill}" stroke="${OUT}" stroke-width="${sw}" stroke-linejoin="round"/>`;
  // A cuboid at (x,y,z) of size (w,d,h). Shows top + the two front faces.
  const box = (x: number, y: number, z: number, w: number, d: number, h: number, base: string, sw = 2.4) => {
    const c = mat(base);
    const top: Array<[number, number]> = [pt(x, y, z + h), pt(x + w, y, z + h), pt(x + w, y + d, z + h), pt(x, y + d, z + h)];
    const fx: Array<[number, number]> = [pt(x + w, y, z), pt(x + w, y + d, z), pt(x + w, y + d, z + h), pt(x + w, y, z + h)];
    const fy: Array<[number, number]> = [pt(x, y + d, z), pt(x + w, y + d, z), pt(x + w, y + d, z + h), pt(x, y + d, z + h)];
    return poly(fy, c.left, sw) + poly(fx, c.right, sw) + poly(top, c.top, sw);
  };
  // A flat panel on the +y face (spanning x and z) - screens, posters, labels.
  const faceY = (x: number, y: number, z: number, w: number, h: number, fill: string, sw = 2) =>
    poly([pt(x, y, z), pt(x + w, y, z), pt(x + w, y, z + h), pt(x, y, z + h)], fill, sw);
  // A flat panel on the +x face (spanning y and z).
  const faceX = (x: number, y: number, z: number, d: number, h: number, fill: string, sw = 2) =>
    poly([pt(x, y, z), pt(x, y + d, z), pt(x, y + d, z + h), pt(x, y, z + h)], fill, sw);
  // A flat tile on the top plane at height z (spanning x and y) - rugs, keys, pages.
  const tile = (x: number, y: number, z: number, w: number, d: number, fill: string, sw = 2) =>
    poly([pt(x, y, z), pt(x + w, y, z), pt(x + w, y + d, z), pt(x, y + d, z)], fill, sw);
  const ell = (cx: number, cy: number, rx: number, ry: number, fill: string, sw = 2.4) =>
    `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${OUT}" stroke-width="${sw}"/>`;
  // A flat disc (coin top) on the ground plane at height z.
  const disc = (x: number, y: number, z: number, rr: number, base: string) => {
    const [cx, cy] = pt(x, y, z);
    return ell(cx, cy, rr * u * 0.92, rr * u * 0.5, mat(base).top);
  };
  // A short cylinder (coins, bottles, cups, pots).
  const cyl = (x: number, y: number, z: number, rr: number, h: number, base: string) => {
    const c = mat(base);
    const [cx, cyT] = pt(x, y, z + h);
    const [, cyB] = pt(x, y, z);
    const rx = rr * u * 0.92;
    const ry = rr * u * 0.5;
    const body = `<path d="M ${cx - rx} ${cyT} L ${cx - rx} ${cyB} A ${rx} ${ry} 0 0 0 ${cx + rx} ${cyB} L ${cx + rx} ${cyT} Z" fill="${c.right}" stroke="${OUT}" stroke-width="2.4" stroke-linejoin="round"/>`;
    return body + ell(cx, cyT, rx, ry, c.top);
  };
  // A sphere with a soft highlight (plant leaves, balls, dots).
  const ball = (x: number, y: number, z: number, rr: number, base: string) => {
    const c = mat(base);
    const [cx, cy] = pt(x, y, z);
    const R = rr * u;
    return `<circle cx="${cx}" cy="${cy}" r="${R}" fill="${c.left}" stroke="${OUT}" stroke-width="2.4"/><ellipse cx="${cx - R * 0.3}" cy="${cy - R * 0.32}" rx="${R * 0.34}" ry="${R * 0.27}" fill="${c.top}" opacity=".85"/>`;
  };
  return { pt, poly, box, faceY, faceX, tile, ell, disc, cyl, ball, u };
}
type IsoTools = ReturnType<typeof isoTools>;

// A heart glyph in absolute screen coords (floating accents, medical, social).
function heartPath(cx: number, cy: number, s: number, fill: string): string {
  return `<path d="M ${cx} ${cy + s * 0.32} C ${cx} ${cy}, ${cx - s} ${cy - s * 0.12}, ${cx - s} ${cy - s * 0.55} C ${cx - s} ${cy - s}, ${cx - s * 0.42} ${cy - s * 1.04}, ${cx} ${cy - s * 0.58} C ${cx + s * 0.42} ${cy - s * 1.04}, ${cx + s} ${cy - s}, ${cx + s} ${cy - s * 0.55} C ${cx + s} ${cy - s * 0.12}, ${cx} ${cy}, ${cx} ${cy + s * 0.32} Z" fill="${fill}" stroke="${OUT}" stroke-width="2.4" stroke-linejoin="round"/>`;
}

// ---- the scenes. Each draws 5-7 props back-to-front; the shared stage adds the
// platform, grid, plant, mug and floating accents, so every scene has 10+ parts.
const SCENES: Record<string, (g: IsoTools, B: number) => string> = {
  workspace: (g, B) => {
    let s = "";
    // monitor (back-left) with a code screen
    s += g.box(0.7, 1.0, B, 1.5, 0.2, 1.2, "#33324f");
    s += g.faceY(0.82, 1.0, B + 0.14, 1.26, 0.9, "#3a3960");
    s += g.faceY(0.95, 1.0, B + 0.28, 0.7, 0.09, "#ffd166") + g.faceY(0.95, 1.0, B + 0.45, 1.0, 0.09, "#5bc0ff") + g.faceY(0.95, 1.0, B + 0.62, 0.55, 0.09, "#36d39a");
    s += g.box(1.35, 1.5, B, 0.2, 0.2, 0.28, "#2a2942");
    // server rack (back-right)
    s += g.box(4.7, 1.0, B, 1.1, 1.2, 2.2, "#5b6cf0");
    for (let i = 0; i < 4; i++) s += g.faceY(4.8, 1.0, B + 0.25 + i * 0.46, 0.9, 0.16, "#cdd6ff");
    s += g.ell(...mid(g, 5.72, 1.0, B + 0.33), 4, 4, "#36d39a") + g.ell(...mid(g, 5.72, 1.0, B + 0.79), 4, 4, "#ffd166");
    // laptop (centre) - screen behind, keyboard in front
    s += g.box(2.4, 3.5, B, 1.9, 0.16, 1.05, "#2d2c46");
    s += g.faceY(2.52, 3.5, B + 0.12, 1.66, 0.82, "#1f9d6b");
    s += g.faceY(2.66, 3.5, B + 0.24, 0.9, 0.08, "#aef0d4") + g.faceY(2.66, 3.5, B + 0.4, 1.2, 0.08, "#7fe0bd") + g.faceY(2.66, 3.5, B + 0.56, 0.7, 0.08, "#aef0d4");
    s += g.box(2.4, 3.66, B, 1.9, 1.25, 0.14, "#cdd2ec");
    s += g.tile(2.55, 3.85, B + 0.14, 1.6, 0.9, "#aab2d6", 1.2);
    // mouse + stacked books (front-left)
    s += g.box(4.55, 4.0, B, 0.45, 0.62, 0.12, "#cdd2ec");
    s += g.box(0.7, 4.5, B, 1.4, 0.95, 0.18, "#ff6b6b") + g.box(0.78, 4.55, B + 0.18, 1.3, 0.88, 0.16, "#ffb02e") + g.box(0.72, 4.5, B + 0.34, 1.38, 0.94, 0.16, "#22c3a6");
    // floating neural nodes
    s += floatNodes(g);
    return s;
  },
  ai: (g, B) => SCENES.workspace(g, B),
  finance: (g, B) => {
    let s = "";
    // bank building (back-centre) with pediment + columns
    s += g.box(2.2, 1.0, B, 2.6, 1.5, 1.5, "#4aa3ff");
    s += g.box(2.05, 0.85, B + 1.5, 2.9, 1.8, 0.32, "#2f8be6");
    for (let i = 0; i < 4; i++) s += g.box(2.5 + i * 0.62, 2.4, B, 0.2, 0.2, 1.35, "#eaf2ff");
    s += g.faceY(2.45, 2.5, B + 0.55, 1.9, 0.5, "#2f8be6");
    // coin stacks (front-left)
    for (let i = 0; i < 5; i++) s += g.cyl(1.0, 4.5, B + i * 0.17, 0.52, 0.17, "#ffce4a");
    for (let i = 0; i < 3; i++) s += g.cyl(1.9, 4.9, B + i * 0.17, 0.52, 0.17, "#ffb02e");
    // calculator (front-right)
    s += g.box(4.4, 4.1, B, 1.2, 1.4, 0.22, "#3ec46d");
    s += g.tile(4.52, 4.22, B + 0.22, 0.96, 0.4, "#eafff2");
    for (let rrow = 0; rrow < 3; rrow++) for (let cc = 0; cc < 3; cc++) s += g.tile(4.55 + cc * 0.3, 4.7 + rrow * 0.22, B + 0.22, 0.18, 0.13, "#1f9d6b", 1.2);
    // a chart screen (mid)
    s += g.box(3.5, 2.9, B, 1.2, 0.16, 0.95, "#22c3a6");
    s += g.faceY(3.6, 2.9, B + 0.12, 0.16, 0.3, "#fff3c4") + g.faceY(3.85, 2.9, B + 0.12, 0.16, 0.55, "#ffd166") + g.faceY(4.1, 2.9, B + 0.12, 0.16, 0.75, "#ff8f5b");
    // floating coins + card
    s += `<g class="float1">${g.cyl(2.6, -0.4, B + 3.2, 0.5, 0.16, "#ffce4a")}</g><g class="float3">${g.box(5.4, 0.4, B + 2.6, 0.9, 0.6, 0.1, "#ff7eb6")}</g>`;
    return s;
  },
  medical: (g, B) => {
    let s = "";
    // big red cross sign (back-left)
    s += g.box(0.7, 1.2, B, 1.1, 1.1, 1.3, "#ff5d6c");
    s += crossOnFace(g, 0.78, 1.2, B + 0.35, 0.95);
    // heart monitor (back-right)
    s += g.box(4.7, 1.2, B, 1.1, 0.95, 1.5, "#2d2c46");
    s += g.faceY(4.82, 1.2, B + 0.5, 0.86, 0.7, "#0f3b33");
    s += `<polyline points="${beat(g, 4.84, 1.2, B + 0.85, 0.82)}" fill="none" stroke="#36d39a" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>`;
    s += g.box(5.05, 1.55, B, 0.2, 0.2, 0.5, "#cdd2ec");
    // hospital bed (centre)
    s += g.box(2.0, 3.2, B, 0.22, 1.6, 0.95, "#eef3ff"); // headboard
    s += g.box(2.2, 3.2, B, 2.5, 1.6, 0.5, "#dfe7ff"); // mattress base
    s += g.box(2.25, 3.25, B + 0.5, 1.0, 1.5, 0.22, "#bcd0ff"); // pillow/sheet
    s += g.box(2.2, 3.2, B + 0.5, 2.5, 0.12, 0.16, "#9fb8ee"); // blanket edge
    // medicine bottles (front-left) + pills
    s += g.cyl(1.2, 4.9, B, 0.4, 0.7, "#ff7eb6") + g.cyl(1.2, 4.9, B + 0.7, 0.32, 0.16, "#ffffff");
    s += g.cyl(1.85, 5.15, B, 0.36, 0.55, "#5bc0ff") + g.ball(1.85, 5.15, B + 0.72, 0.16, "#ffd166");
    // floating heart + plus
    s += `<g class="float1">${heartPath(...mid(g, 3.3, 0.3, B + 3.4), 16, "#ff5d6c")}</g>`;
    return s;
  },
  design: (g, B) => {
    let s = "";
    // monitor with colorful artwork (centre-back)
    s += g.box(1.8, 1.2, B, 2.4, 0.2, 1.5, "#2d2c46");
    s += g.faceY(1.95, 1.2, B + 0.16, 2.1, 1.16, "#fff6ef");
    s += g.faceY(2.1, 1.2, B + 0.35, 0.6, 0.6, "#ff6b6b") + g.faceY(2.85, 1.2, B + 0.3, 0.5, 0.8, "#ffd166") + g.faceY(3.45, 1.2, B + 0.4, 0.55, 0.45, "#5bc0ff");
    s += g.box(2.9, 1.7, B, 0.22, 0.22, 0.3, "#23223a");
    // drawing tablet + pen (front-centre)
    s += g.box(2.3, 3.7, B, 2.1, 1.4, 0.16, "#3a3960");
    s += g.tile(2.45, 3.85, B + 0.16, 1.5, 1.1, "#5b6cf0");
    s += g.box(4.1, 4.0, B + 0.18, 0.12, 0.7, 0.1, "#ff7eb6");
    // color palette swatches (front-left)
    const sw = ["#ff6b6b", "#ffb02e", "#ffd166", "#22c3a6", "#5b6cf0"];
    s += g.box(0.7, 4.4, B, 1.5, 1.0, 0.14, "#e9e7f5");
    sw.forEach((cc, i) => (s += g.ball(0.95 + i * 0.28, 4.6 + i * 0.12, B + 0.3, 0.16, cc)));
    // ruler-ish stand (right)
    s += g.box(4.7, 2.9, B, 0.9, 0.7, 0.6, "#ff7eb6");
    // floating shapes
    s += `<g class="float1">${g.ball(5.2, 0.2, B + 3.2, 0.32, "#ffd166")}</g><g class="float3">${g.box(1.0, 0.2, B + 2.7, 0.7, 0.7, 0.7, "#22c3a6")}</g>`;
    return s;
  },
  ecommerce: (g, B) => {
    let s = "";
    // shop front (back) with striped awning
    s += g.box(1.8, 1.0, B, 2.8, 1.4, 1.6, "#ffd166");
    s += g.faceY(2.0, 1.0, B + 0.1, 0.8, 1.0, "#5bc0ff"); // door
    s += g.faceY(3.2, 1.0, B + 0.55, 1.0, 0.6, "#eafaff"); // window
    const aw = ["#ff6b6b", "#fff6ef"];
    for (let i = 0; i < 6; i++) s += g.faceY(1.8 + i * 0.47, 1.0, B + 1.18, 0.47, 0.34, aw[i % 2]);
    // delivery boxes (front-left) with tape
    s += g.box(0.8, 4.3, B, 1.3, 1.3, 1.0, "#d99a55") + g.tile(0.85, 4.35, B + 1.0, 1.2, 1.2, "#c9863f") + g.tile(1.35, 4.3, B + 1.0, 0.22, 1.3, "#f0d9b5");
    s += g.box(1.5, 5.1, B, 0.95, 0.95, 0.8, "#e3a866") + g.tile(1.55, 5.15, B + 0.8, 0.85, 0.85, "#cf9450");
    // a tablet showing a product grid (right)
    s += g.box(4.4, 3.9, B, 1.2, 1.5, 0.16, "#2d2c46");
    for (let rrow = 0; rrow < 2; rrow++) for (let cc = 0; cc < 2; cc++) s += g.tile(4.55 + cc * 0.45, 4.05 + rrow * 0.6, B + 0.16, 0.34, 0.42, ["#ff6b6b", "#5bc0ff", "#22c3a6", "#ffb02e"][rrow * 2 + cc]);
    // floating price tag + cart bubble
    s += `<g class="float1">${g.box(5.0, 0.3, B + 2.7, 0.9, 0.6, 0.1, "#22c3a6")}</g><g class="float3">${g.ball(2.4, -0.2, B + 3.2, 0.34, "#ff7eb6")}</g>`;
    return s;
  },
  education: (g, B) => {
    let s = "";
    // chalkboard (back)
    s += g.box(1.6, 1.0, B, 3.0, 0.2, 1.6, "#2f5d4a");
    s += g.faceY(1.75, 1.0, B + 0.15, 2.7, 1.3, "#2a5443");
    s += g.faceY(1.95, 1.0, B + 0.55, 0.7, 0.07, "#eafaf0") + g.faceY(1.95, 1.0, B + 0.8, 1.1, 0.07, "#cfeede") + g.faceY(2.9, 1.0, B + 0.95, 0.6, 0.07, "#eafaf0");
    // open book (centre)
    s += g.box(2.2, 3.6, B, 2.2, 1.4, 0.2, "#ff8f5b");
    s += g.tile(2.3, 3.7, B + 0.2, 1.0, 1.2, "#fff6ef") + g.tile(3.32, 3.7, B + 0.2, 1.0, 1.2, "#ffeede");
    s += g.box(3.28, 3.6, B + 0.2, 0.06, 1.4, 0.32, "#e0763f");
    // stacked books (front-left)
    s += g.box(0.7, 4.5, B, 1.4, 0.95, 0.2, "#5b6cf0") + g.box(0.78, 4.55, B + 0.2, 1.3, 0.88, 0.18, "#22c3a6") + g.box(0.72, 4.5, B + 0.38, 1.36, 0.92, 0.18, "#ff6b6b");
    // apple (front-right) + pencil
    s += g.ball(4.9, 4.4, B + 0.32, 0.34, "#ff5d6c");
    s += g.box(4.3, 5.0, B, 1.0, 0.12, 0.1, "#ffd166");
    // floating graduation cap
    s += `<g class="float1">${gradCap(g, 3.2, 0.2, B + 3.2)}</g>`;
    return s;
  },
  social: (g, B) => {
    let s = "";
    // big phone (centre) with a feed
    s += g.box(2.5, 2.6, B, 1.7, 0.22, 2.8, "#2d2c46");
    s += g.faceY(2.62, 2.6, B + 0.18, 1.46, 2.46, "#f4f6ff");
    s += g.faceY(2.74, 2.6, B + 1.9, 1.2, 0.5, "#5b6cf0"); // header card
    s += g.faceY(2.74, 2.6, B + 1.2, 1.2, 0.55, "#ffd8e6") + g.faceY(2.74, 2.6, B + 0.45, 1.2, 0.55, "#d6f0ff"); // posts
    s += heartFace(g, 3.7, 2.6, B + 0.7);
    // like / chat bubbles (front)
    s += g.box(0.9, 4.4, B, 1.2, 0.9, 0.7, "#ff6b6b") + g.box(4.4, 4.3, B, 1.2, 0.9, 0.7, "#22c3a6");
    s += g.cyl(1.5, 5.4, B, 0.3, 0.2, "#ffd166");
    // floating hearts + notification dot
    s += `<g class="float1">${heartPath(...mid(g, 1.8, 0.4, B + 3.0), 15, "#ff5d6c")}</g><g class="float3">${heartPath(...mid(g, 4.6, 0.0, B + 3.4), 12, "#ff7eb6")}</g><g class="float2">${g.ball(5.3, 1.6, B + 2.4, 0.3, "#ffb02e")}</g>`;
    return s;
  },
};

// helpers used by scenes -------------------------------------------------------
function mid(g: IsoTools, x: number, y: number, z: number): [number, number] {
  return g.pt(x, y, z);
}
function floatNodes(g: IsoTools): string {
  // a small neural network floating above the desk
  const a = g.pt(1.4, 0.2, 3.6), b = g.pt(3.0, -0.3, 4.0), c = g.pt(4.6, 0.1, 3.5), d = g.pt(2.2, -0.1, 2.9), e = g.pt(3.8, 0.4, 2.8);
  const line = (p: number[], q: number[]) => `<line x1="${p[0]}" y1="${p[1]}" x2="${q[0]}" y2="${q[1]}" stroke="${OUT}" stroke-width="1.6" opacity=".5"/>`;
  const node = (p: number[], col: string) => `<circle cx="${p[0]}" cy="${p[1]}" r="7" fill="${col}" stroke="${OUT}" stroke-width="2.4"/>`;
  return `<g class="float1">${line(a, d) + line(a, e) + line(b, d) + line(b, e) + line(c, e) + line(d, e)}${node(a, "#ff6b6b") + node(b, "#ffd166") + node(c, "#5bc0ff") + node(d, "#22c3a6") + node(e, "#ff7eb6")}</g>`;
}
function crossOnFace(g: IsoTools, x: number, y: number, z: number, sz: number): string {
  // a white plus on the +y face of a box
  return g.faceY(x + sz * 0.33, y, z + sz * 0.0, sz * 0.34, sz, "#ffffff", 1.6) + g.faceY(x, y, z + sz * 0.33, sz, sz * 0.34, "#ffffff", 1.6);
}
function beat(g: IsoTools, x: number, y: number, z: number, w: number): string {
  // a heartbeat polyline across a screen face
  const xs = [0, 0.2, 0.32, 0.42, 0.55, 0.7, 1].map((t) => x + t * w);
  const zs = [0, 0, 0.18, -0.22, 0.3, 0, 0].map((t) => z + t);
  return xs.map((xx, i) => g.pt(xx, y, zs[i]).join(",")).join(" ");
}
function gradCap(g: IsoTools, x: number, y: number, z: number): string {
  const c = g.pt(x, y, z);
  return `<g><polygon points="${[g.pt(x - 0.7, y - 0.7, z), g.pt(x + 0.7, y - 0.7, z), g.pt(x + 0.7, y + 0.7, z), g.pt(x - 0.7, y + 0.7, z)].map((p) => p.join(",")).join(" ")}" fill="#2d2c46" stroke="${OUT}" stroke-width="2.4" stroke-linejoin="round"/><circle cx="${c[0]}" cy="${c[1]}" r="5" fill="#ffd166" stroke="${OUT}" stroke-width="2"/><line x1="${c[0]}" y1="${c[1]}" x2="${c[0] + 22}" y2="${c[1] + 6}" stroke="${OUT}" stroke-width="2.4"/><circle cx="${c[0] + 22}" cy="${c[1] + 10}" r="4" fill="#ffb02e" stroke="${OUT}" stroke-width="2"/></g>`;
}
function heartFace(g: IsoTools, x: number, y: number, z: number): string {
  const c = g.pt(x, y, z);
  return heartPath(c[0], c[1], 13, "#ff5d6c");
}

// Decide the scene from the CV: scan projects first (richest wins), then field.
const SCENE_KEYS: Array<[string, string[]]> = [
  ["medical", ["health", "medical", "vital", "clinic", "hospital", "patient", "fitness", " care ", "heart", "therapy", "diagnos", "wellness", "pharma", "doctor"]],
  ["ecommerce", ["shop", "store", "ecommerce", "e-commerce", "commerce", "retail", "marketplace", " cart ", "checkout", "delivery", "product catalog", "inventory"]],
  ["education", ["education", "course", "learn", "school", "student", "exam", "quiz", "tutor", "study", "classroom", "academic", "lecture", "teaching"]],
  ["social", ["social", "chat", "feed", " post ", "messaging", "community", "network", "follow", "media app", "forum"]],
  ["finance", ["finance", "fintech", "expense", "budget", "bank", "money", "payment", "invest", "accounting", "sales", "revenue", "wallet", "trading", "invoice"]],
  ["design", ["design", "brand", "logo", " ui ", " ux ", " art ", "creative", "graphic", "illustrat", "figma", "portfolio", "typograph"]],
  ["ai", [" ai ", " ml ", "machine learning", "neural", " model ", "data", "vision", " nlp ", "deep learning", "algorithm", "predict", "intelligence"]],
];
function matchKeys(text: string, table: Array<[string, string[]]>): string | null {
  const t = " " + text.toLowerCase().replace(/[^a-z0-9]+/g, " ") + " ";
  for (const [id, keys] of table) {
    for (const k of keys) {
      if (t.includes(k.includes(" ") ? k : " " + k + " ") || t.includes(k)) return id;
    }
  }
  return null;
}
// Scene from a single piece of text (a project) - WHAT that project is about.
function sceneFromText(text: string): string {
  return matchKeys(text, SCENE_KEYS) || "workspace";
}
// Scene from the whole CV's projects (the richest matching one).
function sceneFromProjects(d: PortfolioData): string | null {
  const t = (d.projects || []).map((p) => `${p.title} ${p.discipline} ${p.summary} ${p.outcome}`).join("  ");
  return matchKeys(t, SCENE_KEYS);
}
// The person's FIELD, read from their role/tagline first (an "AI / CS" person is
// a workspace, NOT a hospital, even if one project is medical). Role-oriented so
// noisy project keywords in skills do not hijack the field.
const FIELD_KEYS: Array<[string, string[]]> = [
  ["design", ["graphic design", "designer", "ux design", "ui design", " ux ", " ui ", "art director", "illustrator", "creative director", "visual design", "brand design", "motion design"]],
  ["medical", ["doctor", "nurse", "physician", "medical", "clinic", "dentist", "pharmac", "surgeon", "healthcare", "health care", "radiolog", "cardiolog"]],
  ["finance", ["finance", "financial", "accountant", "accounting", "analyst", "banker", "investment", "trader", "economist", "actuary", "auditor"]],
  ["social", ["social media", "marketer", "marketing", "content creator", "community manager", "influencer", "copywriter"]],
  ["ecommerce", ["ecommerce", "e-commerce", "retailer", "merchant", "shopify", "dropship", "store owner"]],
  ["education", ["teacher", "professor", "educator", "lecturer", "instructor", "tutor", "trainer"]],
  ["workspace", ["ai ", "artificial intelligence", " ml ", "machine learning", "data scien", "computer science", " cs ", " it ", "software", "developer", "engineer", "programmer", "full stack", "full-stack", "backend", "front end", "frontend", "web dev", "devops", "coder", "robotics"]],
];
function sceneFromField(d: PortfolioData): string {
  const role = `${d.role} ${d.tagline}`;
  const m = matchKeys(role, FIELD_KEYS);
  if (m) return m;
  const sk = matchKeys((d.skills || []).join(" "), SCENE_KEYS);
  return sk || "workspace";
}

/** The colorful, content-aware isometric illustration for a chosen scene. */
function colorScene(scene: string): string {
  if (!SCENES[scene]) scene = "workspace";
  const u = 40, ox = 320, oy = 312, B = 0.55;
  const g = isoTools(ox, oy, u);
  // platform
  let stage = g.box(0.4, 0.4, 0, 6.6, 6.6, B, "#6c5ce7");
  // top grid
  for (let i = 1; i < 7; i++) {
    const a = g.pt(0.4 + i, 0.4, B), b = g.pt(0.4 + i, 7.0, B), c = g.pt(0.4, 0.4 + i, B), e = g.pt(7.0, 0.4 + i, B);
    stage += `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="#5a49d6" stroke-width="1.4"/><line x1="${c[0]}" y1="${c[1]}" x2="${e[0]}" y2="${e[1]}" stroke="#5a49d6" stroke-width="1.4"/>`;
  }
  // plant (front-left) and mug (front-right) - on every scene for life
  const plant = g.cyl(0.7, 5.6, B, 0.42, 0.5, "#ef7d54") + g.ball(0.7, 5.6, B + 0.7, 0.32, "#3ec46d") + g.ball(0.4, 5.4, B + 0.6, 0.24, "#34b35f") + g.ball(1.0, 5.45, B + 0.62, 0.24, "#46d06f");
  const mug = g.cyl(6.0, 5.2, B, 0.34, 0.42, "#ff7eb6") + g.ell(...g.pt(6.0, 5.2, B + 0.42), 0.34 * u * 0.6, 0.34 * u * 0.32, "#6b4a32");
  const sceneSvg = SCENES[scene](g, B);
  return `<svg class="art hero-illus" viewBox="0 0 640 720" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Isometric illustration">
  <defs><filter id="hsoft" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="14"/></filter></defs>
  <circle cx="150" cy="150" r="120" fill="#fff3d6" opacity=".7"/>
  <circle cx="520" cy="120" r="90" fill="#ffe0ec" opacity=".7"/>
  <ellipse cx="320" cy="540" rx="250" ry="70" fill="#3a2d72" opacity=".18" filter="url(#hsoft)"/>
  ${stage}
  ${sceneSvg}
  ${plant}
  ${mug}
</svg>`;
}

// ---- the stylesheet (inlined) ----------------------------------------------

const STYLES = `
:root,[data-theme="cinematic"]{--bg:#0b0b0c;--bg-elev:#141416;--surface:#161619;--fg:#ece9e1;--fg-muted:#9a988f;--fg-faint:#6a6862;--accent:#c2a878;--accent-fg:#0b0b0c;--accent-edge:#7d6738;--border:rgba(236,233,225,.10);--hairline:rgba(236,233,225,.07);--btn-shadow:rgba(0,0,0,.55);--il-bg:#f1ece1;--il-filter:hue-rotate(-10deg) saturate(.96);color-scheme:dark}
[data-theme="editorial"]{--bg:#f3f0e9;--bg-elev:#ece8df;--surface:#fbf9f4;--fg:#1a1916;--fg-muted:#57544c;--fg-faint:#8b877c;--accent:#9e4a2e;--accent-fg:#fbf9f4;--accent-edge:#6f3320;--border:rgba(26,25,22,.12);--hairline:rgba(26,25,22,.08);--btn-shadow:rgba(26,25,22,.22);--il-bg:#f1e9da;--il-filter:hue-rotate(-20deg) saturate(1.04);color-scheme:light}
[data-theme="mono"]{--bg:#fafaf8;--bg-elev:#f1f1ef;--surface:#fff;--fg:#111;--fg-muted:#5a5a58;--fg-faint:#8a8a88;--accent:#111;--accent-fg:#fafaf8;--accent-edge:#000;--border:rgba(17,17,17,.14);--hairline:rgba(17,17,17,.08);--btn-shadow:rgba(17,17,17,.28);--il-bg:#ededeb;--il-filter:saturate(.1) contrast(1.03);color-scheme:light}
[data-theme="royal"]{--bg:#0f0c1d;--bg-elev:#171331;--surface:#1b1636;--fg:#ece8f6;--fg-muted:#a7a0c0;--fg-faint:#6f6892;--accent:#c9a24b;--accent-fg:#0f0c1d;--accent-edge:#8a6e2e;--border:rgba(236,232,246,.10);--hairline:rgba(236,232,246,.07);--btn-shadow:rgba(0,0,0,.6);--il-bg:#ece7fa;--il-filter:hue-rotate(22deg) saturate(1.05);color-scheme:dark}
[data-theme="pastel"]{--bg:#f7f2f6;--bg-elev:#efe7ee;--surface:#fffafd;--fg:#2c2733;--fg-muted:#6b6475;--fg-faint:#9b94a5;--accent:#b5687f;--accent-fg:#fffafd;--accent-edge:#8a4860;--border:rgba(44,39,51,.12);--hairline:rgba(44,39,51,.08);--btn-shadow:rgba(44,39,51,.18);--il-bg:#fbeef5;--il-filter:hue-rotate(-30deg) saturate(.92);color-scheme:light}

*{box-sizing:border-box;border-color:var(--border)}
html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--fg);font-family:"Inter Tight",system-ui,-apple-system,"Segoe UI",sans-serif;line-height:1.6;transition:background-color .5s cubic-bezier(.16,1,.3,1),color .5s cubic-bezier(.16,1,.3,1);-webkit-font-smoothing:antialiased}
h1,h2,h3{font-family:"Bricolage Grotesque","Segoe UI",system-ui,sans-serif;font-weight:600;letter-spacing:-.02em;margin:0}
p{margin:0}
a{color:inherit}
::selection{background:var(--accent);color:var(--accent-fg)}
:focus-visible{outline:2px solid var(--accent);outline-offset:3px;border-radius:3px}

.shell{width:100%;max-width:1240px;margin-inline:auto;padding-inline:1.25rem}
@media(min-width:768px){.shell{padding-inline:2.5rem}}
.mono{font-family:"JetBrains Mono",ui-monospace,monospace}
.kicker{font-family:"JetBrains Mono",ui-monospace,monospace;font-size:.7rem;letter-spacing:.22em;text-transform:uppercase;color:var(--fg-muted)}

/* ---- tactile pressable buttons (colorblind-safe: shape + edge + shadow) ---- */
.btn{position:relative;display:inline-flex;align-items:center;justify-content:center;gap:.5rem;border-radius:999px;padding:.95rem 1.6rem;min-height:3rem;font-family:inherit;font-size:1rem;font-weight:600;letter-spacing:-.01em;line-height:1;text-decoration:none;cursor:pointer;user-select:none;transition:transform .12s cubic-bezier(.16,1,.3,1),box-shadow .12s cubic-bezier(.16,1,.3,1),background-color .2s,color .2s}
.btn:active{transform:translateY(3px)}
.btn-primary{background:var(--accent);color:var(--accent-fg);border:1px solid var(--accent-edge);box-shadow:0 4px 0 0 var(--accent-edge),0 12px 24px -8px var(--btn-shadow)}
.btn-primary:hover{transform:translateY(-1px);box-shadow:0 5px 0 0 var(--accent-edge),0 16px 30px -8px var(--btn-shadow)}
.btn-primary:active{box-shadow:0 1px 0 0 var(--accent-edge),0 6px 14px -8px var(--btn-shadow)}
.btn-ghost{background:var(--surface);color:var(--fg);border:1.5px solid color-mix(in srgb,var(--fg) 55%,transparent);box-shadow:0 4px 0 0 var(--border),0 10px 20px -10px var(--btn-shadow)}
.btn-ghost:hover{transform:translateY(-1px);background:var(--bg-elev);box-shadow:0 5px 0 0 var(--border),0 14px 26px -10px var(--btn-shadow)}
.btn-ghost:active{box-shadow:0 1px 0 0 var(--border),0 6px 12px -10px var(--btn-shadow)}
.btn svg{width:1.05em;height:1.05em}

/* ---- nav ---- */
.nav{position:fixed;inset-inline:0;top:0;z-index:50}
.nav-inner{margin-top:.75rem;display:flex;align-items:center;justify-content:space-between;gap:1rem;height:3.5rem;padding:0 .85rem 0 1.1rem;border:1px solid var(--border);border-radius:999px;background:color-mix(in srgb,var(--bg) 60%,transparent);backdrop-filter:blur(16px)}
.brand{font-family:"Bricolage Grotesque",system-ui,sans-serif;font-weight:600;font-size:1.05rem;letter-spacing:-.02em;text-decoration:none;color:var(--fg)}
.brand span{color:var(--accent)}
.nav-links{display:none;gap:1.6rem}
.nav-links a{font-size:.92rem;color:var(--fg-muted);text-decoration:none;transition:color .2s}
.nav-links a:hover{color:var(--fg)}
@media(min-width:820px){.nav-links{display:flex}}
.themes{display:flex;gap:.35rem;align-items:center}
.swatch{width:1.5rem;height:1.5rem;border-radius:999px;border:1px solid var(--border);cursor:pointer;padding:0;position:relative;transition:transform .15s}
.swatch:hover{transform:scale(1.12)}
.swatch[aria-pressed="true"]{outline:2px solid var(--accent);outline-offset:2px}

/* ---- sections ---- */
section{padding-block:clamp(4.5rem,11vw,9rem)}
.sec-head{font-size:clamp(2rem,5.5vw,3.6rem);line-height:1.04;max-width:18ch}
.lead{color:var(--fg-muted);max-width:42ch;font-size:1.05rem}
.rule{border:0;border-top:1px solid var(--border);margin:0}

/* hero */
.hero{min-height:100svh;display:flex;align-items:center;padding-top:7rem}
.hero-grid{display:grid;grid-template-columns:1fr;gap:2.5rem;align-items:center;width:100%}
@media(min-width:920px){.hero-grid{grid-template-columns:1.15fr .85fr;gap:3rem}}
.hero h1{font-size:clamp(2.8rem,8.5vw,6.2rem);line-height:.98}
.hero-sub{margin-top:1.5rem;max-width:40ch;font-size:clamp(1.05rem,2.2vw,1.3rem);color:var(--fg-muted)}
.cta-row{margin-top:2.2rem;display:flex;flex-wrap:wrap;gap:.75rem}
.hero-loc{margin-top:.9rem;font-size:.72rem}

/* generated art block */
.frame{position:relative;aspect-ratio:4/5;border:1px solid var(--border);border-radius:18px;overflow:hidden;background:var(--surface)}
.frame.wide{aspect-ratio:4/3}
/* an uploaded image is a fixed WxH box (set inline, drag-resizable in edit mode);
   anchored top-left so the right/bottom handles track the cursor while dragging */
.frame.media,.cell.media{aspect-ratio:auto;margin-inline:0}
/* colorful illustration: theme-driven backdrop + a per-theme recolor filter, so
   switching theme live-recolors the whole scene. */
.frame.illus{background:var(--il-bg)}
.hero-illus{filter:var(--il-filter)}
.art{position:absolute;inset:0;width:100%;height:100%}
/* contain: the WHOLE image always fits inside its box (never cropped); resizing
   smaller scales the entire image down proportionally. */
.frame img,.frame video,.cell img,.cell video{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;display:block}
.frame.media .img-edit,.cell.media .img-edit{position:absolute;inset:0}
/* isometric monument art (pure SVG, recolors with the theme) */
.isobg{fill:var(--bg-elev)}
.iso-glow{fill:var(--accent);opacity:.16}
.iso-bloom{fill:var(--accent);opacity:.22}
.iso-shadow{fill:#000;opacity:.20}
.iso-ao{fill:#000;opacity:.26}
.iso-refl{opacity:.16}
.iso-hl{fill:none;stroke-width:1.3;stroke-linecap:round;stroke-linejoin:round;vector-effect:non-scaling-stroke;opacity:.75}
.iso-hlA{stroke:color-mix(in srgb,var(--accent),#fff 55%)}
.iso-hlN{stroke:color-mix(in srgb,var(--fg) 52%,var(--bg))}
.iso-grid{stroke:color-mix(in srgb,var(--accent) 60%,var(--fg));stroke-width:1;opacity:.16;fill:none}
.iso-e{stroke:color-mix(in srgb,var(--fg) 16%,transparent);stroke-width:1;stroke-linejoin:round;vector-effect:non-scaling-stroke}
.fA1{fill:var(--accent)}.fA2{fill:color-mix(in srgb,var(--accent),#000 17%)}.fA3{fill:color-mix(in srgb,var(--accent),#000 35%)}
.fN1{fill:color-mix(in srgb,var(--fg) 22%,var(--bg))}.fN2{fill:color-mix(in srgb,color-mix(in srgb,var(--fg) 22%,var(--bg)),#000 16%)}.fN3{fill:color-mix(in srgb,color-mix(in srgb,var(--fg) 22%,var(--bg)),#000 34%)}
.iso-ring{fill:none;stroke:var(--accent);stroke-width:3;opacity:.8}.iso-ring2{fill:var(--accent);opacity:.06}
.iso-dot{fill:var(--accent)}
.float0,.float1,.float2,.float3,.float4,.float5{animation:isofloat 7s ease-in-out infinite}
.float0,.float2,.float4{animation-duration:8.4s}
.float1{animation-delay:-1.1s}.float2{animation-delay:-2.3s}.float3{animation-delay:-3.4s}.float4{animation-delay:-4.6s}.float5{animation-delay:-5.7s}
@keyframes isofloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-11px)}}

/* about */
.about-grid{display:grid;grid-template-columns:1fr;gap:2.5rem;align-items:center}
@media(min-width:920px){.about-grid{grid-template-columns:.8fr 1.2fr;gap:3.5rem}}
.statement{font-size:clamp(1.5rem,3.6vw,2.4rem);font-family:"Bricolage Grotesque",system-ui,sans-serif;font-weight:500;line-height:1.18;letter-spacing:-.02em}
.about-body{margin-top:2rem;display:grid;gap:1.25rem;border-top:1px solid var(--border);padding-top:1.75rem;color:var(--fg-muted);max-width:60ch}
.stats{margin-top:2.5rem;display:grid;grid-template-columns:repeat(3,1fr);gap:1.25rem;border-top:1px solid var(--border);padding-top:1.75rem}
.stats dt{font-family:"Bricolage Grotesque",system-ui,sans-serif;font-weight:600;font-size:clamp(1.6rem,4vw,2.4rem);letter-spacing:-.02em}
.stats dd{margin:.4rem 0 0;font-size:.85rem;color:var(--fg-muted);line-height:1.3}

/* projects */
.proj{display:grid;grid-template-columns:1fr;gap:1.75rem;align-items:center;margin-top:5rem}
.proj:first-of-type{margin-top:0}
@media(min-width:920px){.proj{grid-template-columns:1fr 1fr;gap:3.5rem}.proj:nth-child(even) .proj-art{order:2}}
.proj-title{font-size:clamp(1.6rem,3.4vw,2.4rem)}
.proj-disc{margin-top:.35rem;color:var(--accent);font-size:.95rem}
.proj-sum{margin-top:1.1rem;color:var(--fg-muted);max-width:46ch}
.proj-foot{margin-top:1.4rem;border-top:1px solid var(--hairline);padding-top:1rem;display:flex;flex-wrap:wrap;gap:.4rem 1.2rem;font-size:.95rem}
.proj-foot .y{color:var(--fg-faint);font-family:"JetBrains Mono",monospace;font-size:.8rem}

/* experience */
.xp{border-top:1px solid var(--border);padding:1.75rem 0;display:grid;grid-template-columns:1fr;gap:.4rem}
@media(min-width:760px){.xp{grid-template-columns:.4fr .6fr;gap:2rem}}
.xp h3{font-size:1.4rem;font-weight:500}
.xp .org{color:var(--accent);font-size:.95rem;margin-top:.2rem}
.xp .per{color:var(--fg-faint);font-family:"JetBrains Mono",monospace;font-size:.78rem;margin-top:.3rem}
.xp p{color:var(--fg-muted)}

/* skills */
.chips{display:flex;flex-wrap:wrap;gap:.6rem;margin-top:2rem}
.chip{border:1px solid var(--border);background:var(--surface);border-radius:999px;padding:.6rem 1.1rem;font-size:.95rem;color:var(--fg)}

/* certifications */
.cert-grid{display:grid;grid-template-columns:1fr;gap:1rem;margin-top:2.5rem}
@media(min-width:760px){.cert-grid{grid-template-columns:repeat(3,1fr)}}
.cert{border:1px solid var(--border);background:color-mix(in srgb,var(--surface) 60%,transparent);border-radius:16px;padding:1.75rem;display:flex;flex-direction:column;min-height:11rem}
.cert .iss{font-family:"JetBrains Mono",monospace;font-size:.68rem;letter-spacing:.16em;text-transform:uppercase;color:var(--accent)}
.cert h3{margin-top:1rem;font-size:1.35rem;font-weight:500}
.cert .note{margin-top:auto;padding-top:1.25rem;color:var(--fg-muted);font-size:.9rem}
.edu{margin-top:1.75rem;border-top:1px solid var(--border);padding-top:1.5rem;display:flex;flex-wrap:wrap;justify-content:space-between;gap:.5rem}
.edu .d{font-family:"Bricolage Grotesque",system-ui,sans-serif;font-size:1.2rem}
.edu .s{color:var(--fg-muted)}

/* contact */
.contact{text-align:center;border-top:1px solid var(--hairline)}
.contact h2{font-size:clamp(2.4rem,7vw,5rem);line-height:1.02;max-width:16ch;margin-inline:auto}
.big-mail{display:inline-flex;align-items:center;gap:.6rem;margin-top:2.5rem;font-family:"Bricolage Grotesque",system-ui,sans-serif;font-size:clamp(1.4rem,4vw,2.4rem);letter-spacing:-.02em;text-decoration:none;color:var(--fg);transition:color .2s}
.big-mail:hover{color:var(--accent)}
.contact .phone{display:block;margin-top:.6rem;color:var(--fg-muted);font-family:"JetBrains Mono",monospace}
.socials{margin-top:2.5rem;display:flex;flex-wrap:wrap;gap:.75rem;justify-content:center}

/* footer */
footer{border-top:1px solid var(--border);padding:2.5rem 0}
.foot{display:flex;flex-wrap:wrap;gap:1rem;align-items:center;justify-content:space-between;text-align:center}
.foot .mono{font-size:.7rem;letter-spacing:.16em;text-transform:uppercase;color:var(--fg-faint)}

/* media + actions */
.gallery{display:flex;flex-wrap:wrap;gap:1rem;margin-top:2.5rem}
.cell{position:relative;width:280px;height:210px;border:1px solid var(--border);border-radius:14px;overflow:hidden;background:var(--surface)}
.cell figcaption{position:absolute;left:0;right:0;bottom:0;padding:.5rem .7rem;font-size:.75rem;color:#fff;background:linear-gradient(to top,rgba(6,6,7,.72),transparent)}
.actions{margin-top:2.5rem;display:flex;flex-wrap:wrap;gap:.7rem;justify-content:center}
.sec-body{margin-top:1.5rem;color:var(--fg-muted);max-width:62ch;display:grid;gap:1rem;font-size:1.05rem}
.clist{margin-top:1rem}
.clist .row{border-top:1px solid var(--border);padding:1.5rem 0;display:grid;grid-template-columns:1fr;gap:.4rem}
@media(min-width:760px){.clist .row{grid-template-columns:.4fr .6fr;gap:2rem}}
.clist h3{font-size:1.3rem;font-weight:500}
.clist p{color:var(--fg-muted)}
.quotes{display:grid;gap:1.25rem;margin-top:2.5rem}
@media(min-width:760px){.quotes{grid-template-columns:repeat(2,1fr)}}
.quote{border:1px solid var(--border);border-radius:16px;padding:1.75rem;background:color-mix(in srgb,var(--surface) 60%,transparent)}
.quote p{font-size:1.1rem;line-height:1.5}
.quote .who{margin-top:1rem;color:var(--accent);font-size:.9rem}

/* inline edit mode - only active when the edit script adds .pf-edit to <body>,
   so it NEVER affects the downloaded file (which has no edit script). */
.img-edit{position:absolute;inset:0;display:block}
.pf-edit [data-edit]{outline:1px dashed transparent;outline-offset:3px;border-radius:3px;cursor:text;transition:outline-color .15s,background-color .15s}
.pf-edit [data-edit]:hover{outline-color:color-mix(in srgb,var(--accent) 55%,transparent);background:color-mix(in srgb,var(--accent) 8%,transparent)}
.pf-edit [data-edit]:focus{outline:2px solid var(--accent);outline-offset:3px;background:color-mix(in srgb,var(--accent) 6%,transparent)}
.pf-edit .img-edit{cursor:pointer}
.pf-edit .img-edit .img-edit-hint{position:absolute;z-index:6;left:12px;bottom:12px;display:inline-flex;align-items:center;gap:.4rem;padding:.45rem .8rem;border-radius:999px;background:color-mix(in srgb,var(--accent) 92%,#000);color:var(--accent-fg);font:600 .8rem/1 "Inter Tight",system-ui,sans-serif;opacity:0;transform:translateY(4px);transition:opacity .15s,transform .15s;pointer-events:none}
.pf-edit .img-edit:hover .img-edit-hint{opacity:1;transform:none}
.pf-edit .img-edit::after{content:"";position:absolute;inset:0;z-index:5;border-radius:inherit;box-shadow:inset 0 0 0 2px transparent;transition:box-shadow .15s;pointer-events:none}
.pf-edit .img-edit:hover::after{box-shadow:inset 0 0 0 2px var(--accent)}
/* image edit affordances: an always-on Replace button + edge/corner resize handles */
.pf-edit .img-edit.is-img{touch-action:none}
.pf-edit .img-btn{position:absolute;z-index:9;left:10px;top:10px;cursor:pointer;border:0;border-radius:999px;padding:.5rem .85rem;font:600 .8rem/1 "Inter Tight",system-ui,sans-serif;background:var(--accent);color:var(--accent-fg);box-shadow:0 3px 10px rgba(0,0,0,.4);opacity:1;transition:transform .12s}
.pf-edit .img-btn:hover{transform:translateY(-1px)}
.pf-edit .img-btn:active{transform:translateY(1px)}
/* resize handles: bold, bright bars with high-contrast grip lines */
.pf-edit .rzh{position:absolute;z-index:8;display:flex;align-items:center;justify-content:center;gap:3px;background:var(--accent);border:3px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,.55),0 0 0 1px rgba(0,0,0,.25);opacity:.6;transition:opacity .15s,transform .12s}
.pf-edit .rzh i{display:block;background:#fff;border-radius:3px}
.pf-edit .rzh-w{right:4px;top:50%;transform:translateY(-50%);width:18px;height:60px;border-radius:9px;cursor:ew-resize;flex-direction:row}
.pf-edit .rzh-w i{width:3px;height:26px}
.pf-edit .rzh-h{bottom:4px;left:50%;transform:translateX(-50%);width:60px;height:18px;border-radius:9px;cursor:ns-resize;flex-direction:column}
.pf-edit .rzh-h i{width:26px;height:3px}
.pf-edit .rzh-c{right:4px;bottom:4px;width:26px;height:26px;border-radius:9px;cursor:nwse-resize}
.pf-edit .rzh-c::before{content:"";position:absolute;inset:auto 6px 6px auto;width:9px;height:9px;border-right:3px solid #fff;border-bottom:3px solid #fff}
.pf-edit .img-edit.is-img:hover .rzh,.pf-edit .img-edit.is-img.rz .rzh{opacity:1}
.pf-edit .rzh:hover{transform:translateY(-50%) scale(1.08)}
.pf-edit .rzh-h:hover{transform:translateX(-50%) scale(1.08)}
.pf-edit .rzh-c:hover{transform:scale(1.08)}
/* touch devices have no hover: keep the handles always visible */
@media(hover:none){.pf-edit .rzh{opacity:1}}

/* reveal */
[data-reveal]{opacity:0;transform:translateY(24px);transition:opacity .7s cubic-bezier(.16,1,.3,1),transform .7s cubic-bezier(.16,1,.3,1)}
[data-reveal].in{opacity:1;transform:none}

@media(prefers-reduced-motion:reduce){
  *{scroll-behavior:auto!important}
  .float0,.float1,.float2,.float3,.float4,.float5{animation:none!important}
  [data-reveal]{opacity:1!important;transform:none!important;transition:none!important}
  .btn,.btn:hover,.btn:active{transform:none!important}
}
`;

const ARROW = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>`;
const ARROW_UR = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7"/><path d="M8 7h9v9"/></svg>`;
const I_MAIL = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>`;
const I_PHONE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 4h4l2 5-3 2a12 12 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>`;
const I_CHAT = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.5 8.5 0 0 1-12.3 7.6L3 21l1.9-5.7A8.5 8.5 0 1 1 21 11.5Z"/></svg>`;

/** Render a single media item as an <img> or <video> element. */
function mediaTag(m: { type: string; src: string; alt?: string }): string {
  if (!m || !has(m.src)) return "";
  if (m.type === "video") {
    return `<video src="${escAttr(m.src)}" controls preload="metadata" playsinline></video>`;
  }
  return `<img src="${escAttr(m.src)}" alt="${escAttr(m.alt || "")}" loading="lazy">`;
}

// ---- section builders -------------------------------------------------------

const SWATCHES: { id: string; title: string; bg: string }[] = [
  { id: "cinematic", title: "Cinematic (dark)", bg: "#0b0b0c" },
  { id: "editorial", title: "Editorial (paper)", bg: "#f3f0e9" },
  { id: "mono", title: "Mono (stark)", bg: "#fafaf8" },
  { id: "royal", title: "Royal (gold)", bg: "#0f0c1d" },
  { id: "pastel", title: "Pastel (soft)", bg: "#f7f2f6" },
];

function navHtml(d: PortfolioData, theme: string): string {
  const links: string[] = [];
  if (d.projects.length) links.push(`<a href="#work">Work</a>`);
  if (d.gallery && d.gallery.length) links.push(`<a href="#gallery">Gallery</a>`);
  if (has(d.about) || has(d.statement)) links.push(`<a href="#about">About</a>`);
  links.push(`<a href="#contact">Contact</a>`);
  const swatches = SWATCHES.map(
    (s) =>
      `<button class="swatch" data-theme-btn="${s.id}" title="${s.title}" aria-pressed="${s.id === theme ? "true" : "false"}" style="background:${s.bg}"></button>`
  ).join("");
  return `<header class="nav"><div class="shell"><nav class="nav-inner">
    <a class="brand" href="#top">${esc(d.name || "Portfolio")}<span>.</span></a>
    <div class="nav-links">${links.join("")}</div>
    <div class="themes" role="group" aria-label="Theme">${swatches}</div>
  </nav></div></header>`;
}

function heroHtml(d: PortfolioData): string {
  const heroIsImg = !!(d.heroImage && has(d.heroImage.src));
  // The hero illustration represents the PERSON'S FIELD (whole CV).
  const heroVisual = heroIsImg
    ? imgWrap(mediaTag(d.heroImage!), "heroImage", true)
    : imgWrap(colorScene(sceneFromField(d)), "heroImage");
  return `<section id="top" class="hero"><div class="shell hero-grid">
    <div>
      <h1${ed("tagline")}>${esc(d.tagline || d.name)}</h1>
      ${has(d.heroSub) ? `<p class="hero-sub"${ed("heroSub")}>${esc(d.heroSub)}</p>` : ""}
      <div class="cta-row">
        ${d.projects.length ? `<a class="btn btn-primary" href="#work">View work ${ARROW}</a>` : ""}
        <a class="btn btn-ghost" href="#contact">Contact</a>
      </div>
    </div>
    <div>
      <div class="frame${heroIsImg ? " media" : " illus"}"${boxStyle(d.heroImage)}>${heroVisual}</div>
      ${has(d.location) ? `<p class="kicker hero-loc"${ed("location")}>${esc(d.location)}</p>` : ""}
    </div>
  </div></section>`;
}

function aboutHtml(d: PortfolioData): string {
  if (!has(d.statement) && !has(d.about) && d.stats.length === 0) return "";
  const paras = d.about
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${esc(p)}</p>`)
    .join("");
  const stats = d.stats.length
    ? `<dl class="stats">${d.stats
        .map(
          (s, i) =>
            `<div><dt${ed(`stats#${i}.value`)}>${esc(s.value)}</dt><dd${ed(`stats#${i}.label`)}>${esc(s.label)}</dd></div>`
        )
        .join("")}</dl>`
    : "";
  const aboutIsImg = !!(d.aboutImage && has(d.aboutImage.src));
  // About shows a scene from the richest project, else the person's field.
  const aboutVisual = aboutIsImg
    ? imgWrap(mediaTag(d.aboutImage!), "aboutImage", true)
    : imgWrap(colorScene(sceneFromProjects(d) || sceneFromField(d)), "aboutImage");
  return `<section id="about"><div class="shell about-grid">
    <div data-reveal><div class="frame${aboutIsImg ? " media" : " illus"}"${boxStyle(d.aboutImage)}>${aboutVisual}</div></div>
    <div data-reveal>
      <p class="kicker" style="margin-bottom:1.25rem">About</p>
      ${has(d.statement) ? `<p class="statement"${ed("statement")}>${esc(d.statement)}</p>` : ""}
      ${paras ? `<div class="about-body"${ed("about", true)}>${paras}</div>` : ""}
      ${stats}
    </div>
  </div></section>`;
}

function projectsHtml(d: PortfolioData): string {
  if (!d.projects.length) return "";
  const rows = d.projects
    .map((p, i) => {
      const firstMedia = p.media && p.media.length ? p.media[0] : null;
      // Each project's own text drives its colorful scene (app -> phone, etc.).
      const visual = firstMedia
        ? imgWrap(mediaTag(firstMedia), `projects#${i}.media#0`, true)
        : imgWrap(colorScene(sceneFromText(`${p.title} ${p.discipline} ${p.summary} ${p.outcome}`)), `projects#${i}.media#0`);
      const extra =
        p.media && p.media.length > 1
          ? `<div class="gallery" style="margin-top:1rem">${p.media
              .slice(1)
              .map((m, j) => `<div class="cell media"${boxStyle(m)}>${imgWrap(mediaTag(m), `projects#${i}.media#${j + 1}`, true)}</div>`)
              .join("")}</div>`
          : "";
      return `<div class="proj" data-reveal>
        <div class="proj-art"><div class="frame wide${firstMedia ? " media" : " illus"}"${boxStyle(firstMedia || undefined)}>${visual}</div>${extra}</div>
        <div>
          <h3 class="proj-title"${ed(`projects#${i}.title`)}>${esc(p.title)}</h3>
          ${has(p.discipline) ? `<p class="proj-disc"${ed(`projects#${i}.discipline`)}>${esc(p.discipline)}</p>` : ""}
          ${has(p.summary) ? `<p class="proj-sum"${ed(`projects#${i}.summary`)}>${esc(p.summary)}</p>` : ""}
          <div class="proj-foot">
            ${has(p.year) ? `<span class="y"${ed(`projects#${i}.year`)}>${esc(p.year)}</span>` : ""}
            ${has(p.outcome) ? `<span${ed(`projects#${i}.outcome`)}>${esc(p.outcome)}</span>` : ""}
          </div>
        </div>
      </div>`;
    })
    .join("");
  return `<section id="work"><div class="shell">
    <div data-reveal style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-end;gap:1.5rem;margin-bottom:3.5rem">
      <h2 class="sec-head">Selected work</h2>
      <p class="lead">A short edit. The projects that show the approach and the result.</p>
    </div>
    ${rows}
  </div></section>`;
}

function experienceHtml(d: PortfolioData): string {
  if (!d.experience.length) return "";
  const rows = d.experience
    .map(
      (x, i) => `<div class="xp" data-reveal>
      <div>
        <h3${ed(`experience#${i}.role`)}>${esc(x.role)}</h3>
        ${has(x.org) ? `<div class="org"${ed(`experience#${i}.org`)}>${esc(x.org)}</div>` : ""}
        ${has(x.period) ? `<div class="per"${ed(`experience#${i}.period`)}>${esc(x.period)}</div>` : ""}
      </div>
      ${has(x.summary) ? `<p${ed(`experience#${i}.summary`)}>${esc(x.summary)}</p>` : "<p></p>"}
    </div>`
    )
    .join("");
  return `<section id="experience"><div class="shell">
    <h2 class="sec-head" data-reveal style="margin-bottom:2.5rem">Experience</h2>
    ${rows}
  </div></section>`;
}

function skillsHtml(d: PortfolioData): string {
  if (!d.skills.length) return "";
  const chips = d.skills
    .map((s, i) => `<span class="chip"${ed(`skills#${i}`)}>${esc(s)}</span>`)
    .join("");
  return `<section id="skills"><div class="shell" data-reveal>
    <h2 class="sec-head" style="margin-bottom:.5rem">Skills &amp; tools</h2>
    <div class="chips">${chips}</div>
  </div></section>`;
}

function certsHtml(d: PortfolioData): string {
  if (!d.certifications.length && !d.education.length) return "";
  const cards = d.certifications.length
    ? `<div class="cert-grid">${d.certifications
        .map(
          (c, i) => `<div class="cert" data-reveal>
        <span class="iss"${ed(`certifications#${i}.issuer`)}>${esc(c.issuer)}</span>
        <h3${ed(`certifications#${i}.title`)}>${esc(c.title)}</h3>
        ${has(c.note) ? `<p class="note"${ed(`certifications#${i}.note`)}>${esc(c.note)}</p>` : ""}
      </div>`
        )
        .join("")}</div>`
    : "";
  const edu = d.education.length
    ? d.education
        .map(
          (e, i) => `<div class="edu" data-reveal>
        <span class="d"${ed(`education#${i}.degree`)}>${esc(e.degree)}</span>
        <span class="s">${esc([e.school, e.period].filter(has).join(" - "))}</span>
      </div>`
        )
        .join("")
    : "";
  return `<section id="credentials"><div class="shell">
    <h2 class="sec-head" data-reveal>Certified, on the record.</h2>
    ${cards}
    ${edu}
  </div></section>`;
}

function galleryHtml(d: PortfolioData): string {
  if (!d.gallery || !d.gallery.length) return "";
  const cells = d.gallery
    .map(
      (m, i) =>
        `<figure class="cell media" data-reveal${boxStyle(m)}>${imgWrap(mediaTag(m), `gallery#${i}`, true)}${has(m.alt) ? `<figcaption${ed(`gallery#${i}.alt`)}>${esc(m.alt)}</figcaption>` : ""}</figure>`
    )
    .join("");
  return `<section id="gallery"><div class="shell">
    <h2 class="sec-head" data-reveal>Work</h2>
    <div class="gallery">${cells}</div>
  </div></section>`;
}

function paragraphs(s: string): string {
  return s
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${esc(p)}</p>`)
    .join("");
}

// Flexible, AI-authored sections so the portfolio can take any shape requested.
function customSectionsHtml(d: PortfolioData): string {
  if (!d.sections || !d.sections.length) return "";
  return d.sections
    .map((s, idx) => {
      const items = s.items || [];
      if (!has(s.title) && !has(s.body) && !items.length) return "";
      const body = has(s.body)
        ? `<div class="sec-body" data-reveal${ed(`sections#${idx}.body`, true)}>${paragraphs(s.body)}</div>`
        : "";
      let inner = "";
      if (s.layout === "cards") {
        inner = items.length
          ? `<div class="cert-grid">${items
              .map(
                (it, j) =>
                  `<div class="cert" data-reveal>${has(it.heading) ? `<h3${ed(`sections#${idx}.items#${j}.heading`)}>${esc(it.heading)}</h3>` : ""}${has(it.detail) ? `<p class="note"${ed(`sections#${idx}.items#${j}.detail`)}>${esc(it.detail)}</p>` : ""}</div>`
              )
              .join("")}</div>`
          : "";
      } else if (s.layout === "quote") {
        inner = items.length
          ? `<div class="quotes">${items
              .map(
                (it, j) =>
                  `<figure class="quote" data-reveal><p${ed(`sections#${idx}.items#${j}.detail`)}>${esc(it.detail)}</p>${has(it.heading) ? `<figcaption class="who"${ed(`sections#${idx}.items#${j}.heading`)}>${esc(it.heading)}</figcaption>` : ""}</figure>`
              )
              .join("")}</div>`
          : "";
      } else if (s.layout === "list") {
        inner = items.length
          ? `<div class="clist">${items
              .map(
                (it, j) =>
                  `<div class="row" data-reveal><h3${ed(`sections#${idx}.items#${j}.heading`)}>${esc(it.heading)}</h3><p${ed(`sections#${idx}.items#${j}.detail`)}>${esc(it.detail)}</p></div>`
              )
              .join("")}</div>`
          : "";
      } else {
        inner = items.length
          ? `<div class="sec-body" data-reveal>${items
              .map(
                (it, j) =>
                  `<p${ed(`sections#${idx}.items#${j}.detail`)}>${has(it.heading) ? `<strong>${esc(it.heading)}:</strong> ` : ""}${esc(it.detail)}</p>`
              )
              .join("")}</div>`
          : "";
      }
      return `<section id="sec-${idx}"><div class="shell"><h2 class="sec-head" data-reveal${ed(`sections#${idx}.title`)}>${esc(s.title)}</h2>${body}${inner}</div></section>`;
    })
    .join("");
}

function contactHtml(d: PortfolioData): string {
  const actions: string[] = [];
  if (has(d.whatsapp)) {
    const num = d.whatsapp.replace(/[^\d]/g, "");
    actions.push(
      `<a class="btn btn-primary" href="https://wa.me/${escAttr(num)}" target="_blank" rel="noopener noreferrer">${I_CHAT} Message on WhatsApp</a>`
    );
  }
  if (has(d.email)) {
    actions.push(
      `<a class="btn btn-ghost" href="mailto:${escAttr(d.email)}">${I_MAIL} Email me</a>`
    );
  }
  if (has(d.phone)) {
    actions.push(
      `<a class="btn btn-ghost" href="tel:${escAttr(d.phone.replace(/\s+/g, ""))}">${I_PHONE} Call</a>`
    );
  }
  for (const s of d.socials) {
    if (!has(s.href)) continue;
    actions.push(
      `<a class="btn btn-ghost" href="${escAttr(s.href)}" target="_blank" rel="noopener noreferrer">${esc(s.label)} ${ARROW_UR}</a>`
    );
  }
  const actionsHtml = actions.length
    ? `<div class="actions" data-reveal>${actions.join("")}</div>`
    : "";

  return `<section id="contact" class="contact"><div class="shell">
    ${has(d.availability) ? `<p class="kicker" data-reveal style="margin-bottom:1.5rem"${ed("availability")}>${esc(d.availability)}</p>` : ""}
    <h2 data-reveal>Let&#39;s make something worth keeping.</h2>
    ${
      has(d.email)
        ? `<a class="big-mail" data-reveal href="mailto:${escAttr(d.email)}">${esc(d.email)} ${ARROW_UR}</a>`
        : ""
    }
    ${has(d.phone) ? `<a class="phone" data-reveal href="tel:${escAttr(d.phone.replace(/\s+/g, ""))}">${esc(d.phone)}</a>` : ""}
    ${actionsHtml}
  </div></section>`;
}

function footerHtml(d: PortfolioData): string {
  return `<footer><div class="shell foot">
    <span class="brand"><span${ed("name")}>${esc(d.name || "Portfolio")}</span><span>.</span></span>
    ${has(d.role) ? `<span style="color:var(--fg-muted);font-size:.95rem"${ed("role")}>${esc(d.role)}</span>` : ""}
    <span class="mono">&copy; ${esc(String(new Date().getFullYear()))}${has(d.location) ? " " + esc(d.location) : ""}</span>
  </div></footer>`;
}

const FONTS_LINK = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700&family=Inter+Tight:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">`;

const HEAD_SCRIPT = `(function(){try{var t=localStorage.getItem('pf-theme');if(t)document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;

const BODY_SCRIPT = `(function(){
var root=document.documentElement;
function set(t){root.setAttribute('data-theme',t);try{localStorage.setItem('pf-theme',t)}catch(e){}
var bs=document.querySelectorAll('[data-theme-btn]');for(var i=0;i<bs.length;i++){bs[i].setAttribute('aria-pressed',bs[i].getAttribute('data-theme-btn')===t?'true':'false');}}
var cur=root.getAttribute('data-theme')||'cinematic';set(cur);
document.addEventListener('click',function(e){var b=e.target.closest?e.target.closest('[data-theme-btn]'):null;if(b)set(b.getAttribute('data-theme-btn'));});
// In-page nav: scroll to the section in JS so it works inside the preview's
// srcdoc iframe too (where a bare '#id' href would otherwise resolve against the
// parent URL and navigate away). Applies to the nav AND the hero buttons.
document.addEventListener('click',function(e){
var a=e.target.closest?e.target.closest('a[href^="#"]'):null;if(!a)return;
var id=a.getAttribute('href').slice(1);if(!id)return;
var t=document.getElementById(id);if(!t)return;
e.preventDefault();t.scrollIntoView({behavior:'smooth',block:'start'});
});
var els=document.querySelectorAll('[data-reveal]');
var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if(!reduce&&'IntersectionObserver' in window){var io=new IntersectionObserver(function(es){es.forEach(function(en){if(en.isIntersecting){en.target.classList.add('in');io.unobserve(en.target);}});},{threshold:.12,rootMargin:'0px 0px -8% 0px'});els.forEach(function(el){io.observe(el);});}
else{els.forEach(function(el){el.classList.add('in');});}
})();`;

// Only injected for the builder's live preview (never the download). Turns
// [data-edit] elements into inline-editable fields and [data-img] visuals into
// click-to-replace targets, posting every change up to the builder for autosave.
const EDIT_SCRIPT = `(function(){
var P=window.parent;function send(m){try{P.postMessage(m,'*')}catch(e){}}
document.body.classList.add('pf-edit');
var eds=document.querySelectorAll('[data-edit]');
for(var i=0;i<eds.length;i++){(function(el){
var ml=el.getAttribute('data-ml')==='1';
el.setAttribute('contenteditable','true');el.setAttribute('spellcheck','false');
function emit(){send({type:'pf-edit',path:el.getAttribute('data-edit'),value:(ml?el.innerText:el.textContent).replace(/\\u00a0/g,' ').replace(/\\n{3,}/g,'\\n\\n').trim()});}
el.addEventListener('keydown',function(e){if(e.key==='Enter'&&!ml){e.preventDefault();el.blur();}});
el.addEventListener('input',emit);el.addEventListener('blur',emit);
})(eds[i]);}
document.addEventListener('click',function(e){
var rep=e.target.closest?e.target.closest('[data-replace]'):null;
if(rep){e.preventDefault();e.stopPropagation();send({type:'pf-img',path:rep.getAttribute('data-img')});return;}
if(e.target.closest&&e.target.closest('[data-rz]'))return; // a resize handle: not a replace
var im=e.target.closest?e.target.closest('[data-img]'):null;
if(im){e.preventDefault();e.stopPropagation();send({type:'pf-img',path:im.getAttribute('data-img')});return;}
// all links work in the preview: '#' anchors scroll, email/WhatsApp/call/socials open.
},true);
// drag a handle to resize the image box: right=width, bottom=height, corner=both.
var MINW=200,MINH=200,MAXW=900,MAXH=700;
var RZ=null,rzDir='',rzX=0,rzY=0,rzW=0,rzH=0,rzCurW=0,rzCurH=0,rzPath='',rzBlock=null,rzEdit=null,rzraf=0;
function clamp(v,lo,hi){return v<lo?lo:(v>hi?hi:v);}
document.addEventListener('pointerdown',function(e){
var h=e.target.closest?e.target.closest('[data-rz]'):null;if(!h)return;
rzBlock=h.closest('.frame,.cell');if(!rzBlock)return;
e.preventDefault();e.stopPropagation();
rzDir=h.getAttribute('data-rz');rzPath=h.getAttribute('data-img');
rzEdit=rzBlock.querySelector('.img-edit');
var r=rzBlock.getBoundingClientRect();rzW=rzCurW=r.width;rzH=rzCurH=r.height;rzX=e.clientX;rzY=e.clientY;
RZ=h;rzEdit&&rzEdit.classList.add('rz');
try{h.setPointerCapture(e.pointerId)}catch(_){}
},true);
document.addEventListener('pointermove',function(e){
if(!RZ)return;
if(rzDir.indexOf('w')>-1)rzCurW=clamp(rzW+(e.clientX-rzX),MINW,MAXW);
if(rzDir.indexOf('h')>-1)rzCurH=clamp(rzH+(e.clientY-rzY),MINH,MAXH);
if(rzraf)return; // smooth: one DOM write per animation frame
rzraf=requestAnimationFrame(function(){rzraf=0;rzBlock.style.width=Math.round(rzCurW)+'px';rzBlock.style.height=Math.round(rzCurH)+'px';});
});
document.addEventListener('pointerup',function(){if(!RZ)return;RZ=null;if(rzraf){cancelAnimationFrame(rzraf);rzraf=0;}
rzBlock.style.width=Math.round(rzCurW)+'px';rzBlock.style.height=Math.round(rzCurH)+'px';
rzEdit&&rzEdit.classList.remove('rz');send({type:'pf-img-size',path:rzPath,w:Math.round(rzCurW),h:Math.round(rzCurH)});});
send({type:'pf-ready'});
})();`;

/**
 * Build the complete standalone portfolio document for `data`.
 * The result is a full `<!doctype html>` string, ready to preview or download.
 */
export function generatePortfolioHtml(
  data: PortfolioData,
  opts: { theme?: string; editable?: boolean } = {}
): string {
  const theme = opts.theme || "cinematic";
  // Turn on the inline-edit markers for the duration of this render only, so the
  // builder's preview is editable but the downloaded file never is.
  EDITABLE = !!opts.editable;
  const title = [data.name, data.role].filter(has).join(" - ") || "Portfolio";
  const desc = data.heroSub || data.tagline || "";
  const body = [
    navHtml(data, theme),
    `<main>`,
    heroHtml(data),
    aboutHtml(data),
    projectsHtml(data),
    galleryHtml(data),
    experienceHtml(data),
    skillsHtml(data),
    certsHtml(data),
    customSectionsHtml(data),
    contactHtml(data),
    `</main>`,
    footerHtml(data),
  ].join("\n");
  const editScript = EDITABLE ? `\n<script>${EDIT_SCRIPT}</script>` : "";
  EDITABLE = false;

  return `<!doctype html>
<html lang="en" data-theme="${esc(theme)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${escAttr(desc)}">
<meta property="og:title" content="${escAttr(title)}">
<meta property="og:description" content="${escAttr(desc)}">
<meta property="og:type" content="website">
<script>${HEAD_SCRIPT}</script>
${FONTS_LINK}
<style>${STYLES}</style>
</head>
<body>
${body}
<script>${BODY_SCRIPT}</script>${editScript}
</body>
</html>`;
}

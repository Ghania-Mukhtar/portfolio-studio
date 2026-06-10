"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";
import { Button } from "@/components/ui/Button";
import { ArrowRight, ArrowUpRight } from "@/components/ui/icons";
import { THEMES, type ThemeId, DEFAULT_THEME } from "@/lib/themes";
import {
  emptyPortfolio,
  examplePortfolio,
  findGaps,
  type PortfolioData,
} from "@/lib/portfolio-schema";
import { generatePortfolioHtml } from "@/lib/generate";
import {
  Field,
  MediaList,
  Repeat,
  SkillsEditor,
  TextArea,
  TextInput,
} from "@/components/builder/Fields";

const STORAGE_KEY = "pf-builder-v2";

type Step =
  | "home"
  | "upload"
  | "theme"
  | "idea"
  | "working"
  | "gaps"
  | "result"
  | "editor"
  | "changes"
  | "error";

function blankProject() {
  return { title: "", discipline: "", year: "", summary: "", outcome: "", media: [] };
}

/** Media (data URLs) is large and AI-irrelevant: drop it for storage / AI calls. */
function stripMedia(d: PortfolioData): PortfolioData {
  return {
    ...d,
    gallery: [],
    heroImage: undefined,
    aboutImage: undefined,
    projects: d.projects.map((p) => ({ ...p, media: [] })),
  };
}

/** Reattach the user's media after an AI revision (the AI never sees it). */
function mergeMedia(next: PortfolioData, prev: PortfolioData): PortfolioData {
  return {
    ...next,
    gallery: prev.gallery,
    heroImage: prev.heroImage,
    aboutImage: prev.aboutImage,
    projects: next.projects.map((p, i) => {
      const match = prev.projects.find(
        (op) => op.title.trim().toLowerCase() === p.title.trim().toLowerCase()
      );
      return { ...p, media: (match?.media ?? prev.projects[i]?.media) || [] };
    }),
  };
}

/** Set a value at a `path` like "projects#0.title" / "skills#2" / "heroImage". */
function setPath(data: PortfolioData, path: string, value: unknown): PortfolioData {
  const next = structuredClone(data);
  const parts = path.split(".");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cur: any = next;
  for (let i = 0; i < parts.length; i++) {
    const [key, idxStr] = parts[i].split("#");
    const last = i === parts.length - 1;
    if (idxStr !== undefined) {
      const idx = +idxStr;
      if (!Array.isArray(cur[key])) cur[key] = [];
      if (last) cur[key][idx] = value;
      else cur = cur[key][idx] ?? (cur[key][idx] = {});
    } else if (last) {
      cur[key] = value;
    } else {
      cur = cur[key] ?? (cur[key] = {});
    }
  }
  return next;
}

function fileToDataUrl(f: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(f);
  });
}

function imageSize(src: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve({ w: im.naturalWidth, h: im.naturalHeight });
    im.onerror = () => reject(new Error("decode"));
    im.src = src;
  });
}

// A starting box from the image's natural size, clamped to 200-900 x 200-700,
// without upscaling normal images (so a small upload is not blown up).
function fitBox(nw: number, nh: number): { w: number; h: number } {
  const MINW = 200, MINH = 200, MAXW = 900, MAXH = 700;
  if (!nw || !nh) return { w: 480, h: 360 };
  let s = Math.min(MAXW / nw, MAXH / nh, 1);
  let w = nw * s, h = nh * s;
  s = Math.max(1, MINW / w, MINH / h); // grow tiny images up to the minimum
  w *= s; h *= s;
  s = Math.min(1, MAXW / w, MAXH / h); // re-cap if the minimum pushed past max
  w *= s; h *= s;
  return { w: Math.round(w), h: Math.round(h) };
}

function slug(s: string): string {
  return (
    s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") ||
    "portfolio"
  );
}

function downloadHtml(html: string, name: string) {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function Builder() {
  const [step, setStep] = useState<Step>("home");
  const [data, setData] = useState<PortfolioData>(emptyPortfolio);
  const [theme, setTheme] = useState<ThemeId>(DEFAULT_THEME);

  const [file, setFile] = useState<File | null>(null);
  const [cvText, setCvText] = useState("");
  const [idea, setIdea] = useState("");
  const [changeText, setChangeText] = useState("");

  const [error, setError] = useState<{ msg: string; noKey: boolean; back: Step }>({
    msg: "",
    noKey: false,
    back: "idea",
  });
  const loaded = useRef(false);

  // Restore a previous session.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { data: PortfolioData; theme: ThemeId };
        if (saved.data) {
          setData({ ...emptyPortfolio(), ...saved.data });
          if (saved.theme) setTheme(saved.theme);
        }
      }
    } catch {
      /* ignore */
    }
    loaded.current = true;
  }, []);

  // Persist data + theme. Media (data URLs) can blow the storage quota, so on
  // failure we retry without media (it always remains in the live session and
  // in the download).
  useEffect(() => {
    if (!loaded.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ data, theme }));
    } catch {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ data: stripMedia(data), theme })
        );
      } catch {
        /* give up quietly */
      }
    }
  }, [data, theme]);

  // The download is the plain (non-editable) file.
  const html = useMemo(
    () => generatePortfolioHtml(data, { theme }),
    [data, theme]
  );
  const hasPortfolio = !!data.name || data.projects.length > 0;

  // The result preview is the EDITABLE document. It is only regenerated when we
  // deliberately reload it (docKey bumps on entering result / theme change /
  // image replace) - never on a text edit, so the caret and scroll are kept.
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const imgInputRef = useRef<HTMLInputElement>(null);
  const pendingImgPath = useRef<string | null>(null);
  const [docKey, setDocKey] = useState(0);
  const editableHtml = useMemo(
    () => generatePortfolioHtml(data, { theme, editable: true }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [docKey, theme]
  );

  // Go to the result and regenerate the (decoupled) preview once, so it reflects
  // the latest data immediately. Batched with the data change, so it is correct
  // on the first click. Inline edits while on result do NOT call this (no reload).
  const showResult = () => {
    setDocKey((k) => k + 1);
    setStep("result");
  };

  // Receive inline edits / image-replace requests from the preview iframe.
  useEffect(() => {
    if (step !== "result") return;
    function onMsg(e: MessageEvent) {
      if (e.source !== iframeRef.current?.contentWindow) return;
      const m = e.data;
      if (!m || typeof m !== "object") return;
      if (m.type === "pf-edit" && typeof m.path === "string") {
        setData((d) => setPath(d, m.path, m.value)); // autosaved; no reload
      } else if (m.type === "pf-img" && typeof m.path === "string") {
        pendingImgPath.current = m.path;
        imgInputRef.current?.click();
      } else if (m.type === "pf-img-size" && typeof m.path === "string") {
        setData((d) => setPath(setPath(d, m.path + ".w", m.w), m.path + ".h", m.h)); // autosaved; no reload
      }
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [step]);

  async function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    const path = pendingImgPath.current;
    e.target.value = ""; // allow re-picking the same file later
    if (!f || !path) return;
    try {
      const src = await fileToDataUrl(f);
      // Default box = the image's natural size, clamped to the min/max. The user
      // then drags the edge/corner handles to resize. Width and height in px.
      const dim = await imageSize(src).catch(() => ({ w: 480, h: 360 }));
      const box = fitBox(dim.w, dim.h);
      const item = { type: "image" as const, src, alt: "", w: box.w, h: box.h };
      setData((d) => setPath(d, path, item));
      setDocKey((k) => k + 1); // reload so the new image shows in the preview
    } catch {
      /* ignore a failed read */
    }
  }

  function set<K extends keyof PortfolioData>(key: K, value: PortfolioData[K]) {
    setData((d) => ({ ...d, [key]: value }));
  }

  async function runGenerate() {
    setStep("working");
    try {
      const fd = new FormData();
      if (file) fd.append("file", file);
      if (cvText.trim()) fd.append("cvText", cvText);
      fd.append("idea", idea);
      fd.append("theme", theme);
      const res = await fetch("/api/generate", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw { json, status: res.status };
      setData({ ...emptyPortfolio(), ...json.data });
      if ((json.gaps?.length ?? 0) > 0) setStep("gaps");
      else showResult();
    } catch (e) {
      showError(e, "idea");
    }
  }

  async function runRevise() {
    if (!changeText.trim()) return;
    setStep("working");
    try {
      const res = await fetch("/api/revise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current: stripMedia(data),
          instructions: changeText,
          theme,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw { json, status: res.status };
      setData(mergeMedia({ ...emptyPortfolio(), ...json.data }, data));
      setChangeText("");
      showResult();
    } catch (e) {
      showError(e, "changes");
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function showError(e: any, back: Step) {
    const j = e?.json;
    setError({
      msg: j?.error || e?.message || "Something went wrong. Please try again.",
      noKey: j?.code === "NO_KEY",
      back,
    });
    setStep("error");
  }

  function loadExample() {
    setData(examplePortfolio());
    setTheme("cinematic");
    showResult();
  }
  function startOver() {
    setData(emptyPortfolio());
    setFile(null);
    setCvText("");
    setIdea("");
    setChangeText("");
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setStep("home");
  }

  /* =============================== RESULT =============================== */
  // The result shows ONLY the portfolio, full screen, with floating controls.
  if (step === "result") {
    return (
      <div className="relative h-[100dvh] w-full overflow-hidden bg-bg">
        <iframe
          ref={iframeRef}
          title="Your portfolio"
          srcDoc={editableHtml}
          sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
          className="h-full w-full border-0"
        />
        <input
          ref={imgInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={onPickImage}
        />
        {/* floating: home (top-left) + live-edit hint */}
        <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex items-center justify-between gap-2 p-4">
          <button
            onClick={() => setStep("home")}
            className="pointer-events-auto rounded-full border border-line bg-bg/80 px-4 py-2 text-sm font-medium text-fg backdrop-blur-xl transition-colors hover:border-accent"
          >
            &larr; Home
          </button>
          <span className="pointer-events-none hidden rounded-full border border-line bg-bg/80 px-4 py-2 text-xs text-fg-muted backdrop-blur-xl sm:inline">
            Click any text to edit · click art/images to replace · saved automatically
          </span>
        </div>
        {/* floating: actions (bottom-center) */}
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center p-5">
          <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2 rounded-full border border-line bg-bg/85 p-2 shadow-2xl backdrop-blur-xl">
            <Button onClick={() => downloadHtml(html, slug(data.name))} className="!min-h-0 !py-2.5">
              Download <ArrowUpRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost" onClick={() => setStep("changes")} className="!min-h-0 !py-2.5">
              Make changes (AI)
            </Button>
            <Button variant="ghost" onClick={() => setStep("editor")} className="!min-h-0 !py-2.5">
              Edit &amp; add media
            </Button>
            <Button variant="ghost" onClick={startOver} className="!min-h-0 !py-2.5">
              Start over
            </Button>
          </div>
        </div>
      </div>
    );
  }

  /* ============================== CHROME =============================== */
  const stepIndex: Record<string, number> = { upload: 1, theme: 2, idea: 3, gaps: 4 };

  return (
    <div className="min-h-[100dvh]">
      <header className="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur-xl">
        <div className="shell flex h-[4.75rem] items-center justify-between gap-4">
          <button
            onClick={() => setStep("home")}
            className="font-display text-lg font-semibold tracking-tight text-fg"
          >
            Portfolio Studio<span className="text-accent">.</span>
          </button>
          <div className="flex items-center gap-3">
            {stepIndex[step] && (
              <span className="hidden font-mono text-[11px] uppercase tracking-[0.18em] text-fg-faint sm:inline">
                Step {stepIndex[step]} / 4
              </span>
            )}
            <a
              href="/example"
              className="hidden text-sm text-fg-muted transition-colors hover:text-fg sm:inline"
            >
              See example
            </a>
            <ThemeSwitcher />
          </div>
        </div>
      </header>

      <main className="shell py-10 md:py-16">
        {step === "home" && (
          <Centered>
            <p className="kicker mb-6">AI portfolio builder</p>
            <h1 className="font-display text-[clamp(2.5rem,8vw,5rem)] font-semibold leading-[0.98] tracking-tight text-fg">
              Build a premium portfolio from your CV.
            </h1>
            <p className="mx-auto mt-6 max-w-[46ch] text-lg leading-relaxed text-fg-muted">
              Upload your CV, choose a look, and describe your idea. AI writes and
              designs a luxury portfolio, then you download it as a single file
              that opens anywhere.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Button onClick={() => setStep("upload")}>
                Create my portfolio <ArrowRight className="h-4 w-4" />
              </Button>
              <Button variant="ghost" onClick={loadExample}>
                Load example
              </Button>
              {hasPortfolio && (
                <Button variant="ghost" onClick={() => showResult()}>
                  View my portfolio
                </Button>
              )}
            </div>
          </Centered>
        )}

        {step === "upload" && (
          <Panel
            title="Add your CV"
            subtitle="Browse a file from your computer (PDF, Word, or text), or paste the text. AI reads it for you."
          >
            <FileDrop file={file} onFile={setFile} />
            <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-[0.18em] text-fg-faint">
              <span className="h-px flex-1 bg-line" /> or paste
              <span className="h-px flex-1 bg-line" />
            </div>
            <textarea
              className="h-40 w-full resize-y rounded-2xl border border-line bg-surface p-4 text-base leading-relaxed text-fg outline-none transition-colors placeholder:text-fg-faint focus:border-accent"
              placeholder="Paste your CV text here (optional if you uploaded a file)..."
              value={cvText}
              onChange={(e) => setCvText(e.target.value)}
            />
            <NavRow
              onBack={() => setStep("home")}
              next={
                <Button
                  onClick={() => setStep("theme")}
                  disabled={!file && !cvText.trim()}
                >
                  Next <ArrowRight className="h-4 w-4" />
                </Button>
              }
            />
          </Panel>
        )}

        {step === "theme" && (
          <Panel
            title="Choose a theme"
            subtitle="The look of your portfolio. You can switch it any time, even after downloading."
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {THEMES.map((t) => {
                const active = t.id === theme;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTheme(t.id)}
                    aria-pressed={active}
                    className={`rounded-2xl border p-4 text-left transition-all ${
                      active
                        ? "border-accent ring-2 ring-accent"
                        : "border-line hover:border-fg-muted"
                    }`}
                  >
                    <span className="flex gap-1.5">
                      {t.swatch.map((c, i) => (
                        <span
                          key={i}
                          className="h-7 w-7 rounded-full ring-1 ring-line"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </span>
                    <span className="mt-3 block font-display text-base font-semibold tracking-tight text-fg">
                      {t.label}
                    </span>
                    <span className="block font-mono text-[10px] uppercase tracking-[0.18em] text-fg-faint">
                      {t.note}
                    </span>
                  </button>
                );
              })}
            </div>
            <NavRow
              onBack={() => setStep("upload")}
              next={
                <Button onClick={() => setStep("idea")}>
                  Next <ArrowRight className="h-4 w-4" />
                </Button>
              }
            />
          </Panel>
        )}

        {step === "idea" && (
          <Panel
            title="Describe your idea"
            subtitle="How do you want your portfolio to feel, and what should it highlight? Write a little or a lot. (Optional, but it makes the result more 'you'.)"
          >
            <textarea
              className="h-44 w-full resize-y rounded-2xl border border-line bg-surface p-4 text-base leading-relaxed text-fg outline-none transition-colors placeholder:text-fg-faint focus:border-accent"
              placeholder={
                "e.g. Clean and confident, focused on my AI projects. Make the tone friendly but professional, and lead with VitalWatch."
              }
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
            />
            <NavRow
              onBack={() => setStep("theme")}
              next={
                <Button onClick={runGenerate}>
                  Create portfolio <ArrowRight className="h-4 w-4" />
                </Button>
              }
            />
          </Panel>
        )}

        {step === "working" && (
          <Centered>
            <Spinner />
            <h2 className="mt-8 font-display text-2xl font-semibold tracking-tight text-fg md:text-3xl">
              Reading your CV and writing your portfolio...
            </h2>
            <p className="mt-3 text-fg-muted">This usually takes a few seconds.</p>
          </Centered>
        )}

        {step === "gaps" && (
          <Panel
            title="A few details to finish"
            subtitle="AI filled in everything it found. Add anything still missing, then see your portfolio."
          >
            <div className="space-y-4">
              <TextInput label="Name" value={data.name} onChange={(v) => set("name", v)} />
              <TextInput label="Role / title" value={data.role} onChange={(v) => set("role", v)} />
              <TextInput label="Hero tagline" value={data.tagline} onChange={(v) => set("tagline", v)} />
              <TextInput label="Email" value={data.email} onChange={(v) => set("email", v)} />
              <Repeat
                label="Projects"
                addLabel="project"
                items={data.projects}
                blank={blankProject}
                onChange={(v) => set("projects", v)}
                render={(p, update) => (
                  <>
                    <TextInput label="Title" value={p.title} onChange={(v) => update({ title: v })} />
                    <TextArea label="Summary" rows={2} value={p.summary} onChange={(v) => update({ summary: v })} />
                  </>
                )}
              />
            </div>
            <NavRow
              onBack={() => setStep("idea")}
              next={
                <Button onClick={() => showResult()}>
                  Show my portfolio <ArrowRight className="h-4 w-4" />
                </Button>
              }
            />
          </Panel>
        )}

        {step === "changes" && (
          <Panel
            title="What would you like to change?"
            subtitle="Describe it in plain words. AI will rewrite the portfolio and keep everything else."
          >
            <textarea
              className="h-40 w-full resize-y rounded-2xl border border-line bg-surface p-4 text-base leading-relaxed text-fg outline-none transition-colors placeholder:text-fg-faint focus:border-accent"
              placeholder={
                "e.g. Make the tagline bolder, shorten the about section, add my email, and put the Expense project first."
              }
              value={changeText}
              onChange={(e) => setChangeText(e.target.value)}
            />

            <div className="mt-6">
              <p className="mb-2 text-sm font-medium text-fg">Theme</p>
              <div className="flex flex-wrap gap-2">
                {THEMES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTheme(t.id)}
                    aria-pressed={t.id === theme}
                    title={t.label}
                    className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                      t.id === theme ? "border-accent text-fg" : "border-line text-fg-muted"
                    }`}
                  >
                    <span className="flex gap-1">
                      {t.swatch.map((c, i) => (
                        <span key={i} className="h-3 w-3 rounded-full ring-1 ring-line" style={{ backgroundColor: c }} />
                      ))}
                    </span>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <NavRow
              onBack={() => showResult()}
              next={
                <Button onClick={runRevise} disabled={!changeText.trim()}>
                  Recreate portfolio <ArrowRight className="h-4 w-4" />
                </Button>
              }
            />
          </Panel>
        )}

        {step === "editor" && (
          <div className="mx-auto w-full max-w-2xl">
            <h1 className="font-display text-3xl font-semibold tracking-tight text-fg md:text-5xl">
              Edit your portfolio
            </h1>
            <p className="mt-3 max-w-[52ch] text-base leading-relaxed text-fg-muted md:text-lg">
              Change any detail, add your work (images and videos), and manage
              extra sections. Updates show when you go back to the portfolio.
            </p>

            <div className="mt-8 space-y-10">
              <EditGroup title="Basics">
                <TextInput label="Name" value={data.name} onChange={(v) => set("name", v)} />
                <TextInput label="Role / title" value={data.role} onChange={(v) => set("role", v)} />
                <TextInput label="Hero tagline" value={data.tagline} onChange={(v) => set("tagline", v)} />
                <TextArea label="Hero sub-line" rows={2} value={data.heroSub} onChange={(v) => set("heroSub", v)} />
                <TextInput label="Location" value={data.location} onChange={(v) => set("location", v)} />
              </EditGroup>

              <EditGroup title="About">
                <TextInput label="Statement" value={data.statement} onChange={(v) => set("statement", v)} />
                <TextArea label="About paragraphs" rows={6} hint="blank line between paragraphs" value={data.about} onChange={(v) => set("about", v)} />
              </EditGroup>

              <EditGroup title="Skills">
                <SkillsEditor value={data.skills} onChange={(v) => set("skills", v)} />
              </EditGroup>

              <EditGroup title="Projects (with images / video)">
                <Repeat
                  label="Projects"
                  addLabel="project"
                  items={data.projects}
                  blank={blankProject}
                  onChange={(v) => set("projects", v)}
                  render={(p, update) => (
                    <>
                      <TextInput label="Title" value={p.title} onChange={(v) => update({ title: v })} />
                      <div className="grid grid-cols-2 gap-3">
                        <TextInput label="Type / tag" value={p.discipline} onChange={(v) => update({ discipline: v })} />
                        <TextInput label="Year" value={p.year} onChange={(v) => update({ year: v })} />
                      </div>
                      <TextArea label="Summary" rows={3} value={p.summary} onChange={(v) => update({ summary: v })} />
                      <TextInput label="Outcome" value={p.outcome} onChange={(v) => update({ outcome: v })} />
                      <MediaList
                        label="Images / video for this project"
                        items={p.media ?? []}
                        onChange={(v) => update({ media: v })}
                      />
                    </>
                  )}
                />
              </EditGroup>

              <EditGroup title="Work gallery">
                <MediaList
                  label="Gallery images & videos"
                  hint="great for designers, photographers, video creators"
                  items={data.gallery}
                  onChange={(v) => set("gallery", v)}
                />
              </EditGroup>

              <EditGroup title="Contact & actions">
                <TextInput label="Email" value={data.email} onChange={(v) => set("email", v)} hint="becomes an Email me button" />
                <TextInput label="Phone" value={data.phone} onChange={(v) => set("phone", v)} hint="becomes a Call button" />
                <TextInput label="WhatsApp number" value={data.whatsapp} onChange={(v) => set("whatsapp", v)} hint="becomes a Message on WhatsApp button" />
                <TextInput label="Availability line" value={data.availability} onChange={(v) => set("availability", v)} />
                <Repeat
                  label="Links"
                  addLabel="link"
                  items={data.socials}
                  blank={() => ({ label: "", href: "" })}
                  onChange={(v) => set("socials", v)}
                  render={(s, update) => (
                    <div className="grid grid-cols-2 gap-3">
                      <TextInput label="Label" value={s.label} onChange={(v) => update({ label: v })} placeholder="Instagram" />
                      <TextInput label="URL" value={s.href} onChange={(v) => update({ href: v })} placeholder="https://..." />
                    </div>
                  )}
                />
              </EditGroup>

              <EditGroup title="Experience">
                <Repeat
                  label="Experience"
                  addLabel="role"
                  items={data.experience}
                  blank={() => ({ role: "", org: "", period: "", summary: "" })}
                  onChange={(v) => set("experience", v)}
                  render={(x, update) => (
                    <>
                      <TextInput label="Role" value={x.role} onChange={(v) => update({ role: v })} />
                      <div className="grid grid-cols-2 gap-3">
                        <TextInput label="Organization" value={x.org} onChange={(v) => update({ org: v })} />
                        <TextInput label="Period" value={x.period} onChange={(v) => update({ period: v })} />
                      </div>
                      <TextArea label="What you did" rows={2} value={x.summary} onChange={(v) => update({ summary: v })} />
                    </>
                  )}
                />
              </EditGroup>

              <EditGroup title="Certifications">
                <Repeat
                  label="Certifications"
                  addLabel="certificate"
                  items={data.certifications}
                  blank={() => ({ title: "", issuer: "", note: "" })}
                  onChange={(v) => set("certifications", v)}
                  render={(c, update) => (
                    <>
                      <TextInput label="Title" value={c.title} onChange={(v) => update({ title: v })} />
                      <TextInput label="Issuer" value={c.issuer} onChange={(v) => update({ issuer: v })} />
                      <TextInput label="Note" value={c.note} onChange={(v) => update({ note: v })} />
                    </>
                  )}
                />
              </EditGroup>

              <EditGroup title="Education">
                <Repeat
                  label="Education"
                  addLabel="entry"
                  items={data.education}
                  blank={() => ({ degree: "", school: "", period: "" })}
                  onChange={(v) => set("education", v)}
                  render={(e, update) => (
                    <>
                      <TextInput label="Degree" value={e.degree} onChange={(v) => update({ degree: v })} />
                      <div className="grid grid-cols-2 gap-3">
                        <TextInput label="School" value={e.school} onChange={(v) => update({ school: v })} />
                        <TextInput label="Period" value={e.period} onChange={(v) => update({ period: v })} />
                      </div>
                    </>
                  )}
                />
              </EditGroup>

              <EditGroup title="Stats">
                <Repeat
                  label="Stats"
                  addLabel="stat"
                  items={data.stats}
                  blank={() => ({ value: "", label: "" })}
                  onChange={(v) => set("stats", v)}
                  render={(s, update) => (
                    <div className="grid grid-cols-2 gap-3">
                      <TextInput label="Value" value={s.value} onChange={(v) => update({ value: v })} />
                      <TextInput label="Label" value={s.label} onChange={(v) => update({ label: v })} />
                    </div>
                  )}
                />
              </EditGroup>

              <EditGroup title="Custom sections (anything else)">
                <Repeat
                  label="Sections"
                  addLabel="section"
                  items={data.sections}
                  blank={() => ({ title: "", layout: "list" as const, body: "", items: [] })}
                  onChange={(v) => set("sections", v)}
                  render={(s, update) => (
                    <>
                      <TextInput label="Title" value={s.title} onChange={(v) => update({ title: v })} placeholder="Services" />
                      <Field label="Layout">
                        <select
                          value={s.layout}
                          onChange={(e) =>
                            update({ layout: e.target.value as typeof s.layout })
                          }
                          className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-base text-fg outline-none focus:border-accent"
                        >
                          <option value="list">List (heading + detail rows)</option>
                          <option value="cards">Cards (grid)</option>
                          <option value="quote">Quotes / testimonials</option>
                          <option value="text">Text (paragraphs)</option>
                        </select>
                      </Field>
                      <TextArea label="Intro (optional)" rows={2} value={s.body} onChange={(v) => update({ body: v })} />
                      <Repeat
                        label="Items"
                        addLabel="item"
                        items={s.items}
                        blank={() => ({ heading: "", detail: "" })}
                        onChange={(v) => update({ items: v })}
                        render={(it, u) => (
                          <>
                            <TextInput label="Heading" value={it.heading} onChange={(v) => u({ heading: v })} />
                            <TextArea label="Detail" rows={2} value={it.detail} onChange={(v) => u({ detail: v })} />
                          </>
                        )}
                      />
                    </>
                  )}
                />
              </EditGroup>
            </div>

            <NavRow
              onBack={() => showResult()}
              next={
                <Button onClick={() => showResult()}>
                  Done <ArrowRight className="h-4 w-4" />
                </Button>
              }
            />
          </div>
        )}

        {step === "error" && (
          <Panel title="That did not work" subtitle="">
            <div className="rounded-2xl border border-accent/40 bg-accent/10 p-5 text-fg">
              <p>{error.msg}</p>
              {error.noKey && (
                <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm text-fg-muted">
                  <li>Copy <code>.env.local.example</code> to <code>.env.local</code>.</li>
                  <li>Put your Anthropic API key in <code>ANTHROPIC_API_KEY</code>.</li>
                  <li>Restart the dev server, then try again.</li>
                </ol>
              )}
            </div>
            <NavRow
              onBack={() => setStep(error.back)}
              next={
                hasPortfolio ? (
                  <Button onClick={() => showResult()}>Back to portfolio</Button>
                ) : (
                  <Button onClick={() => setStep(error.back)}>Try again</Button>
                )
              }
            />
          </Panel>
        )}
      </main>
    </div>
  );
}

/* ----------------------------- small pieces ----------------------------- */

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[calc(100dvh-12rem)] flex-col items-center justify-center text-center">
      <div className="w-full max-w-3xl">{children}</div>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-fg md:text-5xl">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-3 max-w-[52ch] text-base leading-relaxed text-fg-muted md:text-lg">
          {subtitle}
        </p>
      )}
      <div className="mt-8">{children}</div>
    </div>
  );
}

function NavRow({ onBack, next }: { onBack: () => void; next: React.ReactNode }) {
  return (
    <div className="mt-8 flex items-center justify-between gap-3 border-t border-line pt-6">
      <Button variant="ghost" onClick={onBack}>
        &larr; Back
      </Button>
      {next}
    </div>
  );
}

function EditGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-4 border-b border-line pb-2 font-display text-xl font-semibold tracking-tight text-fg">
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Spinner() {
  return (
    <div
      className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-line border-t-accent"
      role="status"
      aria-label="Working"
    />
  );
}

function FileDrop({
  file,
  onFile,
}: {
  file: File | null;
  onFile: (f: File | null) => void;
}) {
  const [over, setOver] = useState(false);
  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const f = e.dataTransfer.files?.[0];
        if (f) onFile(f);
      }}
      className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
        over ? "border-accent bg-accent/5" : "border-line bg-surface/40 hover:border-fg-muted"
      }`}
    >
      <input
        type="file"
        accept=".pdf,.doc,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
        className="sr-only"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />
      <span className="font-display text-lg font-semibold text-fg">
        {file ? file.name : "Browse or drop your CV"}
      </span>
      <span className="mt-1 text-sm text-fg-faint">
        {file ? "Click to choose a different file" : "PDF, Word (.docx), or text"}
      </span>
      {file && (
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.preventDefault();
            onFile(null);
          }}
          className="mt-3 rounded-full border border-line px-3 py-1 text-xs text-fg-muted hover:text-fg"
        >
          Remove
        </span>
      )}
    </label>
  );
}
